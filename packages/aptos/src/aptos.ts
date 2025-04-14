import { NetworkToken, TokenRequestParams, TokenResponseData, sendRequest, useAxios } from '@starkey/utils'
import * as aptos from 'aptos'

/**
 * @description Get the custom token details for a specific token contract address.
 * @param {string} contractAddress - The token contract address.
 * @param {string} userAddress - The address of the wallet.
 * @param {string} rpcUrl - The rpc url of network.
 * @param {string} networkEnvironment - The network environment
 * @returns {TokenResponseData | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
 * @throws {Error} - If the token contract address is not valid.
 */
export async function getCustomToken(params: TokenRequestParams) {
  try {
    const client = new aptos.AptosClient(params.rpcUrl)
    let tokenInfo
    let tokenType: NetworkToken['tokenType'] = 'ERC20'

    if (params.contractAddress.includes('::')) {
      if (params?.networkEnvironment) {
        const tokenInfoResponse = await useAxios<any>({
          axiosParams: {
            method: 'get',
            // @ts-ignore
            url: `https://api.aptoscan.com/v1/coins/${
              params.contractAddress
            }?cluster=${params?.networkEnvironment.toLowerCase()}`,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        })

        if (!tokenInfoResponse?.data) {
          return { error: 'Invalid Contract Address' }
        }
        tokenInfo = tokenInfoResponse?.data
      }
    } else {
      const data = {
        function: `0x1::fungible_asset::metadata`,
        type_arguments: ['0x1::fungible_asset::Metadata'],
        arguments: [params?.contractAddress],
      }

      const result = await sendRequest(params.rpcUrl, '/view', data)
      tokenInfo = result?.data && result?.data.length ? result?.data[0] : {}
      tokenType = 'FA coin'
    }
    const filteredSymbol = tokenInfo?.symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)

    const newToken: TokenResponseData = {
      title: filteredSymbol ?? '',
      subTitle: tokenInfo?.name ?? '',
      balance: 0,
      rawBalance: 0,
      decimal: tokenInfo?.decimals ?? '',
      tokenType,
      image: (tokenInfo?.logo_url || tokenInfo?.icon_uri) ?? '',
    }
    try {
      if (params?.contractAddress.includes('::')) {
        const coinStore = `0x1::coin::CoinStore<${params.contractAddress}>` // coin to get balance
        const tokenBalance: any = await client.getAccountResource(params.userAddress, coinStore)
        const balance = tokenBalance?.data?.coin?.value ? tokenBalance?.data?.coin?.value : 0
        newToken.balance = balance
        newToken.rawBalance = balance
      } else {
        const balance = await getFungibleTokenBalance(params)
        newToken.balance = balance
      }
      return newToken
    } catch (e) {
      return newToken
    }
  } catch (error: any) {
    if (error.message) {
      // const errorObject = JSON.parse(error.message)
      // const messageSentence = errorObject.mes
      // const errorMsg = messageSentence.split('(')[0] as string
      // // Log the error if needed
      // return { error: errorMsg.includes('resource_type') ? 'Address is incorrect' : errorMsg }
      return { error: 'Address is incorrect' }
    } else {
      return { error: 'Address is incorrect' }
    }
  }
}

export async function getFungibleTokenBalance(params: TokenRequestParams) {
  const data = {
    function: `0x1::primary_fungible_store::balance`,
    type_arguments: ['0x1::fungible_asset::Metadata'],
    arguments: [params?.userAddress, params?.contractAddress],
  }
  const result = await sendRequest(params.rpcUrl, '/view', data)
  return result?.data && result?.data.length ? result?.data[0] : '0'
}
