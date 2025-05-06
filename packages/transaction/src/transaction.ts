import { getAptosTransactionDetail, getAptosTransactions } from '@starkey/aptos'
import { checkEthTransactionStatus, getEthTransactionDetail, getEthTransactions } from '@starkey/eth'
import { checkTransactionStatus, getAccountCompleteTransactionsDetail, getTransactionDetail } from '@starkey/supra'
import {
  CheckTransactionStatusReqParams,
  TransactionDetailRequestParams,
  TransactionListRequestParams,
} from '@starkey/utils'

export async function getTransactionList(params: TransactionListRequestParams) {
  let transactionList
  if (
    params.asset.walletNetworkName === 'SUP' ||
    params.asset.networkName === 'SUP' ||
    params.asset.networkName === 'Supra'
  ) {
    transactionList = await getAccountCompleteTransactionsDetail(params.asset, params.smartContract, params.count)
  } else if (params.asset.walletNetworkName === 'ETH' || params.asset.isEVMNetwork) {
    transactionList = await getEthTransactions(params.asset, params.apiKey)
  } else if (params.asset.walletNetworkName === 'APT' || params.asset.networkName === 'APT') {
    transactionList = await getAptosTransactions(params.asset)
  }
  return transactionList
}

export async function getTransactionDetailByHash(params: TransactionDetailRequestParams) {
  let transactionDetail
  if (
    params.asset.walletNetworkName === 'SUP' ||
    params.asset.networkName === 'SUP' ||
    params.asset.networkName === 'Supra'
  ) {
    transactionDetail = await getTransactionDetail(params.asset, params.transactionHash, params.smartContract)
  } else if (params.asset.walletNetworkName === 'ETH' || params.asset.isEVMNetwork) {
    transactionDetail = await getEthTransactionDetail(params.transactionHash, params.asset)
  } else if (params.asset.walletNetworkName === 'APT' || params.asset.networkName === 'APT') {
    transactionDetail = await getAptosTransactionDetail(params.transactionHash, params.asset)
  }
  return transactionDetail
}

export async function checkTransactionCompletionAndExpired(params: CheckTransactionStatusReqParams) {
  let transactionStatusData = null
  if (params.network === 'SUP' || params.network === 'Supra') {
    transactionStatusData = await checkTransactionStatus(
      params.rpcUrl,
      params.txHash,
      params.envType,
      params.reTryCount
    )
  } else if (params.network === 'ETH') {
    transactionStatusData = await checkEthTransactionStatus(params.rpcUrl, params.txHash, params.chainId)
  }
  return transactionStatusData
}
