import { Wallet } from '../Wallet'
import { expect, assert } from 'chai'
import { mnemonicToSeedSync } from 'bip39'
import sinon from 'sinon'

const mnemonic = mnemonicToSeedSync('candy maple cake sugar pudding cream honey rich smooth crumble sweet treat').toString('hex')

let wallet

describe('Wallet', () => {
  beforeEach(() => {
    wallet = new Wallet({ network: 'testnet' })
  })

  afterEach(() => sinon.restore())

  it('Generate mnemonic', async () => {
    // Act
    const mnemonic = await wallet.generateMnemonic()
    // Assert
    expect(mnemonic).to.have.a.keys('mnemonic')
  })

  it('Get BTC account', async () => {
    // Act
    const account = await wallet.getWallet('BTC')
    // Assert
    assert.notEqual(account, null)
  })

  it('Get ETH account', async () => {
    // Act
    const account = await wallet.getWallet('ETH')
    // Assert
    assert.notEqual(account, null)
  })

  it('Init wallet and get btc wallet', async () => {
    // Act
    wallet.initWallet(mnemonic)

    const account = wallet.getWallet('BTC').getAccount()
    // Assert
    expect(account).to.have.all.keys('address', 'publicKey', 'privateKey')
  })

  it('Init wallet and get eth wallet', async () => {
    // Act
    wallet.initWallet(mnemonic)

    const account = wallet.getWallet('ETH').getAccount()
    // Assert
    expect(account).to.have.all.keys('address', 'privateKey')
  })

  it('Get balance eth wallet', async () => {
    // Act
    const balance = await wallet.getBalance('eth', '0x848CC55ee7A76c566c7cB2E83f48A5468131c1dC')
    // Assert
    expect(balance).to.be.a('number')
  })

  it('Get balance eth wallet', async () => {
    // Act
    const balance = await wallet.getBalance('btc', 'mwgWuubqyJg3SWCBKQmxFkwULRY6EFCBPy')
    // Assert
    expect(balance).to.be.a('number')
  })

  it('Send eth currency', async () => {
    // Act
    let result = null
    wallet.initWallet(mnemonic)

    result = await wallet.sendCurrency('eth', '0xF39598EF3e216cf052a45dA5f163D2b4bD21469E', '0.01')
    // Assert
    assert.notEqual(result, null)
  })

  it('Send btc currency', async () => {
    // Act
    let result = null
    wallet.initWallet(mnemonic)

    result = await wallet.sendCurrency('btc', 'mwgWuubqyJg3SWCBKQmxFkwULRY6EFCBPy', '0.001')
    // Assert
    assert.notEqual(result, null)
  })
})
