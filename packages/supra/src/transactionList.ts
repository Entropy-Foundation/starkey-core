import { buildUrl, sendRequest, TransactionDetail } from '@starkey/utils'
import { CoinChange, TransactionInsights, TransactionStatus, TxTypeForTransactionInsights } from 'supra-l1-sdk'

/**
 * Get transactions sent by the account and Coin transfer related transactions
 * @param account Supra account address
 * @param count Number of coin transfer transactions and account sent transaction to be considered,
 * For instance if the value is `N` so total `N*2` transactions will be returned.
 * @returns List of `TransactionDetail`
 */

export const getTransactionInsights = (userAddress: string, txData: any): TransactionInsights => {
  let txInsights: TransactionInsights = {
    coinReceiver: '',
    coinChange: [
      {
        amount: BigInt(0),
        coinType: '',
      },
    ],
    type: TxTypeForTransactionInsights.EntryFunctionCall,
  }

  // NOTE: Need to optimize this conditionals
  if (txData?.payload?.Move?.type === 'entry_function_payload') {
    if (txData?.payload?.Move?.function === '0x1::supra_account::transfer') {
      let amountChange = BigInt(txData?.payload?.Move?.arguments[1])
      if (userAddress === txData?.header?.sender?.Move) {
        amountChange *= BigInt(-1)
      }
      txInsights.coinReceiver = txData?.payload?.Move?.arguments[0]
      txInsights.coinChange[0] = {
        amount: amountChange,
        coinType: '0x1::supra_coin::SupraCoin',
      }
      txInsights.type = TxTypeForTransactionInsights.CoinTransfer
    } else if (
      txData?.payload?.Move?.function === '0x1::supra_account::transfer_coins' ||
      txData?.payload?.Move?.function === '0x1::coin::transfer'
    ) {
      let amountChange = BigInt(txData?.payload?.Move?.arguments[1])
      if (userAddress === txData?.header?.sender?.Move) {
        amountChange *= BigInt(-1)
      }
      txInsights.coinReceiver = txData?.payload?.Move?.arguments[0]
      txInsights.coinChange[0] = {
        amount: amountChange,
        coinType: txData?.payload?.Move?.type_arguments[0],
      }
      txInsights.type = TxTypeForTransactionInsights.CoinTransfer
    } else {
      if (txData?.status === TransactionStatus.Success) {
        txInsights.coinChange = getCoinChangeAmount(userAddress, txData?.output?.Move?.events)
      }
    }
  } else {
    if (txData?.payload?.Move?.type === 'script_payload') {
      txInsights.type = TxTypeForTransactionInsights.ScriptCall
    } else if (txData?.payload?.Move?.type === 'automation_registration_payload') {
      txInsights.type = TxTypeForTransactionInsights.AutomationRegistration
    } else {
      throw new Error('something went wrong, found unsupported type of transaction')
    }

    if (txData?.status === TransactionStatus.Success) {
      txInsights.coinChange = getCoinChangeAmount(userAddress, txData?.output?.Move?.events)
    }
  }
  return txInsights
}
const getCoinChangeAmount = (userAddress: string, events: any[]): Array<CoinChange> => {
  let coinChange: Map<
    string,
    {
      totalDeposit: bigint
      totalWithdraw: bigint
    }
  > = new Map()
  events.forEach((eventData) => {
    if (
      (eventData.type === '0x1::coin::CoinDeposit' || eventData.type === '0x1::coin::CoinWithdraw') &&
      '0x' + eventData.data.account.substring(2, eventData.data.account).padStart(64, '0') === userAddress
    ) {
      if (eventData.type === '0x1::coin::CoinDeposit') {
        let curData = coinChange.get(eventData.data.coin_type)
        if (curData != undefined) {
          coinChange.set(eventData.data.coin_type, {
            totalDeposit: curData.totalDeposit + BigInt(eventData.data.amount),
            totalWithdraw: curData.totalWithdraw,
          })
        } else {
          coinChange.set(eventData.data.coin_type, {
            totalDeposit: BigInt(eventData.data.amount),
            totalWithdraw: BigInt(0),
          })
        }
      } else if (eventData.type === '0x1::coin::CoinWithdraw') {
        let curData = coinChange.get(eventData.data.coin_type)
        if (curData != undefined) {
          coinChange.set(eventData.data.coin_type, {
            totalDeposit: curData.totalDeposit,
            totalWithdraw: curData.totalWithdraw + BigInt(eventData.data.amount),
          })
        } else {
          coinChange.set(eventData.data.coin_type, {
            totalDeposit: BigInt(0),
            totalWithdraw: BigInt(eventData.data.amount),
          })
        }
      }
    }
  })
  let coinChangeParsed: CoinChange[] = []
  coinChange.forEach(
    (
      value: {
        totalDeposit: bigint
        totalWithdraw: bigint
      },
      key: string
    ) => {
      coinChangeParsed.push({
        coinType: key,
        amount: value.totalDeposit - value.totalWithdraw,
      })
    }
  )
  return coinChangeParsed
}
export const getAccountCompleteTransactionsDetail = async (
  rpcURL: string,
  userAddress: string,
  subUrl: string | undefined,
  count: number = 15
): Promise<TransactionDetail[]> => {
  let coinTransactions = await sendRequest(
    buildUrl(rpcURL),
    buildUrl(`${subUrl}/coin_transactions?count=${count}`),
    null,
    true
  )
  //sendRequestToGetTransaction(true, `/rpc/v3/accounts/${userAddress.toString()}/coin_transactions?count=${count}`)
  let accountSendedTransactions = await sendRequest(
    buildUrl(rpcURL),
    buildUrl(`${subUrl}/transactions?count=${count}`),
    null,
    true
  )
  // sendRequestToGetTransaction(true, `/rpc/v3/accounts/${userAddress.toString()}/transactions?count=${count}`)

  let combinedTxArray: any[] = []
  if (coinTransactions.data != null) {
    combinedTxArray.push(...coinTransactions.data)
  }
  if (accountSendedTransactions.data.record != null) {
    combinedTxArray.push(...accountSendedTransactions.data.record)
  }
  let combinedTx = combinedTxArray.filter(
    (item, index, self) => index === self.findIndex((data) => data.hash === item.hash)
  )
  combinedTx.sort((a, b) => {
    if (
      a.block_header.timestamp.microseconds_since_unix_epoch < b.block_header.timestamp.microseconds_since_unix_epoch
    ) {
      return 1
    } else {
      return -1
    }
  })

  let coinTransactionsDetail: TransactionDetail[] = []
  combinedTx.forEach((data: any, index: number) => {
    if (data.txn_type === 'automated' || data.txn_type === 'user') {
      coinTransactionsDetail.push({
        txHash: data?.hash,
        sender: data?.header?.sender?.Move,
        sequenceNumber: data?.header?.sequence_number,
        maxGasAmount: data?.header?.max_gas_amount,
        gasUnitPrice: data?.header?.gas_unit_price,
        gasUsed: data?.output?.Move?.gas_used,
        transactionCost: data?.header?.gas_unit_price * data?.output?.Move?.gas_used,
        txExpirationTimestamp: Number(data?.header?.expiration_timestamp?.microseconds_since_unix_epoch),
        txConfirmationTime: Number(data?.block_header?.timestamp.microseconds_since_unix_epoch),
        status: data?.status === 'Fail' || data?.status === 'Invalid' ? 'Failed' : data?.status,
        events: data?.output?.Move?.events,
        blockNumber: data?.block_header?.height,
        blockHash: data?.block_header?.hash,
        transactionInsights: getTransactionInsights(userAddress, data),
        vm_status: data?.output?.Move?.vm_status,
        txn_type: data.txn_type,
      })
    }
  })
  return coinTransactionsDetail
}
