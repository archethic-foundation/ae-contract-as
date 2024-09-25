import { Address, BigInt, Hex, PublicKey } from "./utils";
import { JSON } from "json-as"

export namespace TransactionType {
  export const Contract = "contract";
  export const Transfer = "transfer";
  export const Data = "data";
  export const Token = "token";
}
  
export type TransactionType = string;

@json
class UCOTransfer {
  to!: Address;
  amount!: u64;
}


@json
class TokenTransfer {
  to!: Address;
  amount!: u64;
  tokenAddress!: Address;
  tokenId!: i32;
}

@json
export class TransactionResult {
  type!: TransactionType;
  data!: TransactionData;
}

@json
export class Transaction extends TransactionResult {
  address!: Address;
  previousPublicKey!: PublicKey;
}

@json
export class TransactionData {
  content: string = "";
  code: string | null;
  ledger: Ledger = { uco: { transfers: [] }, token: { transfers: [] } };
  recipients: Recipient[] = []
  ownerships: Ownership[] = []
}

@json
export class Ledger {
  uco: UCOLedger;
  token: TokenLedger;
}

@json
class UCOLedger {
  transfers!: UCOTransfer[];
}

@json
class TokenLedger {
  transfers!: TokenTransfer[];
}

@json
class Recipient {
  address!: Address;
  action: string | null;
  args: JSON.Raw
}

@json
class Ownership {
  secret!: Hex;
  authorizedKeys: Map<PublicKey, Hex> = new Map<PublicKey, Hex>()
}

export class TransactionBuilder {
  type: TransactionType = TransactionType.Contract;
  content: string = "";
  code: string | null;
  ucoTransfers: UCOTransfer[] = [];
  tokenTransfers: TokenTransfer[] = [];
  recipients: Recipient[] = [];
  ownerships: Ownership[] = [];

  setType(type: TransactionType): TransactionBuilder {
    this.type = type;
    return this;
  }

  setContent(content: string): TransactionBuilder {
    this.content = content;
    return this;
  }

  setCode(code: string): TransactionBuilder {
    this.code = code;
    return this;
  }

  addUCOTransfer(to: Address, amount: BigInt): TransactionBuilder {
    this.ucoTransfers.push({ to: to, amount: amount.toU64() });
    return this;
  }

  addTokenTransfer(
    to: Address,
    amount: BigInt,
    tokenAddress: Address,
    tokenId: i32,
  ): TransactionBuilder {
    this.tokenTransfers.push({
      to: to,
      amount: amount.toU64(),
      tokenAddress: tokenAddress,
      tokenId: tokenId,
    });
    return this;
  }

  addRawRecipient(address: Address, actionName: string, arg: JSON.Raw): TransactionBuilder {
    this.recipients.push({ address: address, action: actionName, args: arg});
    return this;
  }

  addRecipient<T>(address: Address, actionName: string, arg: T): TransactionBuilder {
    this.recipients.push({ address: address, action: actionName, args: JSON.stringify([arg])});
    return this;
  }

  addOwnership(secret: Hex, authorizedKeys: Map<PublicKey, Hex>): TransactionBuilder {
    this.ownerships.push({ secret, authorizedKeys });
    return this;
  }

  toTransactionResult(): TransactionResult {
    return {
      type: this.type,
      data: {
        content: this.content,
        code: this.code,
        ledger: {
          uco: {
            transfers: this.ucoTransfers
          },
          token: {
            transfers: this.tokenTransfers
          },
        },
        recipients: this.recipients,
        ownerships: this.ownerships
      },
    } as TransactionResult;
  }
}
