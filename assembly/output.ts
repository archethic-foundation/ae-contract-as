import { Transaction, TransactionBuilder } from "./transaction";
import { log as log_env, store_u8, alloc, set_output, set_error } from "./env";
import { JSON } from "json-as";

@json
export class TransactionResult<T> {
  state: T | null = null;
  transaction: Transaction | null = null;

  setTransaction(tx: TransactionBuilder): TransactionResult<T> {
    this.transaction = tx.toTransaction();
    return this;
  }

  setState(newState: T): TransactionResult<T> {
    this.state = newState;
    return this;
  }
}

export function sendResult<T>(result: T): void {
  const output = JSON.stringify<T>(result);
  const bin = Uint8Array.wrap(String.UTF8.encode(output));
  const size = bin.byteLength;
  const offset = alloc(size);
  for (let i = 0; i < bin.byteLength; i++) {
    store_u8(offset + i, bin[i]);
  }
  set_output(offset, size);
}

export function sendError(errMsg: string): void {
  const bin = Uint8Array.wrap(String.UTF8.encode(errMsg));
  const size = bin.byteLength;
  const offset = alloc(size);
  for (let i = 0; i < bin.byteLength; i++) {
    store_u8(offset + i, bin[i]);
  }
  set_error(offset, size);
}


export function log<T>(message: T): void {
  logString(JSON.stringify<T>(message))
}

function logString(message: string): void {
  logBinary(Uint8Array.wrap(String.UTF8.encode(message)))
}

function logBinary(bin: Uint8Array): void {
  const size = bin.byteLength;
  const offset = alloc(size);
  for (let i = 0; i < bin.byteLength; i++) {
    store_u8(offset + i, bin[i]);
  }
  log_env(offset, size);
}
