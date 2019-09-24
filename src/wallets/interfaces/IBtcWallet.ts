import {ECPairInterface, Transaction} from "./IBtcLib";

export interface InitOptions {
  networks: string;
}

export interface SignTxParams {
  keyPair: ECPairInterface;
  secret: string;
  HTLCScript: any;
  txRaw: any;
}

export interface Account {
  address: string;
  privateKey: string;
  publicKey: string;
}

export interface ScriptData {
  secretHash: string;
  ownerPublicKey: string;
  recipientPublicKey: string;
  lockTime: number;
  secret: string;
}

export interface ScriptValues {
  scriptAddress: string;
  HTLCScript: object;
}

export interface ExpectedScriptParams {
  value: number;
  lockTime: number;
  recipientPublicKey: string;
}

export interface TxValues {
  feeValue: number;
  unspentList: any;
  fundValue: number;
  skipValue: number;
  totalUnspent: number;
}

export interface CreateFromMnemonicData {
  mnemonicSeed: string;
  indexForCreate: number;
}

export interface GenerateMnemonic {
  mnemonic: Array<string>;
}

export interface OutPut {
  value: number;
}

export interface IBtcWallet {
  generateMnemonic(): GenerateMnemonic;

  createRandomAccount(): Account;

  getAccount(): any;

  getBalance(address: string): Promise<number | string>;

  createAccountWithPrivateKey(privateKey: string): Account;

  createKeyPairFromMnemonic(accountData: CreateFromMnemonicData): Account;

  getAccountKeyPair(): ECPairInterface;

  getAddressFromPubKey(publicKey: Buffer): string;

  newSendRawTransaction(to: string, amount: string): Promise<string>;

  getSendRawTransaction(to: string, amount: string, isRefund: boolean): Promise<Transaction>;

  createScript(data: ScriptData): ScriptValues;

  signTransaction(params: SignTxParams): Transaction;

  checkScript(data: ScriptData, expected: ExpectedScriptParams): Promise<string>;

  fundScript(data: ScriptData, amount: string): Promise<string>;

  getBalanceAddress(address: string): Promise<string>;

  getBalanceScript(data: ScriptData): Promise<string>;

  send(to: string, amount: string): Promise<any>;

  getWithdrawRawTransaction(data: ScriptData, isRefund: boolean): Promise<Transaction>;

  getWithdrawHexTransaction(data: ScriptData, isRefund: boolean): Promise<string>;

  getRefundRawTransaction(data: ScriptData): Promise<Transaction>;

  getRefundHexTransaction(data: ScriptData): Promise<string>;

  getTxValues(amount: string, address: string): Promise<TxValues>;

  fetchUnspent(address: string): Promise<Array<OutPut>>;

  broadcastTx(txHex: string): Promise<Response>; // TODO
}
