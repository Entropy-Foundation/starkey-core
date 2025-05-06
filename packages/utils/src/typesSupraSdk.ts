export enum TxTypeForTransactionInsights {
  CoinTransfer = 'CoinTransfer',
  EntryFunctionCall = 'EntryFunctionCall',
  ScriptCall = 'ScriptCall',
  AutomationRegistration = 'AutomationRegistration',
}
export interface CoinChange {
  coinType: string
  amount: bigint
}
export interface TransactionInsights {
  coinReceiver: string
  coinChange: Array<CoinChange>
  type: TxTypeForTransactionInsights
}
export enum TransactionStatus {
  Success = 'Success',
  Failed = 'Failed',
  Pending = 'Pending',
}
export interface TransactionDetail {
  // txn_type not available in sdk-l1 that's why using this for automation transaction type
  txHash: string
  sender: string
  sequenceNumber: number
  maxGasAmount: number
  gasUnitPrice: number
  gasUsed?: number
  transactionCost?: number
  txExpirationTimestamp?: number
  txConfirmationTime?: number
  status: TransactionStatus
  events: any
  blockNumber?: number
  blockHash?: string
  transactionInsights: TransactionInsights
  vmStatus?: string
  txnType?: string
  feePayerAddress?: string
}
