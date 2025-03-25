
import { NetworkToken, generateRandomString } from "@starkey/utils"
import { ethers } from "ethers"
import { HexString, SupraClient } from 'supra-l1-sdk'


/**
 * @description Get the custom token details for a specific token contract address.
 * @param {string} contractAddress - The token contract address.
 * @param {string} walletAddress - The address of the wallet.
 * @returns {NetworkToken | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
 * @throws {Error} - If the token contract address is not valid.
 */

export interface INetworkProviders {
  [networkName: string]: {
    [rpcUrl: string]: any
  }
}

const providerMaps: INetworkProviders = {}

export async function getCustomToken(asset:NetworkToken,contractAddress:string,userAddress:string) {
  try {
      const supraClient = await getSupraProvider(asset)
      const tokenInfo = await supraClient.getCoinInfo(contractAddress)
      const filteredSymbol = tokenInfo?.symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)

      const newToken: NetworkToken = {
        ...asset,
        title: filteredSymbol ?? '',
        subTitle: tokenInfo?.name ?? '',
        tokenContractAddress: contractAddress,
        shortName: `${asset.networkName}_${filteredSymbol}_${generateRandomString(5)}`,
        balance: 0,
        formattedBalance: '0',
        decimal: tokenInfo?.decimals ?? '',
        tokenType: 'ERC20',
        isCustom: true,
        image: '',
      }
      try {
        const address = HexString.ensure(userAddress)
        const balance = await supraClient.getAccountCoinBalance(address, contractAddress)
        newToken.balance = Number(balance) || 0
        newToken.formattedBalance = ethers.formatUnits(balance || 0, tokenInfo?.decimals ?? 8) || '0'
        return newToken
      } catch (_) {
        return newToken
      }
    } catch (error: any) {
      console.error('Error fetching token info:', error)
      return { error: 'Resource not found by Address token' }
    }
}

export async function getSupraProvider(asset:NetworkToken) {
  let provider = getRpcProvider('SUP', asset.providerNetworkRPC_URL)
  if (!provider) {
    provider = await SupraClient.init(asset.providerNetworkRPC_URL)
    setRpcProvider('SUP', asset.providerNetworkRPC_URL, provider)
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