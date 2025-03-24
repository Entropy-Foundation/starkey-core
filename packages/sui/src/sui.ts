import { SuiClient } from '@mysten/sui.js/client'
import { NATIVE_COINS, NetworkToken, generateRandomString } from "@starkey/utils"
import { ethers, toBigInt } from "ethers"

/**
 * @description Get the custom token details for a specific token contract address.
 * @param {string} contractAddress - The token contract address.
 * @param {string} walletAddress - The address of the wallet.
 * @returns {NetworkToken | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
 * @throws {Error} - If the token contract address is not valid.
 */
export async function getCustomToken(asset:NetworkToken,contractAddress:string,userAddress:string) {
  try {
    const provider = new SuiClient({
      url: asset.providerNetworkRPC_URL,
    })
      const tokenInfo = await provider.getCoinMetadata({
        coinType: contractAddress,
      })
      if (tokenInfo) {
        let balance = 0
        let customAsset = {
          ...asset,
          tokenContractAddress: contractAddress,
          subTitle: tokenInfo.symbol,
        }
        balance = await getTokenBalance(userAddress, customAsset)
        const filteredSymbol = tokenInfo?.symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)

        const newToken: NetworkToken = {
          ...asset,
          title: filteredSymbol,
          subTitle: tokenInfo.name,
          tokenContractAddress: contractAddress,
          shortName: `${asset.networkName}_${filteredSymbol}_${generateRandomString(5)}`,
          balance: Number(balance),
          formattedBalance: ethers.formatUnits(balance || 0, tokenInfo?.decimals ?? 9),
          decimal: tokenInfo?.decimals ?? '',
          tokenType: 'ERC20',
          isCustom: true,
          image: tokenInfo?.iconUrl ?? '',
        }
        return newToken
      } else {
        return { error: 'Resource not found by Address' }
      }
    } catch (error: any) {
      const match = error.toString().match(/Error: Invalid struct type: (.+?)\. Got/)[0]
      const errorMessage = match ? match.split(':')[1].trim() : error
      return { error: errorMessage }
    }
}

/**
 * Get the balance of a SUI address for a specific asset.
 * @param address - The address of the wallet.
 * @param asset - The asset for which the balance is to be retrieved.
 * @returns The total balance of the specified asset for the given address.
 */
export const getTokenBalance = async (address: string, asset: NetworkToken, checkNative?: boolean): Promise<number> => {
  try {
    const suiProvider = new SuiClient({ url: asset.providerNetworkRPC_URL })
    const coinType = checkNative
      ? NATIVE_COINS.SUI_COIN
      : asset.tokenContractAddress
      ? asset.tokenContractAddress
      : NATIVE_COINS.SUI_COIN

    let { totalBalance } = await suiProvider.getBalance({
      owner: address,
      coinType: coinType,
    })
    const bigBalance = totalBalance
    const bigBalanceString = bigBalance.toString()
    // @ts-ignore
    totalBalance = toBigInt(bigBalanceString)
    // @ts-ignore
    return totalBalance
  } catch (error: any) {
    return 0
  }
}