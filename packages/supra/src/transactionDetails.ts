import {
  NetworkToken,
  SmartContract,
  TRANSACTION_TYPE,
  TransactionDetail,
  TransactionStatusCheckResult,
  addAddressPadding,
  sendRequest,
  sleep,
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
  smartContract: SmartContract | undefined,
) => {
  // let transactionDetail = null
  const version = asset.envType === 'mainNet' ? 'v1' : 'v3'
  let resData = await sendRequest(
    asset.providerNetworkRPC_URL,
    `/rpc/${version}/transactions/${transactionHash}`,
    null,
    true,
  )
  if (resData.data == null) {
    return null
  }

  // Added Patch to resolve inconsistencies issue of `rpc_node`
  const transactionDetail = buildTransactionDetail(resData.data, asset.address)
  const transactionData = transactionDetailFormation(transactionDetail, asset, smartContract)
  return transactionData
}

export const buildTransactionDetail = (data: any, walletAddress: string) => {
  // Added Patch to resolve inconsistencies issue of `rpc_node`
  if (data.status === TransactionStatus.Pending || data.output === null || data.header === null) {
    return {
      txHash: data?.hash,
      sender: data?.header?.sender?.Move,
      sequenceNumber: data?.header?.sequence_number,
      maxGasAmount: data?.header?.max_gas_amount,
      gasUnitPrice: data?.header?.gas_unit_price,
      gasUsed: undefined,
      transactionCost: undefined,
      txExpirationTimestamp: Number(data?.header?.expiration_timestamp?.microseconds_since_unix_epoch),
      txConfirmationTime: undefined,
      status: data?.status,
      events: undefined,
      blockNumber: undefined,
      blockHash: undefined,
      transactionInsights: getTransactionInsights(walletAddress, data),
      vmStatus: undefined,
      txnType: data?.txn_type,
      feePayerAddress: data?.authenticator?.Move?.FeePayer?.fee_payer_address,
    }
  }
  return {
    txHash: data?.hash,
    sender: data?.header?.sender?.Move,
    sequenceNumber: data?.header?.sequence_number,
    maxGasAmount: data?.header?.max_gas_amount,
    gasUnitPrice: data?.header?.gas_unit_price,
    gasUsed: data?.output?.Move?.gas_used,
    transactionCost: data?.header?.gas_unit_price * data?.output?.Move?.gas_used,
    txExpirationTimestamp: Number(data?.header?.expiration_timestamp?.microseconds_since_unix_epoch),
    txConfirmationTime: Number(data?.block_header?.timestamp?.microseconds_since_unix_epoch),
    status: data?.status == 'Fail' || data?.status == 'Invalid' ? 'Failed' : data?.status,
    events: data?.output?.Move?.events,
    blockNumber: data?.block_header?.height,
    blockHash: data?.block_header?.hash,
    transactionInsights: getTransactionInsights(walletAddress, data),
    vmStatus: data?.output?.Move?.vm_status,
    txnType: data?.txn_type,
    feePayerAddress: data?.authenticator?.Move?.FeePayer?.fee_payer_address,
  }
}

export const transactionDetailFormation = async (
  transactionDetail: TransactionDetail | null,
  asset: NetworkToken,
  smartContract: SmartContract | undefined,
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

  let vmStatus = transactionDetail?.vmStatus || ''
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
    txnType: transactionDetail?.txnType || null,
    feePayerAddress: transactionDetail?.feePayerAddress,
  }
  return txDetail
}

export const checkTransactionStatus = async (
  rpcUrl: string,
  txHash: string,
  envType: string | undefined,
  reTryCount: number = 0,
): Promise<TransactionStatusCheckResult | null> => {
  let tx = await getTransactionStatus(rpcUrl, txHash, envType)
  // 30 times re-try for check tx is not null
  if (tx === null && reTryCount > 30) {
    return null
  }
  if (tx === null || tx.status === 'Pending') {
    await sleep(500)
    return checkTransactionStatus(rpcUrl, txHash, envType, reTryCount + 1)
  }
  return tx
}

export const getTransactionStatus = async (
  rpcUrl: string,
  transactionHash: string,
  envType: string | undefined,
): Promise<TransactionStatusCheckResult | null> => {
  // -30 second buffer from the current time pending & * 1000000 for convert in epoch timestamp
  const txExpirationBeforeTimestamp = (Math.ceil(Date.now() / 1000) - 30) * 1000000
  const sanitizedRpcUrl = rpcUrl.endsWith('/') ? rpcUrl.slice(0, -1) : rpcUrl
  const version = envType === 'mainNet' ? 'v1' : 'v3'
  const response = await fetch(`${sanitizedRpcUrl}/rpc/${version}/transactions/${transactionHash}`, {
    method: 'GET',
  })
  const resData = { data: await response.json() }
  // NOTE ::  Submitted transaction in v1 of testnet and trying to get it from v3 it take some time to display transaction here so set this condition
  // if (version === 'v3' && response.status === 404) {
  //   return {
  //     status: 'Pending',
  //   }
  // }
  if (resData.data == null) {
    return null
  }
  if (resData?.data?.header === null) {
    return {
      status: 'Pending',
    }
  }
  let status =
    resData.data.status == 'Unexecuted'
      ? 'Pending'
      : resData.data.status == 'Fail' || resData.data.status == 'Invalid'
        ? 'Failed'
        : resData.data.status
  let vmStatus = resData.data?.output?.Move?.vm_status || ''

  const txExpirationTimestamp = Number(resData.data.header?.expiration_timestamp.microseconds_since_unix_epoch)
  if (
    (resData.data.status === 'Pending' || resData.data.status === 'Invalid') &&
    txExpirationTimestamp &&
    txExpirationTimestamp < txExpirationBeforeTimestamp
  ) {
    status = 'Failed'
    vmStatus = 'Discarded with error code: TRANSACTION_EXPIRED'
  }
  return {
    hash: transactionHash,
    status,
    vmStatus,
  }
}
