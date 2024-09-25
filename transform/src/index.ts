import {
  CommonFlags,
  FunctionDeclaration,
  NamedTypeNode,
  Parser,
  Source,
  Tokenizer,
  ImportStatement,
  ClassDeclaration,
  ParameterNode,
  FieldDeclaration,
  PropertyAccessExpression,
  LiteralExpression,
  StringLiteralExpression,
  LiteralKind,
  Expression,
  SourceKind,

} from "assemblyscript/dist/assemblyscript.js";

import { TransformVisitor, utils } from "visitor-as/dist/index.js";

import { writeFileSync, mkdirSync, existsSync } from "fs"

type Trigger = {
  name: string;
  type: string;
  argument?: string;
}

class AeTransformer extends TransformVisitor {
  parser: Parser;
  triggers: Trigger[] = []
  publicFunctions: string[] = []
  sb: string[] = [];
  classes: ClassDeclaration[] = [];
  parameters: Map<string, classTypes> = new Map<string, classTypes>()
  returnTypes: Map<string, string | classTypes> = new Map<string, string | classTypes>()
  stateType?: classTypes;

  constructor(parser: Parser) {
    super()
    this.parser = parser;
  }

  visitSource(node: Source): Source {
    node = super.visitSource(node);

    // skip this node if it already imports JSON
    for (const statement of node.statements) {
      if (!(statement instanceof ImportStatement)) continue;
      if (!statement.declarations) continue;

      for (const declaration of statement.declarations) {
        if (declaration.name.text == "getContext" || declaration.name.text == "sendResult") {
          return node;
        }
      }
    }

    const tokenizer = new Tokenizer(
      new Source(/* SourceKind.User */ 0, node.range.source.internalPath, `import { getContext, sendResult } from '@archethicjs/ae-contract-as/assembly`),
    );

    const statement = this.parser.parseTopLevelStatement(tokenizer);
    if (statement != null) {
      node.statements.unshift(statement);
    }

    return node;
  }

  visitClassDeclaration(node: ClassDeclaration, isDefault?: boolean): ClassDeclaration {
    const jsonDecorator = Expression.createDecorator(Expression.createIdentifierExpression("json", node.range), null, node.range)
    if (node.decorators == null) {
      node.decorators = [jsonDecorator]
    }
    else {
      node.decorators?.push(jsonDecorator)
    }
    this.classes.push(node)
    return node
  }

  visitFunctionDeclaration(node: FunctionDeclaration): FunctionDeclaration {
    if (node.range.source.internalPath === "assembly/index" && node.flags === CommonFlags.Export) {
      const name = utils.getName(node);

      if (utils.hasDecorator(node, "action") || utils.hasDecorator(node, "publicFunction")) {
        const parameters = node.signature.parameters
        const param = parameters[0] as ParameterNode
        const type = param.type as NamedTypeNode
        const contextArguments = type.typeArguments

        if (contextArguments != null) {
          if (contextArguments[0] != null) {
            const argType = contextArguments[0] as NamedTypeNode
            const members = getClassTypes(this.classes, argType)
            if (!this.stateType && members) {
              this.stateType = members
            }
          }
          if (contextArguments[1] != null) {
            const argType = contextArguments[1] as NamedTypeNode
            const members = getClassTypes(this.classes, argType)
            if (members) {
              this.parameters.set(name, members)
            }
          }
        }

        const returnType = node.signature.returnType as NamedTypeNode
        const customType = getClassTypes(this.classes, returnType)
        if (customType) {
          this.returnTypes.set(name, customType)
        }
        else {
          this.returnTypes.set(name, utils.getName(returnType))
        }
      }

      if (utils.hasDecorator(node, "action")) {
        const args = utils.getDecorator(node, "action").args
        if (args !== null) {
          const trigger = args[0] as PropertyAccessExpression
          const triggerType = trigger.property.text
          if (args.length > 1) {
            const triggerArg = args[1] as LiteralExpression
            if (triggerArg.literalKind == LiteralKind.String) {
              const triggerStringArg = (triggerArg as StringLiteralExpression).value
              this.triggers.push({ name: name, type: triggerType.toLowerCase(), argument: triggerStringArg })
            }
          }
          else {
            this.triggers.push({ name: name, type: triggerType.toLowerCase() })
          }
        }
        else {
          throw new Error("action's decorator requires the trigger type - " + name)
        }
      }

      if (utils.hasDecorator(node, "publicFunction")) {
        this.publicFunctions.push(name)
      }

      const returnTypeNode = node.signature.returnType as NamedTypeNode;
      const returnType = returnTypeNode ? utils.toString(returnTypeNode) : null;
      const inputTypeNode = node.signature.parameters.at(0)?.type;
      const inputType = inputTypeNode ? utils.toString(inputTypeNode) : null;

      const inner = utils.cloneNode(node);
      inner.name.text = "inner";
      inner.decorators = null;
      inner.flags = 0;

      let body = ""

      const functionCallWithContext = returnType == "void" ? "inner(context)" : `const result: ${returnType} = inner(context) \n sendResult(result)`
      const functionCallWithoutContext = returnType == "void" ? "inner()" : `const result: ${returnType} = inner() \n sendResult(result)`

      if (inputType != null) {
        // const match = inputType.match("(?<=<)[^>]+(?=>)")
        // if (match != null) {
          body = `
            export function ${name}(): void {
              ${utils.toString(inner)}
              const context = getContext<${inputType}>();
              ${functionCallWithContext}
            }
          `;
        // }
      }
      else {
        body = `
            export function ${name}(): void {
              ${utils.toString(inner)}
              ${functionCallWithoutContext}
            }
          `;
      }

      const tokenizer = new Tokenizer(
        new Source(
          /* SourceKind.User */ 0,
          node.range.source.internalPath,
          body,
        ))

      return this.parser.parseTopLevelStatement(
        tokenizer,
      ) as FunctionDeclaration
    }

    return node
  }
}

export default class Transformer extends AeTransformer {
  afterParse(parser: Parser): void {
    this.parser = parser

    const sources = parser.sources;
    for (const source of sources) {
      if (source.sourceKind == SourceKind.User || source.sourceKind == SourceKind.UserEntry) {
        this.visit(source);
      }
    }

    interface actionABI extends functionABI {
      triggerType: string,
      triggerArgument?: string
    }

    type functionABI = {
      type: string;
      input?: Record<string, any>,
      output?: any
    }

    const manifest: {
      abi: {
        functions: Record<string, functionABI | actionABI>,
        state: Record<string, any>
      }
    } = {
      abi: { state: {}, functions: {} }
    }

    this.triggers.forEach(({ name: name, type: triggerType, argument: triggerArgument }) => {
      const paramValues = this.parameters.get(name)
      if (paramValues) {
        manifest.abi.functions[name] = {
          type: "action",
          triggerType: triggerType,
          triggerArgument: triggerArgument,
          input: mapToObject(paramValues)
        }
      }
    })

    this.publicFunctions.forEach((fn: string) => {
      const paramValues = this.parameters.get(fn)
      const returnType = this.returnTypes.get(fn)
      manifest.abi.functions[fn] = {
        type: "publicFunction",
        input: paramValues ? mapToObject(paramValues) : undefined,
        output: returnType ? typeof(returnType) == "string" ? returnType : mapToObject(returnType) : "null"
      }
    })

    if (this.stateType) {
      manifest.abi.state = mapToObject(this.stateType)
    }

    if (!existsSync("./dist")) {
      mkdirSync("./dist")
    }
    writeFileSync("./dist/manifest.json", JSON.stringify(manifest, null, 2))
  }
}

function mapToObject(map: Map<string, any>): Record<string, any> {
  let obj: Record<string, any> = {}
  for (let [key, value] of map) {
    if (typeof value === 'object') {
      obj[key] = mapToObject(value)
    }
    else {
      obj[key] = value
    }
  }

  return obj
}

// class SpecTransformer extends TransformVisitor {
//   typedParameters: Map<string, classTypes> = new Map<string, classTypes>()

//   constructor(parameters: Map<string, classTypes>) {
//     super()
//     this.typedParameters = parameters
//   }


//   visitFunctionDeclaration(node: FunctionDeclaration, isDefault?: boolean): FunctionDeclaration {
//     if (utils.getName(node) == "spec") {
//       const funcBody = node.body
//       if (funcBody != null) {
//         const body = funcBody as BlockStatement
//         const resultVarStatement = body.statements[1] as VariableStatement
//         const resultDeclaration = resultVarStatement.declarations[0] as VariableDeclaration

//         let specCallStatement: Statement;
//         if (this.typedParameters.size > 0) {

//           const functionABIEXpressions: Expression[] = []
//           for (let [key, value] of this.typedParameters) {
//             functionABIEXpressions.push(Expression.createObjectLiteralExpression(
//               [Expression.createIdentifierExpression("name", node.range), Expression.createIdentifierExpression("input", node.range)],
//               [Expression.createStringLiteralExpression(key, node.range), Expression.createArrayLiteralExpression(typeParametersToExpression(value, node), node.range)],
//               node.range
//             ))
//           }

//           const newExp = Expression.createCallExpression(
//             Expression.createPropertyAccessExpression(
//               resultDeclaration.initializer as CallExpression,
//               Expression.createIdentifierExpression("setABI", node.range),
//               node.range
//             ),
//             null,
//             [Expression.createObjectLiteralExpression([
//               Expression.createIdentifierExpression("functions", node.range)
//             ], [
//               Expression.createArrayLiteralExpression(functionABIEXpressions, node.range)
//             ], node.range)],
//             node.range
//           )

//           let newStatement = utils.cloneNode(resultVarStatement)
//           let varDec = (newStatement.declarations[0] as VariableDeclaration)
//           varDec.initializer = newExp
//           newStatement.declarations = [varDec]

//           specCallStatement = newStatement
//         }
//         else {
//           specCallStatement = body.statements[1] as Statement
//         }

//         const statements: Statement[] = [
//           body.statements[0] as Statement,
//           // body.statements[1] as Statement,

//           specCallStatement,

//           // body.statements[1] as Statement,
//           body.statements[2] as Statement
//         ]

//         node.body = Expression.createBlockStatement(statements, node.range)

//         // const result = exp ? utils.toString(exp) : "")
//         // console.log(utils.toString(exp))
//         // const exp = body.statements[0] as ExpressionStatement
//         // const fnExp = exp.expression as FunctionExpression
//         // const fn = fnExp.declaration as FunctionDeclaration
//         // const fnBlock = fn.body as BlockStatement
//         // const returnStatement = fnBlock.statements[fnBlock.statements.length - 1] as ReturnStatement
//         // let call = returnStatement.value as CallExpression

//         // call = Expression.createCallExpression(
//         //   Expression.createPropertyAccessExpression(
//         //     utils.cloneNode(call),
//         //     Expression.createIdentifierExpression("addPublicFunction", node.range),
//         //     node.range
//         //   ),
//         //   null,
//         //   [
//         //     Expression.createStringLiteralExpression("abc", node.range)
//         //   ],
//         //   node.range
//         // )
//       }
//     }
//     return node
//   }
// }

type classTypes = Map<string, string | classTypes>

function getClassTypes(classes: ClassDeclaration[], argType: NamedTypeNode): classTypes | null {
  const argClass = classes.find(x => utils.getName(x) == utils.getName(argType))
  if (argClass) {
    let members: classTypes = new Map<string, classTypes>()
    argClass.members.forEach((member) => {
      const m = (member as FieldDeclaration).type
      if (m != null) {
        const namedNode = m as NamedTypeNode
        const typeName = utils.getTypeName(namedNode.name)
        if (classes.find(x => utils.getName(x) == typeName)) {
          const nestedType = getClassTypes(classes, namedNode)
          if (nestedType) {
            members.set(utils.getName(member), nestedType)
          }
        } else {
          members.set(utils.getName(member), typeName)
        }
      }
      return members
    })
  }
  return null
}

// function typeParametersToExpression(parameters: classTypes, node: Node): ObjectLiteralExpression[] {
//   const expressions = []
//   for (let [key, value] of parameters) {
//     if (typeof value == 'string') {
//       expressions.push(Expression.createObjectLiteralExpression(
//         [Expression.createIdentifierExpression("name", node.range), Expression.createIdentifierExpression("value", node.range)],
//         [Expression.createStringLiteralExpression(key, node.range), Expression.createStringLiteralExpression(value, node.range)],
//         node.range
//       ))
//     }
//     if (typeof value == "object") {
//       expressions.push(Expression.createObjectLiteralExpression(
//         [Expression.createIdentifierExpression("name", node.range), Expression.createIdentifierExpression("value", node.range), Expression.createIdentifierExpression("items", node.range)],
//         [Expression.createStringLiteralExpression(key, node.range), Expression.createStringLiteralExpression("object", node.range), Expression.createArrayLiteralExpression(typeParametersToExpression(value, node), node.range)],
//         node.range
//       ))

//     }
//   }
//   return expressions
// }

// function generateSpecFunction(parameters, source) {
// new SpecTransformer(this.parameters).visit(source)

// const specBody = `export function spec(): void {
//   const spec = new Spec()
//   ${this.triggers.map(({ name: name, triggerType: triggerType, triggerArg: triggerArg}) => {
//     if (triggerArg !== undefined) {
//       return `.addTrigger("${name}", TriggerType.${triggerType}, "${triggerArg}")`
//     }
//     return `.addTrigger("${name}", TriggerType.${triggerType})`
//   }).join("\n")}
//   ${this.publicFunctions.map((fn) => {
//     return `.addPublicFunction("${fn}")`
//   }).join("\n")}

//   sendResult(spec)
// }`

// const tokenizer = new Tokenizer(
//   new Source(
//     /* SourceKind.User */ 0,
//     source.internalPath,
//     specBody,
//   ))
//   const specFn = this.parser.parseTopLevelStatement(
//     tokenizer,
//   ) as FunctionDeclaration

//   source.statements.push(specFn)
// }