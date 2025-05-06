import { NATIVE_COINS, NetworkToken, ReturnTransactionData, TRANSACTION_TYPE } from '@starkey/utils'
import * as aptos from 'aptos'
import { ethers } from 'ethers'
import { getTxInsight } from './aptosParser'

export const PAGINATION_COUNT_20 = 20

export const getAptosTransactions = async (asset: NetworkToken, page: number = 1): Promise<ReturnTransactionData[]> => {
  try {
    if (!asset.indexerClient) {
      throw new Error('Indexer client URL is required but not provided.')
    }
    const client = new aptos.AptosClient(asset.providerNetworkRPC_URL)
    const indexerClient = new aptos.IndexerClient(asset.indexerClient)
    const transactionVersion = await indexerClient.getAccountTransactionsData(asset.address, {
      options: {
        limit: PAGINATION_COUNT_20,
        offset: (page - 1) * PAGINATION_COUNT_20,
      },
      orderBy: [{ transaction_version: 'desc' }],
    })

    const transactionsPromises = transactionVersion.account_transactions.map(async (version) => {
      const transaction: any = await client.getTransactionByVersion(version.transaction_version)
      if (transaction?.payload?.function?.toLowerCase()?.includes('register')) {
        return null
      }
      const functionName = getTransactionFunctionName(transaction, asset?.tokenContractAddress)
      const currentFunction = transaction?.payload?.function?.toLowerCase()
      let transferredAmount
      let transactionType = TRANSACTION_TYPE.SEND_RECEIVED
      if (
        currentFunction !== '0x1::aptos_account::transfer_coins' &&
        currentFunction !== '0x1::coin::transfer' &&
        currentFunction !== '0x1::primary_fungible_store::transfer'
      ) {
        const dataCheck = await getTxInsight(client, version.transaction_version, asset.address)
        const transferredCoin = getAmountForAptosCoin(dataCheck, asset.tokenContractAddress)
        if (transferredCoin) {
          const transferredCoinBigInt = BigInt(transferredCoin)
          transferredAmount = ethers.formatUnits(transferredCoinBigInt.toString(), asset.decimal ?? 8)
          transactionType = TRANSACTION_TYPE.TRANSACTION
        } else {
          transferredAmount = 0
        }
      } else {
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
        blockNumber: undefined,
        time: transaction?.timestamp
          ? Math.floor(new Date(Number(transaction?.timestamp ?? 0) / 1000).getTime() / 1000)
          : '',
        hash: transaction?.hash,
        nonce: undefined,
        from: transaction?.sender,
        to: transaction?.payload?.arguments?.length === 2 ? transaction?.payload?.arguments[0] : '',
        value: transferredAmount,
        gas: transaction?.gas_used ?? '0',
        gasPrice: transaction?.gas_unit_price ?? '0',
        functionName,
        transactionType,
      }
    })

    const transactions = await Promise.all(transactionsPromises)
    const validTransactions = transactions.filter(Boolean) as ReturnTransactionData[]
    const filteredTransactions = asset.tokenContractAddress
      ? validTransactions.filter(
          (transaction) => transaction && transaction.functionName === asset.tokenContractAddress
        )
      : validTransactions.filter((transaction) => transaction && transaction.functionName === '')
    return filteredTransactions
  } catch (error) {
    console.error('Error fetching Aptos transactions:', error)
    return []
  }
}

/**
 * Extracts the function name from an Aptos transaction payload.
 *
 * @param {any} transaction - The Aptos transaction details.
 * @param {string} [contractAddress] - The address of the contract to filter the transactions by.
 * @returns {string} - The function name extracted from the transaction payload.
 */
const getTransactionFunctionName = (transaction: any, contractAddress?: string) => {
  const functionName =
    contractAddress && contractAddress === transaction?.payload?.type_arguments[0]
      ? transaction?.payload?.type_arguments[0]
      : contractAddress &&
        transaction?.payload?.type_arguments[0] === '0x1::fungible_asset::Metadata' &&
        transaction?.payload?.arguments[0]?.inner &&
        contractAddress === transaction?.payload?.arguments[0]?.inner
      ? contractAddress // sent back contract address as functionName when its fungible asset to match listing in final filter to auto update transaction list status
      : transaction?.payload?.type_arguments?.toString()?.toLowerCase()?.includes('aptos') ||
        transaction?.payload?.type_arguments?.length === 0
      ? ''
      : transaction?.payload?.type_arguments[0]
  return functionName
}

export const getAmountForAptosCoin = (data: any, contactAddress?: string) => {
  const targetCoinType = contactAddress || NATIVE_COINS.APTOS_COIN
  const coin = data.find((item: any) => item.coinType === targetCoinType)
  return coin ? coin.amount : 0
}
