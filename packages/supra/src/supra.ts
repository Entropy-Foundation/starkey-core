import { NetworkRequestParams, NetworkToken, TokenRequestParams, TokenResponseData, sendRequest } from '@starkey/utils'
import { HexString, SupraClient } from 'supra-l1-sdk'

/**
 * @description Get the custom token details for a specific token contract address.
 * @param {string} contractAddress - The token contract address.
 * @param {string} walletAddress - The address of the wallet.
 * @param {string} rpcUrl - The rpc url of network.
 * @returns {TokenResponseData | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
 * @throws {Error} - If the token contract address is not valid.
 */

interface INetworkProviders {
  [networkName: string]: {
    [rpcUrl: string]: any
  }
}

const providerMaps: INetworkProviders = {}

export async function getCustomToken(params: TokenRequestParams) {
  try {
    const supraClient = await getSupraProvider(params.rpcUrl)
    let tokenInfo
    let tokenType: NetworkToken['tokenType'] = 'ERC20'

    if (params?.contractAddress.includes('::')) {
      tokenInfo = await supraClient.getCoinInfo(params.contractAddress)
    } else {
      const data = {
        function: `0x1::fungible_asset::metadata`,
        type_arguments: ['0x1::fungible_asset::Metadata'],
        arguments: [params?.contractAddress],
      }

      const result = await sendRequest(params?.rpcUrl, '/rpc/v1/view', data)
      tokenInfo = result?.data?.result && result?.data?.result.length ? result?.data?.result[0] : {}
      tokenType = 'FA coin'
    }
    const filteredSymbol = tokenInfo?.symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)
    const newToken: TokenResponseData = {
      title: filteredSymbol ?? '',
      subTitle: tokenInfo?.name ?? '',
      balance: 0,
      decimal: tokenInfo?.decimals ?? '',
      tokenType,
      image: tokenInfo?.icon_uri ?? undefined,
      rawBalance: 0,
    }
    try {
      let balance
      const address = HexString.ensure(params.userAddress)
      if (params?.contractAddress.includes('::')) {
        balance = await supraClient.getAccountCoinBalance(address, params.contractAddress)
      } else {
        balance = await getFungibleTokenBalance(params)
      }
      newToken.balance = Number(balance) || 0
      newToken.rawBalance = balance
      return newToken
    } catch (_) {
      return newToken
    }
  } catch (error: any) {
    return { error: 'Address is incorrect' }
  }
}

async function getSupraProvider(rpcUrl: string) {
  let provider = getRpcProvider('SUP', rpcUrl)
  if (!provider) {
    provider = await SupraClient.init(rpcUrl)
    setRpcProvider('SUP', rpcUrl, provider)
  }
  provider = provider
  return provider
}

function getRpcProvider(networkName: string, rpcUrl: string) {
  return providerMaps[networkName]?.[rpcUrl] ?? null
}

function setRpcProvider(networkName: string, rpcUrl: string, provider: any) {
  if (!providerMaps[networkName]) {
    providerMaps[networkName] = {} // Explicitly assign an empty object
  }
  providerMaps[networkName]![rpcUrl] = provider // `!` tells TypeScript it's guaranteed to exist
}

export async function getFungibleTokenBalance(params: TokenRequestParams) {
  const data = {
    function: `0x1::primary_fungible_store::balance`,
    type_arguments: ['0x1::fungible_asset::Metadata'],
    arguments: [params?.userAddress, params?.contractAddress],
  }
  const result = await sendRequest(params?.rpcUrl, '/rpc/v1/view', data)
  return result?.data?.result && result?.data?.result.length ? result?.data?.result[0] : '0'
}

export async function getCustomNetwork(params: NetworkRequestParams) {
  try {
    const provider = await SupraClient.init(params.networkURL)
    if (provider) {
      const chainId = await provider.getChainId()
      if (chainId && chainId.value >= 0) {
        const network = {
          name: 'SUPRA',
          chainId: chainId.value,
        }
        return { provider: true, network }
      }
    }
    return { provider: null, network: null }
  } catch (er) {
    return { provider: null, network: null }
  }
}
