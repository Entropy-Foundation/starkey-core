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
  const { toAddress, transactionType, transferredAmount } = await getTransactionData(client, transaction, asset)
  const gasUnitPrice = transaction?.gas_unit_price
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
    gasPrice: gasUnitPrice ? ethers.formatUnits(gasUnitPrice, asset.decimal ?? 8) : '0',
    networkFees: gasUnitPrice ? ethers.formatUnits(gasUnitPrice * transaction?.gas_used, asset.decimal ?? 8) : '0',
    title: asset.title,
    transactionType,
    tokenDecimal: asset.decimal,
  }
}

export const getTransactionData = async (
  client: aptos.AptosClient,
  transaction: any,
  asset: NetworkToken
): Promise<{
  toAddress: string
  transactionType: TRANSACTION_TYPE
  transferredAmount: string
}> => {
  const decimal = asset.decimal ?? 8
  const currentFunction = transaction?.payload?.function?.toLowerCase()
  let transferredAmount = '0'
  let transactionType = TRANSACTION_TYPE.SEND_RECEIVED
  let toAddress = ''

  const isStandardTransfer =
    currentFunction === '0x1::aptos_account::transfer_coins' ||
    currentFunction === '0x1::coin::transfer' ||
    currentFunction === '0x1::primary_fungible_store::transfer'

  if (isStandardTransfer) {
    const args = transaction?.payload?.arguments || []
    toAddress = args?.length === 2 ? args[0] : ''
    if (currentFunction === '0x1::primary_fungible_store::transfer') {
      if (args.length === 3) {
        transferredAmount = ethers.formatUnits(args[2], decimal ?? 8)
      }
    } else if (args.length === 2) {
      transferredAmount = ethers.formatUnits(args[1], decimal ?? 8)
    } else if (args.length === 1) {
      transferredAmount = ethers.formatUnits(args[0], decimal ?? 8)
    }
  } else {
    const dataCheck = await getTxInsight(client, transaction.version, asset.address)
    const transferredCoin = getAmountForAptosCoin(dataCheck, asset.tokenContractAddress)
    if (transferredCoin) {
      const transferredCoinBigInt = BigInt(transferredCoin)
      transferredAmount = ethers.formatUnits(transferredCoinBigInt.toString(), decimal ?? 8)
      transactionType = TRANSACTION_TYPE.TRANSACTION
    }
    toAddress = currentFunction
  }
  return {
    toAddress,
    transactionType,
    transferredAmount,
  }
}

export const checkAptosTransactionStatus = async (rpcUrl: string, txHash: string) => {
  const response = await fetch(`${rpcUrl}/transactions/by_hash/${txHash}`, {
    method: 'GET',
  })
  const resData = { data: await response.json() }
  if (!resData.data.success) {
    throw new Error('Something went wrong')
  }
  return resData.data
}
