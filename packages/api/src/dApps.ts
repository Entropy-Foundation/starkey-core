import { fetchOptionsData, handleFetch, TokensResponse } from '@starkey/utils'

export async function dappsList(url: string): Promise<TokensResponse | []> {
  try {
    let dataQuery = JSON.stringify({
      query: `query {
        dapps {
          id
          title
          url
          networkType {
            id
            name
            symbol
          }
        }
      }`,
      variables: {},
    })
    const fetchOptions = fetchOptionsData(url, dataQuery)
    const response = await handleFetch(url, fetchOptions)
    return response.data.dapps
  } catch (err) {
    return []
  }
}
