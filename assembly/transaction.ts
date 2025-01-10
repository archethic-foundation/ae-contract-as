import { Address, Hex, PublicKey } from "./utils";
import { JSON } from "json-as";

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
  @alias("token_address")
  tokenAddress!: Address;
  @alias("token_id")
  tokenId!: i32;
}

@json
export class TransactionResult {
  version!: u32;
  type!: TransactionType;
  data!: TransactionData;
}

@json
export class Transaction extends TransactionResult {
  address!: Address;
  genesis!: Address;
  @alias("previous_public_key")
  previousPublicKey!: PublicKey;
}

@json
export class TransactionData {
  content: string = "";
  ledger: Ledger = { uco: { transfers: [] }, token: { transfers: [] } };
  recipients: Recipient[] = [];
  ownerships: Ownership[] = [];
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
  args: JSON.Raw;
}

@json
class Ownership {
  secret!: Hex;
  authorizedKeys: Map<PublicKey, Hex> = new Map<PublicKey, Hex>();
}

export class TransactionBuilder {
  version: u32 = 4;
  type: TransactionType = TransactionType.Contract;
  content: string = "";
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

  addUCOTransfer(to: Address, amount: u64): TransactionBuilder {
    this.ucoTransfers.push({ to: to, amount: amount });
    return this;
  }

  addTokenTransfer(
    to: Address,
    amount: u64,
    tokenAddress: Address,
    tokenId: i32
  ): TransactionBuilder {
    this.tokenTransfers.push({
      to: to,
      amount: amount,
      tokenAddress: tokenAddress,
      tokenId: tokenId,
    });
    return this;
  }

  addRawRecipient(
    address: Address,
    actionName: string,
    arg: JSON.Raw
  ): TransactionBuilder {
    this.recipients.push({ address: address, action: actionName, args: arg });
    return this;
  }

  addRecipient<T>(
    address: Address,
    actionName: string,
    arg: T
  ): TransactionBuilder {
    this.recipients.push({
      address: address,
      action: actionName,
      args: JSON.stringify([arg]),
    });
    return this;
  }

  addOwnership(
    secret: Hex,
    authorizedKeys: Map<PublicKey, Hex>
  ): TransactionBuilder {
    this.ownerships.push({ secret, authorizedKeys });
    return this;
  }


  toTransactionResult(): TransactionResult {
    return {
      version: this.version,
      type: this.type,
      data: {
        content: this.content,
        ledger: {
          uco: {
            transfers: this.ucoTransfers,
          },
          token: {
            transfers: this.tokenTransfers,
          },
        },
        recipients: this.recipients,
        ownerships: this.ownerships,
      },
    } as TransactionResult;
  }
}
