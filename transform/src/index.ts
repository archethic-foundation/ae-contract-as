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
  parameters: Map<string, typeValue> = new Map<string, classType>()
  returnTypes: Map<string, typeValue> = new Map<string, classType>()
  stateType?: Map<string, typeValue>

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
            if (argType.typeArguments && argType.typeArguments.length > 0) {
              if (utils.getName(argType).includes("Array")) {
                const args = argType.typeArguments
                  .map(x => getClassTypes(this.classes, x as NamedTypeNode) || utils.getName(x))
      
                this.parameters.set(name, args)
              }
              if (utils.getName(argType).includes("Map")) {
                const key = argType.typeArguments[0]
                const val = argType.typeArguments[1]
                const nestedMap = new Map<string, typeValue>()
                if (key && val) {
                  nestedMap.set(utils.getName(key), getClassTypes(this.classes, val as NamedTypeNode) || utils.getName(val))
                }
                this.parameters.set(name, nestedMap)
              }
            }
            else {
              const members = getClassTypes(this.classes, argType)
              this.parameters.set(name, members || utils.getName(argType))
            }
          }
        }

        const returnType = node.signature.returnType as NamedTypeNode
        if (returnType.typeArguments && returnType.typeArguments.length > 0) {
          if (utils.getName(returnType).includes("Array")) {
            const args = returnType.typeArguments
              .map(x => getClassTypes(this.classes, x as NamedTypeNode) || utils.getName(x))
            this.returnTypes.set(name, args)
          }
          if (utils.getName(returnType).includes("Map")) {
            const key = returnType.typeArguments[0]
            const val = returnType.typeArguments[1]
            const nestedMap = new Map<string, typeValue>()
            if (key && val) {
              nestedMap.set(utils.getName(key), getClassTypes(this.classes, val as NamedTypeNode) || utils.getName(val))
            }
            this.returnTypes.set(name, nestedMap)
          }
        }
        else {
          const customType = getClassTypes(this.classes, returnType)
          this.returnTypes.set(name, customType || utils.getName(returnType))
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
          body = `
            export function ${name}(): void {
              ${utils.toString(inner)}
              const context = getContext<${inputType}>();
              ${functionCallWithContext}
            }
          `;
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

    const sources = parser.sources
      .filter(s => s.internalPath.includes("assembly/"))
      .filter(s => s.sourceKind == SourceKind.User || s.sourceKind == SourceKind.UserEntry)
      .sort((a, b) => a.internalPath.includes("assembly/index") ? 1 : -1)

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
      input?: Record<string, any> | string | (Record<string, any> | string)[],
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

      manifest.abi.functions[name] = {
        type: "action",
        triggerType: triggerType,
        triggerArgument: triggerArgument,
        input: paramValues ? getType(paramValues) : undefined
      }
    })

    this.publicFunctions.forEach((fn: string) => {
      const paramValues = this.parameters.get(fn)
      const returnType = this.returnTypes.get(fn)

      manifest.abi.functions[fn] = {
        type: "publicFunction",
        input: paramValues ? getType(paramValues) : undefined,
        output: returnType ? getType(returnType) : "null"
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

function getType(type: typeValue): Record<string, any> | (Record<string, any> | string)[] | string {
  if (type instanceof Array) {
    return arrayToObject(type) 
  }
  else if (type instanceof Map) {
    return mapToObject(type) 
  }
  return type
} 

function arrayToObject(type: (string | classType)[]) : (Record<string, any> | string)[] {
  return type.map(x => {
    if (x instanceof Map) {
      return mapToObject(x)
    }
    return x
  })
}

function mapToObject(type: classType): Record<string, any> {
  let obj: Record<string, any> = {}
  for (let [key, value] of type) {
    if (value instanceof Array) {
        obj[key as string] = value.map(loopOverMembers)
    }
    else if (typeof value === 'object') {
        obj[key] = loopOverMembers(value);
    }
    else {
        obj[key] = value;
    }
  }
  return obj
}

function loopOverMembers(type: classType | string): Record<string, any> | string {
  if (typeof(type) == "object") {
    return mapToObject(type)
  }
  return type
}

type typeValue = string | classType | (string | classType)[]
type classType = Map<string, typeValue>

function getClassTypes(classes: ClassDeclaration[], argType: NamedTypeNode): classType | null {
  const argClass = findArgType(classes, argType)
  if (argClass) {
    let members = new Map<string, typeValue>()
    argClass.members.forEach((member) => {
      const m = (member as FieldDeclaration).type
      if (m != null) {
        const namedNode = m as NamedTypeNode
        const typeName = utils.getTypeName(namedNode.name)

        if(typeName == "Array" && namedNode.typeArguments != null) {
          const arrayTypes = namedNode.typeArguments
            .map(x => {
              const classType = getClassTypes(classes, x as NamedTypeNode)
              return classType || utils.getName(x as NamedTypeNode)
            })
            .filter(x => x != null)

          members.set(utils.getName(member), arrayTypes)
        }
        else if (typeName == "Map" && namedNode.typeArguments != null && namedNode.typeArguments.length == 2) {
          const key = namedNode.typeArguments[0]
          const val = namedNode.typeArguments[1]
          const nestedMap = new Map<string, typeValue>()
          if (key && val) {
            nestedMap.set(utils.getName(key), getClassTypes(classes, val as NamedTypeNode) || utils.getName(val))
          }
          members.set(utils.getName(member), nestedMap)
        }
        else {
          if (findArgType(classes, namedNode)) {
            const nestedType = getClassTypes(classes, namedNode)
            if (nestedType) {
              members.set(utils.getName(member), nestedType)
            }
          } else {
            members.set(utils.getName(member), typeName)
          }
        }
      }
    })
    return members
  }
  return null
}

function findArgType(classes: ClassDeclaration[], argType: NamedTypeNode): ClassDeclaration | undefined {
  return classes.find(x => {
    if (argType.isNullable) {
      return utils.getName(argType).includes(utils.getName(x))
    }
    return utils.getName(x) == utils.getName(argType)
  })
}