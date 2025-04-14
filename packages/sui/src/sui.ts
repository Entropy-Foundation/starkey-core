import { SuiClient } from '@mysten/sui.js/client'
import { NATIVE_COINS, TokenRequestParams } from '@starkey/utils'
import { toBigInt } from 'ethers'

/**
 * @description Get the custom token details for a specific token contract address.
 * @param {string} contractAddress - The token contract address.
 * @param {string} userAddress - The address of the wallet.
 * @param {string} rpcUrl - The rpc url of network.
 * @returns {TokenResponseData | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
 * @throws {Error} - If the token contract address is not valid.
 */
export async function getCustomToken(params: TokenRequestParams) {
  try {
    const provider = new SuiClient({
      url: params.rpcUrl,
    })
    const tokenInfo = await provider.getCoinMetadata({
      coinType: params.contractAddress,
    })
    if (tokenInfo) {
      let balance = 0
      balance = await getTokenBalance(params)
      const filteredSymbol = tokenInfo?.symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)

      return {
        title: filteredSymbol,
        subTitle: tokenInfo.name,
        balance: Number(balance),
        decimal: tokenInfo?.decimals ?? '',
        image: tokenInfo?.iconUrl ?? '',
        rawBalance: balance,
      }
    } else {
      return { error: 'Address is incorrect' }
    }
  } catch (error: any) {
    // const match = error.toString().match(/Error: Invalid struct type: (.+?)\. Got/)[0]
    // const errorMessage = match ? match.split(':')[1].trim() : error
    // return { error: errorMessage }
    return { error: 'Address is incorrect' }
  }
}

/**
 * Get the balance of a SUI address for a specific asset.
 * @param userAddress - The address of the wallet.
 * @param params - The asset for which the balance is to be retrieved.
 * @returns The total balance of the specified asset for the given address.
 */
const getTokenBalance = async (params: TokenRequestParams, checkNative?: boolean): Promise<number> => {
  try {
    const suiProvider = new SuiClient({ url: params.rpcUrl })
    const coinType = checkNative
      ? NATIVE_COINS.SUI_COIN
      : params.contractAddress
      ? params.contractAddress
      : NATIVE_COINS.SUI_COIN

    let { totalBalance } = await suiProvider.getBalance({
      owner: params.userAddress,
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
