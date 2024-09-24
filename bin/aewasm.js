#!/usr/bin/env node

import { Command } from "commander";
import asc from "assemblyscript/asc";
import fs from "fs";
import zlib from "zlib"
import path, { dirname } from "path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { version } = require('../package.json')

import Archethic, { Contract, Utils } from "@archethicjs/sdk"

const cli = new Command();

cli.version(version)

cli.command("build")
  .option("-m --mode [BUILD MODE]", "Build mode", "debug")
  .action(buildCmd);

cli.command("deploy")
  .option("-s --seed <SEED>", "Archethic's wallet seed")
  .option("-e --endpoint [ENDPOINT]", "Archethic's wallet seed", "ws://localhost:12345")
  .action(deployCmd)

cli.parse();


async function buildCmd(options) {
  let compilerOptions = [
    // Command line options
    "assembly/index.ts",
    "--outFile",
    "dist/contract.wasm",
  ]
  if (options.mode == "debug") {
    compilerOptions = compilerOptions.concat([
      "--textFile",
      "dist/contract.wat",
      "--debug",
    ])
  }
  if (options.mode == "release") {
    compilerOptions = compilerOptions.concat([
      "-Osize",
      "--runtime",
      "stub"
    ])
  }

  console.log(`Building contract for ${options.mode} mode...`)

  const { error, stdout, stderr, stats } = await asc.main(compilerOptions, {})

  if (error) {
    console.log("Compilation failed: " + error.message);
    console.log(stderr.toString());
    process.exit(-1)
  } else {
    console.log(stdout.toString());
  }
}



async function deployCmd({ seed, endpoint }) {
  await buildCmd({ mode: "release" })

  const archethic = await connectArchethic(endpoint)

  const manifest = fs.readFileSync("./dist/manifest.json", { encoding: 'utf-8' })
  const compressedBytecode = await compress(fs.readFileSync("./dist/contract.wasm"))

  const tx = await Contract.newContractTransaction(archethic, JSON.stringify({
    manifest: JSON.parse(manifest),
    bytecode: compressedBytecode.toString('hex')
  }), seed)

  tx
    .originSign(Utils.originPrivateKey)
    .on("error", (context, error) => {
      console.log(error)
      process.exit(1)
    })
    .on("sent", () => console.log("Deploying contract..."))
    .on("requiredConfirmation", () => {
      console.log(`Contract deployed at: ${Utils.uint8ArrayToHex(tx.address)}`)
      process.exit(0)
    })
    .send();
}

async function connectArchethic(endpoint) {
  const archethic = new Archethic(endpoint == "ws://localhost:12345" ? undefined : endpoint);
  await archethic.connect()

  console.log("Connecting to Archethic's network...")

  if (archethic.endpoint.isRpcAvailable) {
    archethic.rpcWallet.onconnectionstatechange(async (state) => {
      let status = ""
      switch (state) {
        case "WalletRPCConnection_connecting":
          status = "Connecting via wallet";
          break;
        case "WalletRPCConnection_closed":
          status = "Connection closed";
          break;
        case "WalletRPCConnection_open":
          const { endpointUrl } = await archethic.rpcWallet.getEndpoint();
          walletAccount = await archethic.rpcWallet.getCurrentAccount();
          status = `Connected at ${endpointUrl}`
          break;
      }
      console.log(status)
    })
  }

  await archethic.connect();
  if (!archethic.endpoint.isRpcAvailable) {
    console.log(`Connected at ${endpoint}`)
  }
  return archethic
}


async function compress(bytes) {
  return new Promise((resolve, reject) => {
    zlib.deflateRaw(bytes, (err, res) => {
      if (err) {
        return reject(err)
      }
      resolve(res)
    })
  })
}