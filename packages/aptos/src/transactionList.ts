import { NATIVE_COINS, NetworkToken, ReturnTransactionData } from '@starkey/utils'
import * as aptos from 'aptos'
import { getTransactionData } from './transactionDetail'

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
      const { toAddress, transactionType, transferredAmount } = await getTransactionData(client, transaction, asset)

      return {
        blockNumber: undefined,
        time: transaction?.timestamp
          ? Math.floor(new Date(Number(transaction?.timestamp ?? 0) / 1000).getTime() / 1000)
          : '',
        hash: transaction?.hash,
        nonce: undefined,
        from: transaction?.sender,
        to: toAddress,
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
  const typeArgs = transaction?.payload?.type_arguments ?? []
  const args = transaction?.payload?.arguments ?? []
  if (contractAddress && contractAddress === typeArgs[0]) {
    return contractAddress
  }

  const isFungibleAsset =
    contractAddress && typeArgs[0] === '0x1::fungible_asset::Metadata' && args[0]?.inner === contractAddress

  if (isFungibleAsset) {
    return contractAddress // sent back contract address as functionName when its fungible asset to match listing in final filter to auto update transaction list status
  }

  const isAptTransfer = typeArgs.toString().toLowerCase().includes('aptos') || typeArgs.length === 0
  if (isAptTransfer) {
    return ''
  }

  return typeArgs[0] ?? ''
}

export const getAmountForAptosCoin = (data: any, contactAddress?: string) => {
  const targetCoinType = contactAddress ?? NATIVE_COINS.APTOS_COIN
  const coin = data.find((item: any) => item.coinType === targetCoinType)
  return coin?.amount ?? 0
}
