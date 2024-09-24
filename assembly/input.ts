import { Transaction } from "./transaction";
import { JSON } from "json-as";
import { input_size, load_u8 } from "./env";
import { Balance } from "./lib/chain";

interface Object { }
export interface NoArgs extends Object { }

@json
export class Context<T, X> {
  state!: T;
  @omitnull()
  transaction!: Transaction | null;
  @omitnull()
  arguments!: X | null;
  balance: Balance = { uco: 0, token: [] }
}

export function getContext<T extends Object, X extends Object>(): Context<
  T,
  X
> {
  const size = input_size() as i32;
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = load_u8(i);
  }

  const stringInput: string = String.UTF8.decode(data.buffer);
  return JSON.parse<Context<T, X>>(stringInput);
}
