import { JSON } from "json-as";
import { jsonrpc, alloc, store_u8 } from "./env";
import { readCombinedPointer } from "./memory"
import { Result } from "./utils"

@json
class JSONRPCRequest<P> {
    method: string
    params: P
}

export function request<P, R>(method: string, params: P): Result<R> {
    const jsonRequest: JSONRPCRequest<P> = { method, params }
    const serializedInput = Uint8Array.wrap(String.UTF8.encode(JSON.stringify(jsonRequest)))
    const size = serializedInput.byteLength
    const offset = alloc(size);
    for (let i = 0; i < size; i++) {
        store_u8(offset + i, serializedInput[i]);
    }

    const pointer = jsonrpc(offset, size)

    const serializedOutput = readCombinedPointer(pointer)
    return JSON.parse<Result<R>>(String.UTF8.decode(serializedOutput.buffer));
}