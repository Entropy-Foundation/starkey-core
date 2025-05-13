import * as aptos from 'aptos'

const COIN_STORE_TYPE = '0x1::coin::CoinStore'
const DEPOSIT_EVENT_TYPE = '0x1::coin::DepositEvent'
const WITHDRAW_EVENT_TYPE = '0x1::coin::WithdrawEvent'

type CoinActivity = {
  coinType: string
  depositCreationNum: string
  withdrawCreationNum: string
  totalDeposit: number
  totalWithdraw: number
}

type CoinChange = {
  coinType: string
  amount: number
}

const processTxData = (
  senderAddress: string,
  changes: Array<aptos.Types.WriteSetChange>,
  events: Array<aptos.Types.Event>
): Array<CoinActivity> => {
  let coinActivity: CoinActivity[] = []
  changes.forEach((change: aptos.Types.WriteSetChange) => {
    if (change.type === 'write_resource') {
      let resourceChange = change as aptos.Types.WriteResource
      if (resourceChange.address === senderAddress && resourceChange.data.type.includes(COIN_STORE_TYPE)) {
        let changeMoveStruct = resourceChange.data.data as any
        coinActivity.push({
          coinType: resourceChange.data.type,
          depositCreationNum: changeMoveStruct.deposit_events.guid.id.creation_num,
          withdrawCreationNum: changeMoveStruct.withdraw_events.guid.id.creation_num,
          totalDeposit: 0,
          totalWithdraw: 0,
        })
      }
    }
  })

  coinActivity.forEach((coinActivityData) => {
    events.forEach((event) => {
      if (senderAddress == event.guid.account_address) {
        if (event.type === DEPOSIT_EVENT_TYPE && coinActivityData.depositCreationNum === event.guid.creation_number) {
          coinActivityData.totalDeposit += parseInt(event.data.amount)
        } else if (
          event.type === WITHDRAW_EVENT_TYPE &&
          coinActivityData.withdrawCreationNum === event.guid.creation_number
        ) {
          coinActivityData.totalWithdraw += parseInt(event.data.amount)
        }
      }
    })
  })
  return coinActivity
}

export const getTxInsight = async (client: aptos.AptosClient, txnVersion: number, address: string) => {
  let txData = await client.getTransactionByVersion(txnVersion)
  if (txData.type !== 'user_transaction') {
    throw new Error('Invalid Tx Type')
  }
  let typedTxData = txData as aptos.Types.Transaction_UserTransaction
  let coinChangeData: CoinChange[] = []
  processTxData(address, typedTxData.changes, typedTxData.events).forEach((change) => {
    coinChangeData.push({
      coinType: change.coinType.substring(change.coinType.indexOf('<') + 1, change.coinType.indexOf('>')),
      amount: change.totalDeposit - change.totalWithdraw,
    })
  })
  return coinChangeData
}
