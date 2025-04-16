import { fetchOptionsData, handleFetch, TokenDataProps, TokensResponse } from '@starkey/utils'

export const getCustomTokenDataFromApi = async (
  url: string,
  address: string,
  coingeckoNetworkId?: string
): Promise<TokenDataProps | null> => {
  try {
    if (!coingeckoNetworkId) {
      coingeckoNetworkId = 'ethereum'
    }

    let dataQuery = JSON.stringify({
      query: `query StarkeyNetwork($input: walletInput) {
              starkeyCustomTokenData(input: $input) {
                decimal
                id
                image
                name
                pairId
                symbol
                pairName
              }
            }`,
      variables: { input: { networkName: coingeckoNetworkId, contractAddress: address } },
    })

    const fetchOptions = fetchOptionsData(url, dataQuery)
    const response = await handleFetch(url, fetchOptions)
    return response.data.starkeyCustomTokenData
  } catch (err) {
    return null
  }
}

export async function customTokenList(
  url: string,
  isRecommended?: boolean,
  search?: string,
  networkName?: string,
  offset: number = 0,
  limit: number = 10
): Promise<TokensResponse | []> {
  try {
    const filters: any = {}
    // 1. If isRecommended is true, filter tokens where is_recommended = true
    if (isRecommended === true) {
      filters['is_recommended'] = { _eq: true }
    }
    // 2. If networkName is provided, filter by network_id.name
    if (networkName) {
      const networkMap: { [key: string]: string } = {
        ETH: 'Ethereum',
        SUI: 'Sui',
        APT: 'Aptos',
        SOL: 'Solana',
        SUP: 'SUP',
      }
      filters['network_id'] = { name: { _eq: networkMap[networkName] } }
    }

    // 3. If search value is provided, filter by name or symbol containing search text
    if (search && search.trim() !== '') {
      filters['_or'] = [
        { name: { _icontains: search } }, // Case-insensitive search for name
        { symbol: { _icontains: search } }, // Case-insensitive search for symbol
      ]
    }
    const sort = ['sort', 'id'] // Sorting criteria

    let dataQuery = JSON.stringify({
      query: `query GetTokens($filters: tokens_filter, $limit: Int, $offset: Int, $sort: [String]) {
        tokens(filter: $filters, limit: $limit, offset: $offset, sort: $sort) {
          id
          name
          symbol
          address
          is_recommended
          decimals
          logoURI
          chainId
          pair_id
          pair_name
          network_id {
            id
            name
          }
        }
      }`,
      variables: { filters, limit, offset, sort },
    })

    const fetchOptions = fetchOptionsData(url, dataQuery)
    const response = await handleFetch(url, fetchOptions)
    return response.data.tokens
  } catch (err) {
    return []
  }
}

export const getNetworkDataFromApi = async (url: string, networkName: string, chainId?: string): Promise<any> => {
  try {
    const ids: string[] = []
    if (networkName !== 'unknown') {
      ids.push(networkName)
    }

    let dataQuery = JSON.stringify({
      query: `query StarkeyNetwork($input: walletInput) {
              starkeyCustomNetworkData(input: $input) {
                image
                networkId
                networkImage
                networkName
                pairId
                symbol
                tokenId
                pairName
              }
            }`,
      variables: { input: { chainID: Number(chainId), vs_currency: 'usd', ids: ids.join(',') } },
    })

    const fetchOptions = fetchOptionsData(url, dataQuery)
    const response = await handleFetch(url, fetchOptions)
    return response.data.starkeyCustomNetworkData
  } catch {
    return null
  }
}
