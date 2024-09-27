import { Transaction } from "./transaction";
import { JSON } from "json-as";
import { input_size, load_u8 } from "./env";
import { Balance } from "./lib/chain";

interface Object {}
export interface NoArgs extends Object {}

@json
export class Context<T> {
  state!: T;
  now!: u64;
  balance: Balance = { uco: 0, token: [] };
}

@json
export class ContextWithTransaction<T> extends Context<T> {
  transaction!: Transaction;
}

@json
export class ContextWithParams<T, X> extends Context<T> {
  arguments!: X;
}

@json
export class ContextWithTransactionAndParams<
  T,
  X
> extends ContextWithTransaction<T> {
  arguments!: X;
}

export function getContext<T>(): T {
  const size = input_size() as i32;
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = load_u8(i);
  }

  const stringInput: string = String.UTF8.decode(data.buffer);
  return JSON.parse<T>(stringInput);
}
