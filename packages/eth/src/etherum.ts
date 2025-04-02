import { TokenRequestParams } from "@starkey/utils"
import { JsonRpcProvider, ethers } from "ethers"
import Erc20TokenABI from './Erc20TokenABI.json'

/**
   * Get the custom token details for a specific token contract address.
   * @param {string} contractAddress - The token contract address.
   * @param {string} userAddress - The address of the wallet.
   * @param {string} rpcUrl - The rpc url of network.
   * @returns {TokenResponseData | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
   * @throws {Error} - If the token contract address is not a valid Ethereum address.
   */
export async function getCustomToken(params:TokenRequestParams) {
    if (params.contractAddress.length === 42) {
      try {
        const provider = new JsonRpcProvider(params.rpcUrl)
        let data:any = new ethers.Contract(params.contractAddress, Erc20TokenABI, provider)
        const symbol = await data.symbol()
        const filteredSymbol = symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)
        const decimal = await data.decimals()
        const balance = await data?.balanceOf(params.userAddress)
        const name = await data.name()
        return {
          title: filteredSymbol,
          subTitle: name,
          balance: Number(balance),
          decimal: Number(decimal),
        }
      
      } catch (error:any) {
        const match = error.toString().match(/:\s*(.*)/)
        const messageSentence = match ? match[1].trim() : ''
        const errorMessage = messageSentence.split('(').length
          ? (messageSentence.split('(')[0] as string)
          : messageSentence

        return {
          error: errorMessage,
        }
      }
    }
    return {
      error: 'Token address must be valid!',
    }
}