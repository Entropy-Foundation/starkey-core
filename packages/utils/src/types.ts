import { TRANSACTION_TYPE } from './constants'

export type EnvironmentType = 'testNet' | 'mainNet'

export interface NetworkToken {
  address: string
  id: string
  image: string
  networkImage?: string
  title: string
  subTitle: string
  networkTitle?: string
  networkSubTitle?: string
  shortName: string
  amount: string
  usdAmount: string
  networkId: string
  networkName: string
  tokenType: 'Native' | 'ERC20' | 'FA Coin'
  isUpdated?: boolean
  tokenContractAddress?: string
  providerNetworkRPC_URL: string
  providerNetworkRPC_Network_Name: string | number
  explorerURL?: string
  apiUrl: string
  tokenIds?: [string]
  coingeckoTokenId: string
  coingeckoNetworkId: string
  coingeckoGasTokenId: string
  oneDayUSDPriceChangePercentage?: number
  isFavorite: boolean
  isEVMNetwork?: boolean
  tokenGasFeeUnitToDisplay?: string
  indexerClient?: string
  isCustom?: boolean // when we add new network or custom token then we pass true
  envType: EnvironmentType | ''
  explorerAccountURL: string
  decimal?: number
  balance?: number | string
  formattedBalance?: string
  isHidden?: boolean
  chainIdentifier?: string
  isAccountImported?: boolean
  tokenPairId: string
  networkPairId: string
  explorerName?: string
  pairName: string
  currencyPrice?: string
  rawBalance?: any
  walletNetworkName?: string
}

export interface TokenRequestParams {
  rpcUrl: string
  contractAddress: string
  userAddress: string
  networkEnvironment?: string
  chainId?: number | string
}

export interface TokenResponseData {
  title: string
  subTitle: string
  balance: number | string
  decimal: number
  image?: string
  rawBalance: any
  tokenType?: 'Native' | 'ERC20' | 'FA Coin'
}

export type TokenDataProps = {
  id: string
  chain: string
  name: string
  contractAddress: string
  image: string
  acronym: string
  decimal: number
  percentage: number
  symbol: string
  pairId: string
  pairName: string
}

export interface Network {
  id: string
  name: string
}

export interface Token {
  id: string
  name: string
  symbol: string
  address: string
  is_recommended: boolean
  decimals: number
  logoURI: string
  chainId: string
  pair_id: string | null
  pair_name: string | null
  network_id: Network
  tokenType: string
}

export interface TokensResponse {
  data: {
    tokens: Token[]
  }
}

export interface PaginationArgs {
  count?: number
  start?: string | number
}
export interface NetworkRequestParams {
  networkURL: string
  userAddress?: string
  paginationArgs?: PaginationArgs
}

export interface TransactionListRequestParams {
  asset: NetworkToken
  smartContract?: SmartContract
  count?: number
  apiKey?: string
}

export interface SmartContract {
  genesis?: string
}

export interface TransactionDetailRequestParams {
  transactionHash: string
  asset: NetworkToken
  smartContract?: SmartContract
}

export interface GetTransationTypeAndValueParams {
  transaction: any // Replace `any` with proper type if known
  asset: NetworkToken
  coinType: string
  transactionType: TRANSACTION_TYPE
  value: number | string
  smartContract?: SmartContract
}

export interface TransactionStatusCheckResult {
  hash?: string
  status: 'Pending' | 'Failed' | 'Success' // match your enum if you have one
  vmStatus?: string
}

export interface CheckTransactionStatusReqParams {
  rpcUrl: string
  txHash: string
  network: string
  envType?: string
  reTryCount?: number
  chainId?: string
}

export interface ReturnTransactionData {
  // txn_type not available in sdk-l1 thats why using this for automation transaction type
  blockNumber?: number | string
  time: string | number
  hash: string
  nonce?: number | string
  from: string
  to: string
  value: string | number
  gas: BigInt | number | string
  gasPrice: BigInt | string
  status?: string
  transactionType: TRANSACTION_TYPE
  gasUsed?: BigInt | string
  cumulativeGasUsed?: BigInt | string
  tokenDecimal?: number
  vmStatus?: string
  txnType?: string
  functionName?: string
  networkFees?: string
  title?: string
}

export interface CustomTokenListRequestParams {
  networkURL: string
  userAddress: string
  walletNetworkName: string
}
