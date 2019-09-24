import {initProvider, log} from "./utils";
import {AccountEth, CreateFromMnemonicData, EthParams, IEth, ParamsTx} from "./interfaces";
// @ts-ignore
import hdkey from "ethereumjs-wallet/hdkey";

export class EthWallet implements IEth {
  private web3: any;
  private account: any;
  private readonly params: EthParams;

  constructor(params: EthParams) {
    this.web3 = initProvider(params.network);
    this.params = params;
  }

  getAccount(): AccountEth {
    return {
      address: this.account.address,
      privateKey: this.account.privateKey,
    };
  }

  async fetchBalance(address: string): Promise<number> {
    return await this.web3.eth.getBalance(address).then((wei: any) => {
      const balance = Number(this.web3.utils.fromWei(wei));
      return balance;
    });
  }

  async getBalance(address: string): Promise<number> {
    return await this.fetchBalance(address);
  }

  createAccountWithPrivateKey(privateKey: string): AccountEth {
    if (!privateKey) {
      throw new Error("Private key is not define");
    }

    this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
    log("account", this.account);
    this.initWalletInstance(privateKey);

    const {address} = this.account;
    return {address, privateKey};
  }

  createKeyPairFromMnemonic(params: CreateFromMnemonicData): AccountEth {
    const {mnemonicSeed, indexForCreate} = params;

    const hdpath = `m/44'/60'/0'/0/${indexForCreate}`;
    const createWallet = hdkey.fromMasterSeed(mnemonicSeed).derivePath(hdpath);
    const getWallet = createWallet.getWallet();
    const privateKey = getWallet.getPrivateKeyString();

    return this.createAccountWithPrivateKey(privateKey);
  }

  async send(to: string, amount: string): Promise<any> {
    const {address} = this.account;

    const value = this.web3.utils.toWei(amount, "ether");

    const params = {
      from: address,
      to,
      value,
      gas: "3000000",
    };
    log("params", params);

    // @ts-ignore
    const signedTx = await this.signTx(params);
    return await this.broadCastTx(signedTx.rawTransaction);
  }

  signTx(params: ParamsTx): Promise<any> {
    const {privateKey} = this.account;

    return this.web3.eth.accounts.signTransaction(params, privateKey);
  }

  async broadCastTx(rawTx: string): Promise<any> {
    log("rawTx", rawTx);
    return this.web3.eth
      .sendSignedTransaction(rawTx)
      .on("transactionHash", (hash: string) => {
        log("Hash tx:", hash);
      })
      .on("error", (err: Error) => {
        log("ETH sendTx Error:", err);
      });
  }

  private initWalletInstance(privateKey: string): void {
    if (typeof privateKey === "undefined") {
      throw new Error("Private key is not define");
    }

    this.web3.eth.accounts.wallet.add(privateKey);
    log("init", this.web3.eth.accounts);
  }
}
