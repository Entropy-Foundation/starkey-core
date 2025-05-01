import { checkTransactionStatus, getAccountCompleteTransactionsDetail, getTransactionDetail } from '@starkey/supra'
import {
  CheckTransactionStatusReqParams,
  TransactionDetailRequestParams,
  TransactionListRequestParams,
} from '@starkey/utils'

export async function getTransactionList(params: TransactionListRequestParams) {
  let transactionList
  if (params.asset.walletNetworkName === 'SUP' || params.asset.networkName === 'SUP') {
    transactionList = await getAccountCompleteTransactionsDetail(params.asset, params.smartContract, params.count)
  }
  return transactionList
}

export async function getTransactionDetailByHash(params: TransactionDetailRequestParams) {
  let transactionDetail
  if (params.asset.walletNetworkName === 'SUP' || params.asset.networkName === 'SUP') {
    transactionDetail = await getTransactionDetail(params.asset, params.transactionHash, params.smartContract)
  }
  return transactionDetail
}

export async function checkTransactionCompletionAndExpired(params: CheckTransactionStatusReqParams) {
  let transactionStatusData = null
  if (params.network === 'SUP') {
    transactionStatusData = await checkTransactionStatus(
      params.rpcUrl,
      params.txHash,
      params.envType,
      params.reTryCount
    )
  }
  return transactionStatusData
}
