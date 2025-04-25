import { TransactionDetail, sendRequest } from '@starkey/utils'
import { TransactionStatus } from 'supra-l1-sdk'
import { getTransactionInsights } from './transactionList'
/**
 * Get transaction details of given transaction hash
 * @param userAddress Supra user address
 * @param transactionHash transaction hash for getting transaction details
 * @returns `TransactionDetail`
 */
export const getTransactionDetail = async (
  rpcURL: string,
  transactionHash: string,
  userAddress: string,
  subUrl: string | undefined
): Promise<TransactionDetail | null> => {
  let resData = await sendRequest(rpcURL, `${subUrl}/transactions/${transactionHash}`, null, true)
  if (resData.data == null) {
    return null
  }

  // Added Patch to resolve inconsistencies issue of `rpc_node`
  if (
    resData.data.status === TransactionStatus.Pending ||
    resData.data.output === null ||
    resData.data.header === null
  ) {
    return {
      txHash: transactionHash,
      sender: resData.data.header.sender.Move,
      sequenceNumber: resData.data.header.sequence_number,
      maxGasAmount: resData.data.header.max_gas_amount,
      gasUnitPrice: resData.data.header.gas_unit_price,
      gasUsed: undefined,
      transactionCost: undefined,
      txExpirationTimestamp: Number(resData.data.header.expiration_timestamp.microseconds_since_unix_epoch),
      txConfirmationTime: undefined,
      status: resData.data.status,
      events: undefined,
      blockNumber: undefined,
      blockHash: undefined,
      transactionInsights: getTransactionInsights(userAddress, resData.data),
      vm_status: undefined,
      txn_type: resData.data.txn_type,
    }
  }
  return {
    txHash: transactionHash,
    sender: resData.data.header.sender.Move,
    sequenceNumber: resData.data.header.sequence_number,
    maxGasAmount: resData.data.header.max_gas_amount,
    gasUnitPrice: resData.data.header.gas_unit_price,
    gasUsed: resData.data.output?.Move.gas_used,
    transactionCost: resData.data.header.gas_unit_price * resData.data.output?.Move.gas_used,
    txExpirationTimestamp: Number(resData.data.header.expiration_timestamp.microseconds_since_unix_epoch),
    txConfirmationTime: Number(resData.data.block_header.timestamp.microseconds_since_unix_epoch),
    status: resData.data.status == 'Fail' || resData.data.status == 'Invalid' ? 'Failed' : resData.data.status,
    events: resData.data.output?.Move.events,
    blockNumber: resData.data.block_header.height,
    blockHash: resData.data.block_header.hash,
    transactionInsights: getTransactionInsights(userAddress, resData.data),
    vm_status: resData.data.output.Move.vm_status,
    txn_type: resData.data.txn_type,
  }
}
