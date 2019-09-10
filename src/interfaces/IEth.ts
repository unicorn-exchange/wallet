import {ABIDefinition} from "./IAbi";
import {CreateFromMnemonicData} from "./IBtcWallet";

export interface IEth {
  getAccount(): AccountEth;

  getBalance(address: string): Promise<number | string>;

  createAccountWithPrivateKey(privateKey: string): AccountEth;

  signTx(params: ParamsTx): Promise<any>;

  broadCastTx(rawTx: string): Promise<any>;

  send(to: string, amount: string): Promise<any>;

  fetchBalance(address: string): Promise<number>;

  createKeyPairFromMnemonic(params: CreateFromMnemonicData): AccountEth;
}

export interface AccountData {
  mnemonicSeed: string[];
  indexForCreate?: number;
}

export interface ParamsTx {
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  from: string;
}

export interface AccountEth {
  address: string;
  privateKey: string;
}

export interface EthParams {
  gasPrice?: string;
  gasLimit?: string;
  network: string;
  ERC20TokenContract?: EthereumContract;
}

export interface EthereumContract {
  abi: ABIDefinition[];
  address: string;
}
