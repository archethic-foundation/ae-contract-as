import * as JSONRPC from "../jsonrpc";
import { Address, Result } from "../utils";

@json
class Params<Args> {
    address: Address
    functionName: string
    args: Args | null
}

export function callFunction<Args, R>(address: Address, functionName: string, args: Args | null = null): Result<R> {
    return JSONRPC.request<Params<Args>, R>("callFunction", { address, functionName, args })
}
