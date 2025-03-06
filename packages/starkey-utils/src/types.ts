
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
  tokenType: 'Native' | 'ERC20'
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
  isSupraNetwork?: boolean
  tokenGasFeeUnitToDisplay?: string
  indexerClient?: string
  isCustom?: boolean // when we add new network or custom token then we pass true
  envType: EnvironmentType | ''
  explorerAccountURL: string
  decimal?: number
  balance?: number | any
  formattedBalance?: string
  isHidden?: boolean
  chainIdentifier?: string
  isAccountImported?: boolean
  tokenPairId: string
  networkPairId: string
  explorerName?: string
  pairName: string
  currencyPrice?: string
}