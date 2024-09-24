import * as JSONRPC from "../jsonrpc"
import { Transaction } from "../transaction";
import { Address, PublicKey, Result } from "../utils";

@json
export class TokenBalance {
  tokenAddress!: Address;
  tokenId: u64 = 0;
  amount!: u64;
}

@json
export class Balance {
  uco: u64 = 0;
  token: TokenBalance[] = []
}

/*
 * BALANCES
 */
export function getBalance(address: Address): Balance {
  return JSONRPC
    .request<Address, Balance>("getBalance", address)
    .unwrap()
}

/*
 * ADDRESSES
 */
export function getGenesisAddress(address: Address): Address {
  return JSONRPC
    .request<Address, Address>("getGenesisAddress", address)
    .unwrap()

}

export function getFirstTransactionAddress(address: Address): Address {
  return JSONRPC
    .request<Address, Address>("getFirstTransactionAddress", address)
    .unwrap()
}

export function getBurnAddress(): Address {
  return new Address("00000000000000000000000000000000000000000000000000000000000000000000")
}

export function getLastAddress(address: Address): Address {
  return JSONRPC
    .request<Address, Address>("getLastAddress", address)
    .unwrap()
}

export function getPreviousAddress(previousPublicKey: PublicKey): Address {
  return JSONRPC
    .request<PublicKey, Address>("getPreviousAddress", previousPublicKey)
    .unwrap()
}

/*
 * PUBLIC KEYS
 */
export function getGenesisPublicKey(publicKey: PublicKey): PublicKey {
  return JSONRPC
    .request<PublicKey, PublicKey>("getGenesisPublicKey", publicKey)
    .unwrap()
}

/*
 * TRANSACTIONS
 */

export function getTransaction(address: Address): Result<Transaction> {
  return JSONRPC
    .request<Address, Transaction>("getTransaction", address)
}
export function getLastTransaction(address: Address): Result<Transaction> {
  return JSONRPC
    .request<Address, Transaction>("getLastTransaction", address)
}
