// @ts-nocheck
import {ECPair, ECPairInterface, networks, opcodes, payments, Psbt, script, TransactionBuilder} from "bitcoinjs-lib";
// @ts-ignore
import bip65 from "bip65";
import {generateMnemonic, validateMnemonic} from "bip39";

import BigNumber from "bignumber.js";
import hdkey from "hdkey";
import wif from "wif";

import axios from "axios";

import {
  Account,
  CreateFromMnemonicData,
  ExpectedScriptParams,
  GenerateMnemonic,
  IBtcWallet,
  Network,
  OutPut,
  ScriptData,
  ScriptValues,
  SignTxParams,
  Transaction,
  TxValues,
} from "./interfaces";
import {log} from "./utils";

export class BtcWallet implements IBtcWallet {
  private account: any;
  private options: any;
  private readonly network: Network;

  constructor(options: {network: string}) {
    this.options = options;
    this.network = options.network === "testnet" ? networks.testnet : networks.bitcoin;
  }

  createRandomAccount(): Account {
    const keyPair = ECPair.makeRandom({network: this.network});
    const address = this.getAddressFromPubKey(keyPair.publicKey);

    this.account = {
      address,
      privateKey: keyPair.toWIF(),
      publicKey: keyPair.publicKey.toString("hex"),
    };

    return this.account;
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

  createAccountWithPrivateKey(privateKey: string): Account {
    if (!privateKey) {
      throw new Error("Private key is not define");
    }

    const keyPair = ECPair.fromWIF(privateKey, this.network);
    const address = this.getAddressFromPubKey(keyPair.publicKey);

    this.account = {
      address,
      privateKey: keyPair.toWIF(),
      publicKey: keyPair.publicKey.toString("hex"),
    };

    return this.account;
  }

  getAccountKeyPair(): ECPairInterface {
    const {privateKey} = this.account;
    return ECPair.fromWIF(privateKey, this.network);
  }

  getAccount() {
    return this.account;
  }

  getAddressFromPubKey(publicKey: Buffer): string {
    const {address} = payments.p2pkh({pubkey: publicKey, network: this.network});
    return address!;
  }

  createKeyPairFromMnemonic(accountData: CreateFromMnemonicData): Account {
    const {mnemonicSeed, indexForCreate} = accountData;
    if (!mnemonicSeed || mnemonicSeed.length < 64) {
      throw new Error("mnemonic is not define or invalid");
    }

    // BIP-44	m/44'/0'/a'/c/i
    // a = account index
    // c = 0 for external, 1 for internal (change)
    // i = key/address index

    const master = hdkey.fromMasterSeed(Buffer.from(mnemonicSeed, "hex"));
    const node = master.derive(`m/44'/0'/0'/0/${indexForCreate || 0}`);
    // @ts-ignore
    const privateKey = wif.encode(this.network.wif, node._privateKey, false);

    return this.createAccountWithPrivateKey(privateKey);
  }

  async newSendRawTransaction(to: string, amount: string): Promise<string> {
    const {address} = this.account;

    const psbt = new Psbt({network: this.network});
    psbt.setVersion(2);
    psbt.setLocktime(0);

    const keyPair = this.getAccountKeyPair();
    const txValues = await this.getTxValues(address, amount);

    const {unspentList, fundValue, skipValue} = txValues;

    unspentList.forEach(({txId, vOut}: any) =>
      psbt
        .addInput({
          hash: txId,
          nonWitnessUtxo: vOut,
          index: 0,
          sequence: 0xffffffff,
        })
        .signInput(0, keyPair),
    );

    psbt.addOutput({
      // @ts-ignore
      address: to,
      value: fundValue,
    });

    psbt.addOutput({
      // @ts-ignore
      address: address,
      value: skipValue,
    });

    psbt.finalizeAllInputs();

    const txRaw = psbt.extractTransaction();

    return txRaw.toHex();
  }

  async getSendRawTransaction(to: string, amount: string): Promise<Transaction> {
    const {address} = this.account;

    const tx = new TransactionBuilder(this.network);
    const keyPair = this.getAccountKeyPair();
    const txValues = await this.getTxValues(address, amount);

    const {unspentList, fundValue, skipValue} = txValues;

    tx.setVersion(1);
    unspentList.forEach(({txId, vOut}: any) => tx.addInput(txId, vOut, 0xfffffffe));

    tx.addOutput(to, fundValue);
    tx.addOutput(address, skipValue);

    unspentList.forEach((input: any, index: number) => {
      tx.sign(index, keyPair);
    });

    return tx.buildIncomplete();
  }

  async send(to: string, amount: string): Promise<any> {
    try {
      const txRaw = await this.getSendRawTransaction(to, amount);
      const result = await this.broadcastTx(txRaw.toHex());
      return result;
    } catch (e) {
      log(e);
    }
  }

  async getWithdrawRawTransaction(data: ScriptData, isRefund: boolean): Promise<Transaction> {
    const {address} = this.account;
    const {HTLCScript, scriptAddress} = this.createScript(data);

    const tx = new TransactionBuilder(this.network);
    const keyPair = this.getAccountKeyPair();
    const txValues = await this.getTxValues(scriptAddress, "0");

    const {unspentList, feeValue, totalUnspent} = txValues;

    if (isRefund) {
      tx.setLockTime(data.lockTime);
    }

    unspentList.forEach(({txId, value}: any) => tx.addInput(txId, value, 0xfffffffe));
    tx.addOutput(address, totalUnspent - feeValue);

    const txRaw = tx.buildIncomplete();

    this.signTransaction({
      txRaw,
      keyPair,
      HTLCScript,
      secret: data.secret,
    });

    return txRaw;
  }

  async getWithdrawHexTransaction(data: ScriptData, isRefund: boolean): Promise<string> {
    const txRaw = await this.getWithdrawRawTransaction(data, isRefund);

    return txRaw.toHex();
  }

  async getRefundRawTransaction(data: ScriptData): Promise<Transaction> {
    return await this.getWithdrawRawTransaction(data, true);
  }

  async getRefundHexTransaction(data: ScriptData): Promise<string> {
    const txRaw = await this.getRefundRawTransaction(data);

    return txRaw.toHex();
  }

  createOtcScript(secretHash: string) {
    script.compile([opcodes.OP_RIMPED160, Buffer.from(secretHash, "hex"), opcodes.OP_EQUALVERIFY]);
  }

  createScript(data: ScriptData): ScriptValues {
    const {secretHash, ownerPublicKey, recipientPublicKey, lockTime} = data;

    const encodeLockTime = bip65.encode({utc: lockTime});

    const HTLCScript = script.compile([
      opcodes.OP_RIPEMD160, // хешируем следующую строку
      Buffer.from(secretHash, "hex"), // хекс секрета генерируется на фронте
      opcodes.OP_EQUALVERIFY, // OP_EQUAL + OP_VERIFY
      // OP_VERIFY Отмечает транзакцию как недействительную, если значение верхнего стека не соответствует действительности.
      // Верхнее значение стека удаляется.

      Buffer.from(recipientPublicKey, "hex"), // кладем публичный ключ участника
      opcodes.OP_EQUAL, // проверяет идентичность входных данных

      opcodes.OP_IF, // если верхний стек не false идет дальше и удаляет верхнее значение
      Buffer.from(recipientPublicKey, "hex"), // кладем публичный ключ участника
      opcodes.OP_CHECKSIG, // хешируем и подписываем все от последнего выполнего OP_CODE_SEPARATOR
      opcodes.OP_ELSE, // если выполнились OP_IF, OP_NOT_IF, OP_ELSE то пропускается и наоборот
      script.number.encode(encodeLockTime),
      opcodes.OP_CHECKLOCKTIMEVERIFY, // https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki
      opcodes.OP_DROP, // Удаляет верхний элемент стека
      Buffer.from(ownerPublicKey, "hex"),
      opcodes.OP_CHECKSIG,
      opcodes.OP_ENDIF, //  завершает блок IF/ELSE так же проверяет что все блоки завершены, или транзакция недействительна.
    ]);

    const {address: scriptAddress} = payments.p2sh({
      redeem: {
        output: HTLCScript,
        network: this.network,
      },
      network: this.network,
    });

    return {
      scriptAddress: scriptAddress!,
      HTLCScript,
    };
  }

  signTransaction(params: SignTxParams): Transaction {
    const {HTLCScript, txRaw, secret, keyPair} = params;

    const hashType = Transaction.SIGHASH_ALL;
    const signatureHash = txRaw.hashForSignature(0, HTLCScript, hashType); // input index 0
    const signature = script.signature.encode(keyPair.sign(signatureHash), hashType);

    const scriptSig = payments.p2sh({
      redeem: {
        input: script.compile([signature, this.account.publicKey, Buffer.from(secret.replace(/^0x/, ""), "hex")]),
        output: HTLCScript,
      },
    }).input;

    return txRaw.setInputScript(0, scriptSig);
  }

  async checkScript(data: ScriptData, expected: ExpectedScriptParams): Promise<string> {
    const {recipientPublicKey, lockTime} = data;
    const {scriptAddress} = this.createScript(data);

    const unspentList = await this.fetchUnspent(scriptAddress);
    const totalUnspent = unspentList.reduce((sum: number, {value}: any) => sum + value, 0);
    const expectedValue = new BigNumber(String(expected.value)).multipliedBy(1e8);

    if (!expected.value || expectedValue.isGreaterThan(totalUnspent)) {
      return `Expected script value: ${expectedValue.toNumber()}, got: ${totalUnspent}`;
    }
    if (expected.lockTime > lockTime) {
      return `Expected script lockTime: ${expected.lockTime}, got: ${lockTime}`;
    }
    if (expected.recipientPublicKey !== recipientPublicKey) {
      return `Expected script recipient publicKey: ${expected.recipientPublicKey}, got: ${recipientPublicKey}`;
    }
    return expected.value.toString();
  }

  async fundScript(data: ScriptData, amount: string): Promise<string> {
    const {address} = this.account;
    const {scriptAddress} = this.createScript(data);

    const tx = new TransactionBuilder(this.network);
    const keyPair = this.getAccountKeyPair();
    const txValues = await this.getTxValues(address, amount);

    const {unspentList, fundValue, skipValue} = txValues;

    unspentList.forEach(({txId, value}: any) => tx.addInput(txId, value));

    tx.addOutput(scriptAddress, fundValue);
    tx.addOutput(address, skipValue);

    const txRaw = tx.buildIncomplete();

    txRaw.ins.forEach((input: object, index: number) => {
      tx.sign(index, keyPair);
    });

    return await txRaw.toHex();
  }

  async getTxValues(address: string, amount: string): Promise<TxValues> {
    const unspentList = await this.fetchUnspent(address);
    const fundValue = new BigNumber(amount).multipliedBy(1e8).toNumber();

    const feeValue = 5000; // TODO custom
    const totalUnspent = unspentList.reduce((sum: number, {value}: any) => sum + value, 0);
    const skipValue = totalUnspent - fundValue - feeValue;

    if (skipValue <= 546) {
      throw new Error(`Skip value in tx small for broadcast, value: ${skipValue}`);
    }

    return {
      feeValue,
      skipValue,
      fundValue,
      unspentList,
      totalUnspent,
    };
  }

  async getBalanceAddress(address: string): Promise<string> {
    const unspentList = await this.fetchUnspent(address);

    if (!address) {
      throw new Error(`Address is undefined: ${address}`);
    }

    // @ts-ignore
    if (!unspentList && unspentList.length === 0) {
      log("getBalanceAddress: unspentList is empty");
      return "0";
    }

    return unspentList.reduce((sum: any, {value}: any) => sum + value, 0);
  }

  async getBalance(address: string): Promise<number> {
    try {
      const balance = await this.getBalanceAddress(address);

      if (balance) {
        return Number(balance) / 100000000;
      } else {
        return 0;
      }
    } catch (error) {
      log("Error", error);
    }
    return 0;
  }

  async getBalanceScript(data: ScriptData): Promise<string> {
    const {scriptAddress} = this.createScript(data);

    return await this.getBalanceAddress(scriptAddress);
  }

  async fetchUnspent(address: string): Promise<Array<OutPut>> {
    const url =
      this.options.network === "testnet"
        ? `https://test-insight.bitpay.com/api/addr/${address}/utxo`
        : `https://insight.bitpay.com/api/addr/${address}/utxo`;

    const {data} = await axios.get(url);

    if (!data) {
      throw new Error(`You don't  have unspent tx: ${data}`);
    }

    return data.map(({satoshis, txid, vout}: any) => ({value: satoshis, txId: txid, vOut: vout}));
  }

  valueToSatoshi(value: string | number) {
    return new BigNumber(String(value)).multipliedBy(1e8).toNumber();
  }

  async broadcastTx(txRaw: string): Promise<any> {
    const url =
      this.options.network === "testnet"
        ? "https://test-insight.bitpay.com/api/tx/send"
        : "https://insight.bitpay.com/api/tx/send";

    try {
      return await axios.post(url, {
        rawtx: txRaw,
      });
      // eslint-disable-next-line no-empty
    } catch (err) {
    }
  }
}
