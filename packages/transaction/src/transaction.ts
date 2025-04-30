import { getAccountCompleteTransactionsDetail, getTransactionDetail } from '@starkey/supra'
import { TransactionDetailRequestParams, TransactionListRequestParams } from '@starkey/utils'

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
    transactionDetail = await getTransactionDetail(
      params.rpcURL,
      params.transactionHash,
      params.asset.address,
      params.asset.envType
    )
  }
  return transactionDetail
}
