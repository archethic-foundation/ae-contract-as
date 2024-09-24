import * as JSONRPC from "../jsonrpc";
import { Hex } from "../utils"

export enum HashFunction {
    SHA256,
    SHA512,
    SHA3_256,
    SHA3_512,
    // BLAKE2B,
    // KECCAK256 ,
}

@json
export class Signature {
    r: Hex
    s: Hex
    v: u8
}

@json
class hmacWithStorageNonceReq {
    data: Hex
    hashFunction: HashFunction
}

export function hmacWithStorageNonce(data: Hex, hashFunction: HashFunction): Hex {
    return JSONRPC
        .request<hmacWithStorageNonceReq, Hex>("hmacWithStorageNonce", { data, hashFunction })
        .unwrap()
}

export function signWithRecovery(data: Hex): Signature {
    return JSONRPC
        .request<Hex, Signature>("signWithRecovery", data)
        .unwrap()

}

export function decryptWithStorageNonce(cipher: Hex): Hex {
    return JSONRPC
        .request<Hex, Hex>("decryptWithStorageNonce", cipher)
        .unwrap()
}

