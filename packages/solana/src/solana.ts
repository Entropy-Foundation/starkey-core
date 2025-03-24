
import { Connection, PublicKey } from '@solana/web3.js'
import { NetworkToken, generateRandomString, useAxios } from "@starkey/utils"
import { ethers } from 'ethers'
let solanaConnectionObject: Connection


 /**
   * @description Get the custom token details for a specific token contract address.
   * @param {string} contractAddress - The token contract address.
   * @param {string} userAddress - The address of the wallet.
   * @returns {NetworkToken | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
   * @throws {Error} - If the token contract address is not valid.
   */
export async function getCustomToken(asset:NetworkToken,contractAddress:string,userAddress:string) {
  try {
      asset.tokenContractAddress = contractAddress
      const tokenInfo = await fetchTokenInfo(asset)
      if (tokenInfo) {
        const ownerAccount = new PublicKey(userAddress)
        const tokenAccount = new PublicKey(contractAddress)
        const connection = await createProvider(asset.providerNetworkRPC_URL)

        const info = await connection.getParsedTokenAccountsByOwner(ownerAccount, {
          mint: tokenAccount,
        })
        const balance = info.value.length && info.value[0] ? info.value[0].account.data.parsed.info.tokenAmount.amount : 0
        const filteredSymbol = tokenInfo?.symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)

        const newToken: NetworkToken = {
          ...asset,
          title: filteredSymbol ?? '',
          subTitle: tokenInfo?.name ?? '',
          tokenContractAddress: contractAddress,
          shortName: `${asset.networkName}_${filteredSymbol}_${generateRandomString(5)}`,
          balance: balance,
          formattedBalance: ethers.formatUnits(balance || 0, tokenInfo?.decimals ?? 9),
          decimal: tokenInfo?.decimals ?? '',
          tokenType: tokenInfo?.type ?? 'ERC20',
          isCustom: true,
          image: tokenInfo?.logoURI ?? '',
        }
        return newToken
      } else {
        return { error: 'Resource not found by Address' }
      }
    } catch (error:any) {
      const match = error.toString().match(/:\s*(.*)/)
      const sentenceAfterFirstColon = match ? match[1].trim() : ''
      return { error: sentenceAfterFirstColon }
    }
}

/**
 * Fetches token information from the Solana token list API.
 * @param {NetworkToken} tokenObj - An object containing the token contract address and the provider network RPC name.
 * @returns {Promise<TokenInfo>} - A promise that resolves to an object containing the token's name, symbol, and decimals.
 */
export const fetchTokenInfo = async (tokenObj: NetworkToken) => {
  const response = await useAxios<any>({
    axiosParams: {
      method: 'post',
      url: `https://token-list-api.solana.cloud/v1/mints?chainId=${tokenObj.providerNetworkRPC_Network_Name}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: { addresses: [tokenObj.tokenContractAddress] },
    },
  })
  return response.content[0]
}

/**
 * Creates a new Solana provider using the given URL.
 * @param {string} url - The URL of the Solana network.
 * @returns {Connection} - The newly created Solana provider.
 */
export const createProvider = async (url: string) => {
  if (solanaConnectionObject?.rpcEndpoint !== url) {
    solanaConnectionObject = new Connection(url, {
      wsEndpoint: url?.replace('https', 'wss'),
    })
  }
  return solanaConnectionObject
}