import {
  GetTransationTypeAndValueParams,
  NATIVE_COINS,
  NetworkToken,
  SUPRA_EVENT_TYPES,
  SmartContract,
  TRANSACTION_TYPE,
  TransactionDetail,
  addAddressPadding,
  sendRequest,
} from '@starkey/utils'
import { ethers } from 'ethers'
import { CoinChange, TransactionInsights, TransactionStatus, TxTypeForTransactionInsights } from 'supra-l1-sdk'
import { buildTransactionDetail } from './transactionDetails'

/**
 * Get transactions sent by the account and Coin transfer related transactions
 * @param account Supra account address
 * @param count Number of coin transfer transactions and account sent transaction to be considered,
 * For instance if the value is `N` so total `N*2` transactions will be returned.
 * @returns List of `TransactionDetail`
 */

export const getTransactionInsights = (walletAddress: string, txData: any): TransactionInsights => {
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
      if (walletAddress === txData?.header?.sender?.Move) {
        amountChange *= BigInt(-1)
      }
      txInsights.coinReceiver = txData?.payload?.Move?.arguments[0]
      txInsights.coinChange[0] = {
        amount: amountChange,
        coinType: NATIVE_COINS.SUPRA_COIN,
      }
      txInsights.type = TxTypeForTransactionInsights.CoinTransfer
    } else if (
      txData?.payload?.Move?.function === '0x1::supra_account::transfer_coins' ||
      txData?.payload?.Move?.function === '0x1::coin::transfer'
    ) {
      let amountChange = BigInt(txData?.payload?.Move?.arguments[1])
      if (walletAddress === txData?.header?.sender?.Move) {
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
        txInsights.coinChange = getCoinChangeAmount(walletAddress, txData?.output?.Move?.events)
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
      txInsights.coinChange = getCoinChangeAmount(walletAddress, txData?.output?.Move?.events)
    }
  }
  return txInsights
}
const getCoinChangeAmount = (walletAddress: string, events: any[]): Array<CoinChange> => {
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
      '0x' + eventData.data.account.substring(2, eventData.data.account).padStart(64, '0') === walletAddress
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
  asset: NetworkToken,
  smartContract?: SmartContract,
  count: number = 15
): Promise<any[]> => {
  const version = asset?.envType === 'mainNet' ? 'v1' : 'v3'
  let coinTransactions = await sendRequest(
    asset?.providerNetworkRPC_URL,
    `/rpc/${version}/accounts/${asset?.address}/coin_transactions?count=${count}`,
    null,
    true
  )
  let accountSendedTransactions = await sendRequest(
    asset?.providerNetworkRPC_URL,
    `/rpc/${version}/accounts/${asset?.address}/transactions?count=${count}`,
    null,
    true
  )
  let combinedTxArray: any[] = []
  if (version === 'v1' && coinTransactions?.data?.record != null) {
    combinedTxArray.push(...coinTransactions.data.record)
  } else if (version === 'v3' && coinTransactions?.data != null) {
    combinedTxArray.push(...coinTransactions.data)
  }

  if (version === 'v1' && accountSendedTransactions?.data?.record != null) {
    combinedTxArray.push(...accountSendedTransactions.data.record)
  } else if (version === 'v3' && accountSendedTransactions?.data != null) {
    combinedTxArray.push(...accountSendedTransactions.data)
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

  let transactionVersion: TransactionDetail[] = []
  combinedTx.forEach((data: any) => {
    if (version === 'v1' ? !data.txn_type : data.txn_type === 'automated' || data.txn_type === 'user') {
      transactionVersion.push(buildTransactionDetail(data, asset?.address))
    }
  })
  const transactions = await transactionListFormation(asset, transactionVersion, smartContract)
  return transactions
}

const transactionListFormation = async (
  asset: NetworkToken,
  transactionVersion: TransactionDetail[],
  smartContract: SmartContract | undefined
) => {
  const transactionsPromises = transactionVersion?.map(async (transaction) => {
    let value: string | number = '0'
    let transactionType = TRANSACTION_TYPE.TRANSACTION
    const coinType = asset.tokenContractAddress ? asset.tokenContractAddress : NATIVE_COINS.SUPRA_COIN
    if (transaction?.transactionInsights?.type === 'CoinTransfer') {
      transactionType = TRANSACTION_TYPE.SEND_RECEIVED
      const coinAmountObj = transaction?.transactionInsights?.coinChange.find((item) => item.coinType === coinType)
      if (!coinAmountObj) {
        return null
      }
      const amount = coinAmountObj ? Math.abs(Number(coinAmountObj.amount)) : '0'
      value = ethers.formatUnits(amount.toString(), asset.decimal)
    } else if (transaction?.transactionInsights?.type === 'EntryFunctionCall') {
      const data = getTransationTypeAndValue({
        transaction,
        asset,
        coinType,
        transactionType,
        value,
        smartContract,
      })
      if (data) {
        if (
          //NOTE : as of now return another transaction because fungible assets not giving contract & sender or receiver details
          data.transactionType !== TRANSACTION_TYPE.SEND_RECEIVED &&
          asset.tokenContractAddress &&
          !asset.tokenContractAddress.includes('::')
        ) {
          return null
        }
        transactionType = data.transactionType
        value = data.value
      } else {
        return null
      }
    } else {
      const coinAmountObj = transaction?.transactionInsights?.coinChange.find((item) => item.coinType === coinType)
      if (!coinAmountObj) {
        return null
      }
      const amount = coinAmountObj ? coinAmountObj.amount : '0'
      value = ethers.formatUnits(amount.toString(), asset.decimal)
    }

    return {
      blockNumber: transaction?.blockNumber ? transaction.blockHash : '',
      time: transaction?.txConfirmationTime ? Number(transaction.txConfirmationTime) / 1000000 : '',
      hash: transaction?.txHash ? transaction.txHash : '',
      nonce: '',
      from: transaction?.sender ? addAddressPadding(transaction.sender) : '',
      to: transaction?.transactionInsights.coinReceiver
        ? addAddressPadding(transaction.transactionInsights?.coinReceiver)
        : '',
      value: value,
      gas: transaction?.gasUsed ?? '0',
      gasPrice: transaction?.gasUnitPrice ?? '0',
      status: transaction?.status ? transaction.status : '',
      transactionType,
      vmStatus: transaction?.vmStatus || '',
      txnType: transaction?.txnType || null,
    }
  })
  const transactions = (await Promise.all(transactionsPromises)).filter((obj) => obj !== null)

  return transactions
}

export const getTransationTypeAndValue = ({
  transaction,
  asset,
  coinType,
  transactionType,
  value,
  smartContract,
}: GetTransationTypeAndValueParams) => {
  const moduleAddressGenesisVault = smartContract?.genesis
  if (asset.tokenContractAddress && asset.tokenContractAddress.includes('::')) {
    const coinAmountObj = transaction?.transactionInsights?.coinChange.find((item: any) => item.coinType === coinType)
    if (!coinAmountObj) {
      return null
    }
    const amount = coinAmountObj ? coinAmountObj.amount : '0'
    value = ethers.formatUnits(amount.toString(), asset.decimal)
  } else if (!asset.tokenContractAddress) {
    // return if native token have gasfee entry for fungible asset
    const fungibleWithdraw = transaction.events.filter(
      (event: any) => event.type === SUPRA_EVENT_TYPES.FUNCTION_WITHDRAW_EVENT
    )
    if (fungibleWithdraw && fungibleWithdraw.length) {
      return null
    }
  }

  if (!transaction?.transactionInsights?.coinChange.length && transaction.transactionCost) {
    value = `-${ethers.formatUnits(transaction.transactionCost.toString(), asset.decimal)}` // Make it negative as its minuse from balance display icon accordingly
  }

  let stakeEventTypeExists
  let unloackEventTypeExists
  let unstakeEventTypeExists
  let vestingWithoutStake
  let genesisVaultStake
  let kycDepositValue
  let depositEvent
  let fungibleWithdraw
  if (transaction?.events) {
    stakeEventTypeExists = transaction.events.find(
      (event: any) =>
        event.type === SUPRA_EVENT_TYPES.ADD_STAKE_EVENT &&
        addAddressPadding(event.data.delegator_address) === asset.address
    )
    if (stakeEventTypeExists) {
      transactionType = TRANSACTION_TYPE.STAKE
      const amountAdded = stakeEventTypeExists.data.amount_added
      value = ethers.formatUnits(amountAdded.toString(), asset.decimal)
    }
    unloackEventTypeExists = transaction.events.find(
      (event: any) =>
        event.type === SUPRA_EVENT_TYPES.UNLOCK_STAKE_EVENT &&
        addAddressPadding(event.data.delegator_address) === asset.address
    )
    if (unloackEventTypeExists) {
      transactionType = TRANSACTION_TYPE.REQUEST_TO_UNSTAKE
      const amountUnlocked = unloackEventTypeExists.data.amount_unlocked
      value = ethers.formatUnits(amountUnlocked.toString(), asset.decimal)
    }
    unstakeEventTypeExists = transaction.events.find(
      (event: any) =>
        event.type === SUPRA_EVENT_TYPES.WITHDRAW_STAKE_EVENT &&
        addAddressPadding(event.data.delegator_address) === asset.address
    )
    if (unstakeEventTypeExists) {
      transactionType = TRANSACTION_TYPE.UNSTAKE
      const amountWithdrawn = unstakeEventTypeExists.data.amount_withdrawn
      value = ethers.formatUnits(amountWithdrawn.toString(), asset.decimal)
    }
    vestingWithoutStake = transaction.events.find(
      (event: any) =>
        event.type === SUPRA_EVENT_TYPES.VEST_EVENT &&
        addAddressPadding(event.data.shareholder_address) === asset.address
    )
    if (vestingWithoutStake) {
      const vestingAmount = transaction?.transactionInsights?.coinChange.find((item: any) => item.coinType === coinType)
      if (!vestingAmount) {
        return null
      }
      const amount = vestingAmount ? vestingAmount.amount : '0'
      value = ethers.formatUnits(amount.toString(), asset.decimal)
    }
    genesisVaultStake = transaction.events.find(
      (event: any) =>
        event.type === moduleAddressGenesisVault + SUPRA_EVENT_TYPES.GENESIS_VAULT_USER_DEPOSIT_EVENT &&
        addAddressPadding(event.data.user_address) === asset.address
    )
    if (genesisVaultStake) {
      const genesisAmount = genesisVaultStake.data.deposit_amount
      value = `-${ethers.formatUnits(genesisAmount.toString(), asset.decimal)}`
    }
    kycDepositValue = transaction.events.find(
      (event: any) =>
        event.type === SUPRA_EVENT_TYPES.KYC_DEPOSIT_SUPRA_VALUT_EVENT &&
        addAddressPadding(event.data.user_account) === asset.address
    )
    if (kycDepositValue) {
      const genesisAmount = kycDepositValue.data.deposit_amount
      value = `-${ethers.formatUnits(genesisAmount.toString(), asset.decimal)}`
    }
    depositEvent = transaction.events.filter(
      (event: any) =>
        event.type === SUPRA_EVENT_TYPES.COIN_DEPOSIT_EVENT &&
        addAddressPadding(event.data.account) === asset.address &&
        event.data.coin_type === coinType
    )

    if (depositEvent.length > 0) {
      const depositAmount = depositEvent.reduce((sum: number, event: any) => sum + parseInt(event.data.amount), 0)
      value = `${ethers.formatUnits(depositAmount.toString(), asset.decimal)}`
    }

    fungibleWithdraw = transaction.events.filter(
      (event: any) => event.type === SUPRA_EVENT_TYPES.FUNCTION_WITHDRAW_EVENT
    )

    if (fungibleWithdraw.length > 0) {
      transactionType = TRANSACTION_TYPE.SEND_RECEIVED
      const fungibleWithdrawAmount = fungibleWithdraw[0].data.amount
      value = `-${ethers.formatUnits(fungibleWithdrawAmount.toString(), asset.decimal)}`
    }
  }

  if (
    !transaction?.transactionInsights?.coinChange.length &&
    !stakeEventTypeExists &&
    !unloackEventTypeExists &&
    !unstakeEventTypeExists &&
    !vestingWithoutStake &&
    !genesisVaultStake &&
    !fungibleWithdraw
  ) {
    value = `-${ethers.formatUnits(
      transaction.transactionCost ? transaction.transactionCost.toString() : '0',
      asset.decimal
    )}` // Make it negative as its minuse from balance display icon accordingly
  } else if (transaction?.transactionInsights?.coinChange.length) {
    const coinAmountObj = transaction?.transactionInsights?.coinChange.find(
      (item: any) => item.coinType === coinType.trim()
    )
    const amount = coinAmountObj ? coinAmountObj.amount : '0'
    value = ethers.formatUnits(amount.toString(), asset.decimal)
  }
  return { value, transactionType }
}
