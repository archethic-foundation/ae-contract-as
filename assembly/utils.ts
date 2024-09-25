export { u128Safe as BigInt } from "as-bignum/assembly";

@json
export class Nullable<T> {
  value: T
}

@json
export class Result<T> {
  ok: Nullable<T> | null
  error: string | null

  constructor(okValue: Nullable<T> | null, errValue: string | null) {
    if (okValue != null) this.ok = okValue
    this.error = errValue
  }

  static wrapOk<T>(value: T): Result<T> {
    return new Result<T>({ value }, null)
  }

  static wrapError<T>(message: string): Result<T> {
    return new Result<T>(null, message)
  }

  unwrap(): T {
    const okValue = this.ok
    const errValue = this.error
    if (okValue != null) { return okValue.value }
    if (errValue != null) throw new Error(`unwrap failed: ${errValue}`)
    throw new Error("unwrap failed: invalid Result")
  }

  unwrapWithDefault(def: T): T {
    const okValue = this.ok
    if (okValue != null) { return okValue.value }
    return def;
  }

  map<A>(fun: (r: T) => A): Result<A> {
    const okValue = this.ok
    const errValue = this.error
    if (okValue != null) {
      return Result.wrapOk(fun(okValue.value))
    }
    if (errValue != null) {
      return Result.wrapError<A>(errValue)
    }
    throw new Error("map failed: invalid Result")
  }
}

@json
export class Hex {
  hex: string;

  constructor(hex: string) {
    this.hex = hex.toUpperCase();
  }

  static compare(a: Hex, b: Hex): boolean {
    return a.hex == b.hex
  }

  toString(): string {
    return this.hex;
  }
}

export class Address extends Hex { }
export class PublicKey extends Hex { }