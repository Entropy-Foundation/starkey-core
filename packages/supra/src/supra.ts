
import { TokenRequestParams, TokenResponseData } from "@starkey/utils"
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

export async function getCustomToken(params:TokenRequestParams) {
  try {
        const supraClient = await getSupraProvider(params.rpcUrl)
        const tokenInfo = await supraClient.getCoinInfo(params.contractAddress)
        const filteredSymbol = tokenInfo?.symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)

        const newToken: TokenResponseData = {
          title: filteredSymbol ?? '',
          subTitle: tokenInfo?.name ?? '',
          balance: 0,
          decimal: tokenInfo?.decimals ?? '',
        }
        try {
          const address = HexString.ensure(params.userAddress)
          const balance = await supraClient.getAccountCoinBalance(address, params.contractAddress)
          newToken.balance = Number(balance) || 0
          return newToken
        } catch (_) {
          return newToken
        }
      } catch (error: any) {
        return { error: 'Resource not found by Address token' }
      }
}

async function getSupraProvider(rpcUrl:string) {
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


function setRpcProvider (networkName: string, rpcUrl: string, provider: any) {
  if (!providerMaps[networkName]) {
    providerMaps[networkName] = {} // Explicitly assign an empty object
  }
  providerMaps[networkName]![rpcUrl] = provider  // `!` tells TypeScript it's guaranteed to exist
}