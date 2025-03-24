import { generateRandomString, NetworkToken } from "@starkey/utils"
import { ethers, JsonRpcProvider } from "ethers"
import Erc20TokenABI from './Erc20TokenABI.json'

/**
   * Get the custom token details for a specific token contract address.
   * @param {string} contractAddress - The token contract address.
   * @param {string} userAddress - The address of the wallet.
   * @returns {NetworkToken | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
   * @throws {Error} - If the token contract address is not a valid Ethereum address.
   */
export async function getCustomToken(asset:NetworkToken,contractAddress:string,userAddress:string) {
    if (contractAddress.length === 42) {
      try {
        const provider = new JsonRpcProvider(asset.providerNetworkRPC_URL)
        let data:any = new ethers.Contract(contractAddress, Erc20TokenABI, provider)
        const symbol = await data.symbol()
        const filteredSymbol = symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)
        const decimal = await data.decimals()
        const balance = await data?.balanceOf(userAddress)
        const name = await data.name()
        const generateString = generateRandomString(5)
        const newToken: NetworkToken = {
          ...asset,
          title: filteredSymbol,
          subTitle: name,
          tokenContractAddress: contractAddress,
          shortName: `${asset.networkName}_${filteredSymbol}_${generateString}`,
          balance: Number(balance),
          formattedBalance: ethers.formatUnits(balance || 0, Number(decimal) || 18),
          decimal: Number(decimal),
          tokenType: 'ERC20', 
          isCustom: true,
          image: '',
        }
        return newToken
      } catch (error:any) {
        console.error("error",error)
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