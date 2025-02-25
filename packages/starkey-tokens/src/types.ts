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
}

export interface TokensResponse {
  data: {
    tokens: Token[]
  }
}