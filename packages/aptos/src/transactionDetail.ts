import { NetworkToken, ReturnTransactionData, TRANSACTION_TYPE } from '@starkey/utils'
import * as aptos from 'aptos'
import { ethers } from 'ethers'
import { getTxInsight } from './aptosParser'
import { getAmountForAptosCoin } from './transactionList'

/**
 * Fetches an Aptos transaction by hash using the provided hash and Aptos provider.
 *
 * @param {string} hash - The hash of the transaction to fetch.
 * @param {any} provider - The Aptos provider used to fetch the transaction.
 * @returns {Promise<AptosTransaction>} - A promise that resolves to an object containing the transaction details.
 */
export const getAptosTransactionDetail = async (hash: string, asset: NetworkToken): Promise<ReturnTransactionData> => {
  const client = new aptos.AptosClient(asset.providerNetworkRPC_URL)
  const transaction: any = await client.getTransactionByHash(hash)
  const currentFunction = transaction?.payload?.function?.toLowerCase()
  let transferredAmount
  let toAddress = ''

  let transactionType = TRANSACTION_TYPE.SEND_RECEIVED
  if (
    currentFunction !== '0x1::aptos_account::transfer_coins' &&
    currentFunction !== '0x1::coin::transfer' &&
    currentFunction !== '0x1::primary_fungible_store::transfer'
  ) {
    const dataCheck = await getTxInsight(client, transaction.version, asset.address)
    const transferredCoin = getAmountForAptosCoin(dataCheck, asset.tokenContractAddress)
    toAddress = currentFunction
    if (transferredCoin) {
      const transferredCoinBigInt = BigInt(transferredCoin)
      transferredAmount = ethers.formatUnits(transferredCoinBigInt.toString(), asset.decimal ?? 8)
      transactionType = TRANSACTION_TYPE.TRANSACTION
    } else {
      transferredAmount = 0
    }
  } else {
    toAddress = transaction?.payload?.arguments?.length === 2 ? transaction?.payload?.arguments[0] : ''

    transferredAmount =
      currentFunction === '0x1::primary_fungible_store::transfer'
        ? transaction?.payload?.arguments?.length === 3
          ? ethers.formatUnits(transaction?.payload?.arguments[2], asset.decimal ?? 8)
          : '0'
        : transaction?.payload?.arguments?.length === 2
        ? ethers.formatUnits(transaction?.payload?.arguments[1], asset.decimal ?? 8)
        : ethers.formatUnits(transaction?.payload?.arguments[0], asset.decimal ?? 8)
  }
  return {
    blockNumber: 1,
    time: transaction?.timestamp
      ? Math.floor(new Date(Number(transaction?.timestamp ?? 0) / 1000).getTime() / 1000)
      : '',
    hash: transaction?.hash,
    nonce: undefined,
    from: transaction?.sender,
    to: toAddress,
    value: transferredAmount,
    gas: transaction?.gas_used ?? '0',
    gasPrice: transaction?.gas_unit_price ? ethers.formatUnits(transaction?.gas_unit_price, asset.decimal ?? 8) : '0',
    networkFees: transaction?.gas_unit_price
      ? ethers.formatUnits(transaction?.gas_unit_price * transaction?.gas_used, asset.decimal ?? 8)
      : '0',
    title: asset.title,
    transactionType,
    tokenDecimal: asset.decimal,
  }
}
