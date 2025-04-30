import {
  NetworkToken,
  SmartContract,
  TRANSACTION_TYPE,
  TransactionDetail,
  addAddressPadding,
  sendRequest,
} from '@starkey/utils'
import { ethers } from 'ethers'
import { TransactionStatus } from 'supra-l1-sdk'
import { getTransactionInsights, getTransationTypeAndValue } from './transactionList'

/**
 * Get transaction details of given transaction hash
 * @param walletAddress Supra user's wallet address
 * @param transactionHash transaction hash for getting transaction details
 * @returns `TransactionDetail`
 */
export const getTransactionDetail = async (
  asset: NetworkToken,
  transactionHash: string,
  smartContract: SmartContract | undefined
) => {
  let transactionDetail = null
  const version = asset.envType === 'mainNet' ? 'v1' : 'v3'
  let resData = await sendRequest(
    asset.providerNetworkRPC_URL,
    `/rpc/${version}/transactions/${transactionHash}`,
    null,
    true
  )
  if (resData.data == null) {
    return null
  }

  // Added Patch to resolve inconsistencies issue of `rpc_node`
  if (
    resData.data.status === TransactionStatus.Pending ||
    resData.data.output === null ||
    resData.data.header === null
  ) {
    transactionDetail = {
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
      transactionInsights: getTransactionInsights(asset.address, resData.data),
      vm_status: undefined,
      txn_type: resData.data.txn_type,
    }
  }
  transactionDetail = {
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
    transactionInsights: getTransactionInsights(asset.address, resData.data),
    vm_status: resData.data.output.Move.vm_status,
    txn_type: resData.data.txn_type,
  }
  const transactionData = transactionDetailFormation(transactionDetail, asset, smartContract)
  return transactionData
}

export const transactionDetailFormation = async (
  transactionDetail: TransactionDetail | null,
  asset: NetworkToken,
  smartContract: SmartContract | undefined
) => {
  if (!transactionDetail) {
    return null
  }
  // -30 second buffer from the current time pending & * 1000000 for convert in epoch timestamp
  const txExpirationBeforeTimestamp = (Math.ceil(Date.now() / 1000) - 30) * 1000000

  let transactionType = TRANSACTION_TYPE.TRANSACTION
  const coinType = asset.tokenContractAddress ? asset.tokenContractAddress : '0x1::supra_coin::SupraCoin'
  let value: string | number = '0'
  if (transactionDetail?.transactionInsights?.type === 'CoinTransfer') {
    transactionType = TRANSACTION_TYPE.SEND_RECEIVED
    const coinAmountObj = transactionDetail?.transactionInsights?.coinChange.find((item) => item.coinType === coinType)
    const amount = coinAmountObj ? Math.abs(Number(coinAmountObj.amount)) : '0'
    value = ethers.formatUnits(amount.toString(), asset.decimal)
  } else if (transactionDetail?.transactionInsights?.type === 'EntryFunctionCall') {
    const data = getTransationTypeAndValue({
      transaction: transactionDetail,
      asset,
      coinType,
      transactionType,
      value,
      smartContract,
    })
    if (data) {
      transactionType = data.transactionType
      value = data.value
    } else {
      return null
    }
  } else {
    const coinAmountObj = transactionDetail?.transactionInsights?.coinChange.find((item) => item.coinType === coinType)
    const amount = coinAmountObj ? coinAmountObj.amount : '0'
    value = ethers.formatUnits(amount.toString(), asset.decimal)
  }

  let vmStatus = transactionDetail?.vm_status || ''
  let status = transactionDetail?.status || ''

  // const txExpirationBeforeTimestamp = Math.ceil(Date.now() / 1000) - 60 // -60 second buffer from the current time pending
  if (
    status === TransactionStatus.Pending &&
    transactionDetail.txExpirationTimestamp &&
    transactionDetail.txExpirationTimestamp < txExpirationBeforeTimestamp
  ) {
    status = TransactionStatus.Failed
    vmStatus = 'Discarded with error code: TRANSACTION_EXPIRED'
  }

  const txDetail = {
    blockNumber: transactionDetail?.blockNumber ? transactionDetail.blockNumber : '',
    time: transactionDetail?.txConfirmationTime ? Number(transactionDetail?.txConfirmationTime) / 1000000 : '', //Math.floor(new Date(Number(transactionDetail?.confirmation_time ?? 0) / 1000).getTime() / 1000),
    hash: transactionDetail?.txHash ? transactionDetail?.txHash : '',
    nonce: '',
    from: transactionDetail?.sender ? addAddressPadding(transactionDetail?.sender) : '',
    to: transactionDetail?.transactionInsights?.coinReceiver
      ? addAddressPadding(transactionDetail?.transactionInsights?.coinReceiver)
      : '',
    value: value,
    gas: transactionDetail?.gasUsed ?? '0',
    gasPrice: transactionDetail?.gasUnitPrice ?? 0,
    confirmations: 0,
    wait: 0,
    gasLimit: '',
    data: '',
    chainId: '',
    status,
    networkFees:
      transactionDetail?.gasUsed && transactionDetail?.gasUnitPrice
        ? ethers.formatUnits((transactionDetail?.gasUnitPrice * transactionDetail?.gasUsed).toString(), 8)
        : 0, //ethers.formatEther(TRANSACTION.NETWORK_FEE),
    title: asset.title,
    transactionType,
    vmStatus,
    tokenDecimal: asset.decimal,
    txn_type: transactionDetail?.txn_type || null,
  }
  return txDetail
}
