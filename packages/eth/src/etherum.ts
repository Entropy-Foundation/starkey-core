import { generateRandomString, NetworkToken } from "@starkey/utils"
import { ethers, JsonRpcProvider } from "ethers"
import Erc20TokenABI from './Erc20TokenABI.json'
export interface INetwork {
  getCustomTokenEth:(contractAddress: string, walletAddress?: string) => Promise<any>
}
export async function getCustomTokenEth(asset:NetworkToken,contractAddress:string,userAddress:string) {
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