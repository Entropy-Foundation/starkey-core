import { getAccountCompleteTransactionsDetail } from '@starkey/supra'
import { TransactionListRequestParams } from '@starkey/utils'

export async function getTransactionList(params: TransactionListRequestParams) {
  let transactionList
  if (params.asset.walletNetworkName === 'SUP' || params.asset.networkName === 'SUP') {
    transactionList = await getAccountCompleteTransactionsDetail(
      params.rpcURL,
      params.userAddress,
      params.subUrl,
      params.recordsCount
    )
  }
  return transactionList
}
