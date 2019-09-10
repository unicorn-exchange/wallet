import {BtcWallet} from "./BtcWallet";
import {EthWallet} from "./EthWallet";
import {GenerateMnemonic, IBtcWallet, IEth} from "./interfaces";

import {log} from "./utils";

import {generateMnemonic, validateMnemonic} from "bip39";

type wallets = IBtcWallet | IEth;

export class Wallet {
  public wallets: Map<string, wallets> = new Map();

  constructor({network}) {
    this.wallets.set("BTC", new BtcWallet({network}));
    this.wallets.set("ETH", new EthWallet({network}));
  }

  getWallet(type: string) {
    const upperType = type.toUpperCase();

    if (!this.wallets.has(upperType)) {
      throw new Error(`Wallet: dont has wallet ${type}`);
    }

    return this.wallets.get(upperType);
  }

  generateMnemonic(): GenerateMnemonic {
    const mnemonicPhrase: string = generateMnemonic();
    if (!validateMnemonic(mnemonicPhrase)) {
      throw new Error(`Invalid mnemonic ${mnemonicPhrase}`);
    }

    return {
      mnemonic: mnemonicPhrase.split(" "),
    };
  }

  initWallet(mnemonic: string) {
    this.wallets.forEach(async wallet => {
      await wallet.createKeyPairFromMnemonic({mnemonicSeed: mnemonic, indexForCreate: 0});
    });
  }

  async getBalance(type: string, address: string): Promise<number | string> {
    const customWallet = this.getWallet(type);

    const balance = await customWallet.getBalance(address);
    log(`Balance ${type}`, type, balance);

    return balance;
  }

  async sendCurrency(type: string, to: string, amount: string) {
    const customWallet = this.getWallet(type);
    return await customWallet.send(to, amount);
  }
}
