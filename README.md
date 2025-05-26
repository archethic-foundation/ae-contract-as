# ae-contract-as

AssemblyScript SDK designed for developing smart contracts on the Archethic Public Blockchain. 

## Features

- **Peace of mind**: Abstract WASM in/out complexity by providing a simple API and decorators
- **Integrated hooks**: Reserved functions (onInit, onUpgrade) to leverage blockchain hooks
- **Typed language**: Built on AssemblyScript, a TypeScript-like language
- **Build-in specification**: Integrate a manifest generation to export types and ABI
- **Tooling**: SDK provides CLI & Test framework to start in minutes smart contract development

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- npm
- Basic knowledge of TypeScript or AssemblyScript.

### Installation

Install the SDK via npm:

```bash
npm install @archethicjs/ae-contract-as
```

### Usage

1. Initialize a new AssemblyScript project:

```bash
npm create @archethicjs/ae-contract-as my-smart-contract
cd my-smart-contract
npm install
```

2. Build
```bash
npm run build 
```

3. Test
```
npm run test
```

4. Deploy
```shell
npx aewasm build --mode release && npx aewasm deploy -s <SEED> -e [ENDPOINT]
```

## Development

The main components of the project are:

- **assembly**: Core AssemblyScript SDK code (I/O management, std library, shared data structures)
- **transform**: Custom transformers for AssemblyScript compiler for decorators and manifest generation
- **bin**: Contains code for the `aewasm` CLI

## Contribution

Thank you for considering to help out with the source code. We welcome contributions from anyone and are grateful for even the smallest of improvement.

Please to follow this workflow:

1. Fork it!
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Add some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create new Pull Request

## Licence
AGPL
