import { Address, BigInt } from "./utils";

export enum TransactionType {
  Contract = 249,
  Transfer = 253,
  Data = 250,
  Token = 251,
}

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
export class Transaction {
  type!: TransactionType;
  data!: TransactionData;
}

@json
export class TransactionData {
  content: string = "";
  code: string | null;
  ledger: Ledger = { uco: { transfers: [] }, token: { transfers: [] } };
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

export class TransactionBuilder {
  type: TransactionType = TransactionType.Contract;
  content: string = "";
  code: string | null;
  ucoTransfers: UCOTransfer[] = [];
  tokenTransfers: TokenTransfer[] = [];

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

  toTransaction(): Transaction {
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
      },
    } as Transaction;
  }
}
