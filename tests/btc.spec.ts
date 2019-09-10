import {BtcWallet} from "../src/BtcWallet";
import {expect} from "chai";
import {mnemonicToSeedSync} from "bip39";
import * as sinon from "sinon";

const mnemonic = mnemonicToSeedSync(
  "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat",
).toString("hex");
const scriptData = {
  secretHash: mnemonic,
  lockTime: Math.floor(Date.now() / 1000) + 3600,
  recipientPublicKey: "02eedcf643cc3e394010a2ee8ffc9753976aba181ff68965c71f8aaa30f0da2836",
  ownerPublicKey: "02eedcf643cc3e394010a2ee8ffc9753976aba181ff68965c71f8aaa30f0da2836",
  secret: `0x${mnemonic}`,
};

let btc;

// describe('Btc send tx integration', () => {
//   beforeEach(() => {
//     btc = new BtcWallet({ network: 'test' })
//   })
//
//   it('Create raw send transaction', async () => {
//     await btc.createAccountWithPrivateKey('cPKNvsetQKj1ckMWrDxt7hS4cmN8wFaT8oZpv4kWoPxc5dBEUe6e')
//     // Act
//     const txRaw = await btc.getSendRawTransaction('mh4dYneN5HGUYNGQpHopJweL7GY1RgxWTA', '0.0001')
//
//     const result = await btc.broadcastTx(txRaw.toHex())
//     console.log('result', result)
//     // Assert
//     expect(txRaw).to.have.all.keys('ins', 'outs', 'locktime', 'version')
//   })
//
// })

// describe('Btc send tx integration', () => {
//   beforeEach(() => {
//     btc = new BtcWallet({ network: 'test' })
//   })
//   it('Create raw send transaction', async () => {
//     const account = await btc.createAccountWithPrivateKey('cPKNvsetQKj1ckMWrDxt7hS4cmN8wFaT8oZpv4kWoPxc5dBEUe6e')
//     // Act
//     const txHex = await btc.newSendRawTransaction('mh4dYneN5HGUYNGQpHopJweL7GY1RgxWTA', '0.0001')
//
//     const result = await btc.broadcastTx(txHex)
//     console.log('result', result)
//     // Assert
//     expect(txHex).to.be.equal('string')
//   })
// })

describe("Create BTC account", () => {
  beforeEach(() => {
    btc = new BtcWallet({network: "testnet"});

    sinon
      .stub(btc, "fetchUnspent")
      .returns([{value: 2110000, vOut: 0, txId: "dc497dd5c7fa3127663e647cf0d77f69ae139f3567c2f8addcf086eed6c7e45c"}]);
  });

  afterEach(() => sinon.restore());

  it("Create random BTC account", () => {
    // Act
    const account = btc.createRandomAccount();
    // Assert
    expect(account).to.have.all.keys("address", "publicKey", "privateKey");
    expect(account.address).to.be.a("string");
    expect(account.address).to.have.lengthOf.at.least(26);
    expect(account.address).to.have.lengthOf.at.most(35);
    expect(account.publicKey).to.be.a("string");
    expect(account.privateKey).to.be.a("string");
  });

  it("Create account from privateKey WIF format", () => {
    // Act
    const account = btc.createAccountWithPrivateKey("cPKNvsetQKj1ckMWrDxt7hS4cmN8wFaT8oZpv4kWoPxc5dBEUe6e");
    // Assert
    expect(account).to.have.property("address");
    expect(account.address).to.be.equal("n1UWU2rU9JUJDjVdeVvgSXX9mBccoVDiJC");
  });

  it("Create account from privateKey WIF format without key", () => {
    // Arrange
    let errorMessage = null;
    // Act
    try {
      btc.createAccountWithPrivateKey(undefined);
    } catch (error) {
      errorMessage = error.message;
    }
    // Assert
    expect(errorMessage).not.to.be.eq(null);
  });

  it("Create account from mnemonic", () => {
    // Act
    const account = btc.createKeyPairFromMnemonic({
      mnemonicSeed: mnemonic,
    });
    // Assert
    expect(account).to.have.all.keys("address", "publicKey", "privateKey");
    expect(account.address).to.be.a("string");
    expect(account.address).to.have.lengthOf.at.least(26);
    expect(account.address).to.have.lengthOf.at.most(35);
    expect(account.publicKey).to.be.a("string");
    expect(account.privateKey).to.be.a("string");
  });

  it("Create account from mnemonic with custom index", () => {
    // Act
    const account = btc.createKeyPairFromMnemonic({
      mnemonicSeed: mnemonic,
      indexForCreate: 4,
    });
    // Assert
    expect(account).to.have.all.keys("address", "publicKey", "privateKey");
    expect(account.address).to.be.a("string");
    expect(account.address).to.have.lengthOf.at.least(26);
    expect(account.address).to.have.lengthOf.at.most(35);
    expect(account.publicKey).to.be.a("string");
    expect(account.privateKey).to.be.a("string");
  });
});

describe("Create Transaction", () => {
  beforeEach(() => {
    btc = new BtcWallet({network: "testnet"});
    btc.createRandomAccount();
    sinon
      .stub(btc, "fetchUnspent")
      .returns([{value: 2110000, txId: "dc497dd5c7fa3127663e647cf0d77f69ae139f3567c2f8addcf086eed6c7e45c", vOut: 0}]);
  });

  afterEach(() => sinon.restore());

  it("Create raw send transaction", async () => {
    // Act
    const txRaw = await btc.getSendRawTransaction("mwCwTceJvYV27KXBc3NJZys6CjsgsoeHmf", "0.0101");
    // Assert
    expect(txRaw).to.have.all.keys("ins", "outs", "locktime", "version");
  });

  it("Create HTLC script raw transaction", async () => {
    // Act
    const txRaw = await btc.getWithdrawRawTransaction(scriptData, false);
    // Assert
    expect(txRaw).to.have.all.keys("ins", "outs", "locktime", "version");
  });

  it("Create HTLC script raw transaction with refund", async () => {
    // Act
    const txRaw = await btc.getRefundRawTransaction(scriptData);
    // Assert
    expect(txRaw).to.have.all.keys("ins", "outs", "locktime", "version");
  });

  it("Create HTLC script hex transaction", async () => {
    // Act
    const txHex = await btc.getWithdrawHexTransaction(scriptData, false);
    // Assert
    expect(txHex).to.be.a("string");
  });

  it("Create HTLC script hex transaction with refund", async () => {
    // Act
    const txHex = await btc.getRefundHexTransaction(scriptData);
    // Assert
    expect(txHex).to.be.a("string");
  });

  it("Create script with money", async () => {
    // Act
    const txHex = await btc.fundScript(scriptData, "0.012");
    // Assert
    expect(txHex).to.be.a("string");
  });

  it("Create script with no have money on fee", async () => {
    // Arrange
    let errorMessage = null;
    // Act
    try {
      await btc.fundScript(scriptData, "1.012");
    } catch (error) {
      errorMessage = error.message;
    }
    // Assert
    expect(errorMessage).not.to.be.eq(null);
  });

  it("Check tx values", async () => {
    // Act
    const txValues = await btc.getTxValues("n1UWU2rU9JUJDjVdeVvgSXX9mBccoVDiJC", "0.00041");
    // Assert
    expect(txValues).to.have.all.keys("feeValue", "skipValue", "fundValue", "unspentList", "totalUnspent");
    expect(txValues.feeValue).to.be.a("number");
    expect(txValues.skipValue).to.be.a("number");
    expect(txValues.fundValue).to.be.a("number");
    expect(txValues.totalUnspent).to.be.a("number");
    expect(txValues.skipValue).not.to.be.eq(0);
    expect(txValues.unspentList).to.be.a("array");
  });

  it("Check tx values with no have money on fee", async () => {
    // Arrange
    let errorMessage = null;
    // Act
    try {
      await btc.getTxValues("n1UWU2rU9JUJDjVdeVvgSXX9mBccoVDiJC", "11.012");
    } catch (error) {
      errorMessage = error.message;
    }
    // Assert
    expect(errorMessage).not.to.be.eq(null);
  });
});

describe("Create and check HTLC script", () => {
  beforeEach(() => {
    btc = new BtcWallet({network: "testnet"});

    sinon
      .stub(btc, "fetchUnspent")
      .returns([{value: 2110000, vOut: 0, txId: "dc497dd5c7fa3127663e647cf0d77f69ae139f3567c2f8addcf086eed6c7e45c"}]);
  });

  afterEach(() => sinon.restore());

  it("Create HTLC script", () => {
    // Act
    const script = btc.createScript(scriptData);
    // Assert
    expect(script).to.have.all.keys("scriptAddress", "HTLCScript");
    expect(script.scriptAddress).to.be.a("string");
    expect(script.scriptAddress[0]).to.be.eq("2");
    expect(script.HTLCScript).to.be.instanceof(Buffer);
  });

  it("Check HTLC script", async () => {
    // Act
    const errorMessage = await btc.checkScript(scriptData, {
      value: 10032,
      lockTime: Math.floor(Date.now() / 1000) + 3600,
      recipientPublicKey: "02eedcf643cc3e394010a2ee8ffc9753976aba181ff68965c71f8aaa30f0da2836",
    });
    // Assert
    expect(errorMessage).not.to.be.eq(null);
  });

  it("Check HTLC script with expected value", async () => {
    // Act
    const errorMessage = await btc.checkScript(scriptData, {
      value: 100320000000,
      lockTime: Math.floor(Date.now() / 1000) + 3600,
      recipientPublicKey: "02eedcf643cc3e394010a2ee8ffc9753976aba181ff68965c71f8aaa30f0da2836",
    });
    // Assert
    expect(errorMessage).to.be.a("string");
  });

  it("Check HTLC script with undefined value", async () => {
    // Act
    const errorMessage = await btc.checkScript(scriptData, {
      value: undefined,
      lockTime: Math.floor(Date.now() / 1000) + 3600,
      recipientPublicKey: "02eedcf643cc3e394010a2ee8ffc9753976aba181ff68965c71f8aaa30f0da2836",
    });
    // Assert
    expect(errorMessage).to.be.a("string");
  });

  it("Check HTLC script with out lock time", async () => {
    // Act
    const errorMessage = await btc.checkScript(scriptData, {
      value: 10032,
      lockTime: undefined,
      recipientPublicKey: "02eedcf643cc3e394010a2ee8ffc9753976aba181ff68965c71f8aaa30f0da2836",
    });
    // Assert
    expect(errorMessage).to.be.a("string");
  });

  it("Check HTLC script with different public key", async () => {
    // Act
    const errorMessage = await btc.checkScript(scriptData, {
      value: 10032,
      lockTime: undefined,
      recipientPublicKey: "123",
    });
    // Assert
    expect(errorMessage).to.be.a("string");
  });

  it("Get unspent tx for address", () => {
    // Act
    const unspent = btc.fetchUnspent("n1UWU2rU9JUJDjVdeVvgSXX9mBccoVDiJC");
    // Assert
    expect(unspent).to.be.a("array");
  });
});

describe("Create Transaction", () => {
  beforeEach(() => {
    btc = new BtcWallet({network: "testnet"});
    sinon.stub(btc, "fetchUnspent").returns([
      {
        value: 2110000,
        vOut: 0,
        txId: "dc497dd5c7fa3127663e647cf0d77f69ae139f3567c2f8addcf086eed6c7e45c",
      },
    ]);
  });

  afterEach(() => sinon.restore());

  it("Get balance from address", async () => {
    // Act
    const balance = await btc.getBalanceAddress("n1UWU2rU9JUJDjVdeVvgSXX9mBccoVDiJC");
    // Assert
    expect(balance).to.be.a("number");
    expect(balance).to.be.eq(2110000);
  });

  it("Get balance from undefined address", async () => {
    // Arrange
    let errorMessage = null;
    // Act
    try {
      await btc.getBalanceAddress(undefined);
    } catch (error) {
      errorMessage = error.message;
    }
    // Assert
    expect(errorMessage).not.to.be.eq(null);
  });

  it("Get balance from script data", async () => {
    // Act
    const balance = await btc.getBalanceScript(scriptData);
    // Assert
    expect(balance).to.be.a("number");
    expect(balance).to.be.eq(2110000);
  });
});
