
import { Connection, PublicKey } from '@solana/web3.js'
import { TokenRequestParams, useAxios } from "@starkey/utils"

 /**
   * @description Get the custom token details for a specific token contract address.
   * @param {string} contractAddress - The token contract address.
   * @param {string} userAddress - The address of the wallet.
   * @param {string} rpcUrl - The rpc url of network.
   * @returns {TokenResponseData | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
   * @throws {Error} - If the token contract address is not valid.
   */
export async function getCustomToken(params:TokenRequestParams) {
  try {
      const tokenInfo = await fetchTokenInfo(params)
      if (tokenInfo) {
        const ownerAccount = new PublicKey(params.userAddress)
        const tokenAccount = new PublicKey(params.contractAddress)
        const connection = await createProvider(params.rpcUrl)

        const info = await connection.getParsedTokenAccountsByOwner(ownerAccount, {
          mint: tokenAccount,
        })
        const balance = info.value.length && info.value[0] ? info.value[0].account.data.parsed.info.tokenAmount.amount : 0
        const filteredSymbol = tokenInfo?.symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)

        return {
          title: filteredSymbol ?? '',
          subTitle: tokenInfo?.name ?? '',
          balance: balance,
          decimal: tokenInfo?.decimals ?? '',
          tokenType: tokenInfo?.type ?? 'ERC20',
          image: tokenInfo?.logoURI ?? '',
        }
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
 * @param {TokenRequestParams} params - An object containing the token contract address and the provider network RPC name.
 * @returns {Promise<TokenInfo>} - A promise that resolves to an object containing the token's name, symbol, and decimals.
 */
const fetchTokenInfo = async (params:TokenRequestParams) => {
  const response = await useAxios<any>({
    axiosParams: {
      method: 'post',
      url: `https://token-list-api.solana.cloud/v1/mints?chainId=${params.rpcUrl}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: { addresses: [params.contractAddress] },
    },
  })
  return response.content[0]
}

/**
 * Creates a new Solana provider using the given URL.
 * @param {string} url - The URL of the Solana network.
 * @returns {Connection} - The newly created Solana provider.
 */
const createProvider = async (url: string) => {
  let solanaConnectionObject: Connection | undefined
  if (solanaConnectionObject?.rpcEndpoint !== url) {
    solanaConnectionObject = new Connection(url, {
      wsEndpoint: url?.replace('https', 'wss'),
    })
  }
  return solanaConnectionObject
}