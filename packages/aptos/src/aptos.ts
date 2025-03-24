
import { generateRandomString, NetworkToken, useAxios } from "@starkey/utils"
import * as aptos from 'aptos'
import { ethers } from 'ethers'

export async function getCustomToken(asset:NetworkToken,contractAddress:string,userAddress:string,networkEnvironment:string) {
  try {
      const client = new aptos.AptosClient(asset.providerNetworkRPC_URL)
      const contractAddressArray = contractAddress.split('::')
      if (contractAddressArray.length < 3) {
        return { error: 'Invalid Contract Address' }
      }
      const tokenInfo = await useAxios<any>({
        axiosParams: {
          method: 'get',
          url: `https://api.aptoscan.com/v1/coins/${contractAddress}?cluster=${networkEnvironment.toLowerCase()}`,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      })

      if (!tokenInfo?.data) {
        return { error: 'Invalid Contract Address' }
      }
      const filteredSymbol = tokenInfo?.data?.symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)

      const newToken: NetworkToken = {
        ...asset,
        title: filteredSymbol ?? '',
        subTitle: tokenInfo?.data?.name ?? '',
        tokenContractAddress: contractAddress,
        shortName: `${asset.networkName}_${filteredSymbol}_${generateRandomString(5)}`,
        balance: 0,
        formattedBalance: '0',
        decimal: tokenInfo?.data?.decimals ?? '',
        tokenType: tokenInfo?.data?.type ?? 'ERC20',
        isCustom: true,
        image: tokenInfo?.data?.logo_url ?? '',
      }
      try {
        const coinStore = `0x1::coin::CoinStore<${contractAddress}>` // coin to get balance
        const tokenBalance: any = await client.getAccountResource(userAddress, coinStore)
        const balance = tokenBalance?.data?.coin?.value ? tokenBalance?.data?.coin?.value : 0
        newToken.balance = balance
        // newToken.formattedBalance = Number(ethers.formatUnits(balance || 0, tokenInfo?.decimals ?? 8))
        newToken.formattedBalance = ethers.formatUnits(balance || 0, tokenInfo?.decimals ?? 8)
        return newToken
      } catch (e) {
        return newToken
      }
    } catch (error: any) {
      const errorObject = JSON.parse(error.message)
      const messageSentence = errorObject.message
      const errorMsg = messageSentence.split('(')[0] as string
      // Log the error if needed
      return { error: errorMsg.includes('resource_type') ? 'Resource not found by Address token' : errorMsg }
    }
}