import { getCustomToken as getCustomTokenApt } from '@starkey/aptos'
import { getCustomToken as getCustomTokenEth } from '@starkey/eth'
import { getCustomToken as getCustomTokenSol } from '@starkey/solana'
import { getCustomToken as getCustomTokenSui } from '@starkey/sui'
import { getCustomToken as getCustomTokenSup } from '@starkey/supra'
import { NetworkToken, TokenResponseData, generateRandomString } from '@starkey/utils'
import { ethers } from 'ethers'

/**
 * @description Get the custom token details for a specific token contract address.
 * @param {NetworkToken} asset - The network token object containing network-specific details.
 * @param {string} contractAddress - The token contract address.
 * @param {string} userAddress - The address of the wallet.
 * @param {string} rpcUrl - The rpc url of network.
 * @param {string} networkEnvironment - The network environment
 * @returns { NetworkToken | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
 * @throws {Error} - If the token contract address is not valid.
 */
export async function getCustomTokenData(
  asset: NetworkToken,
  contractAddress: string,
  userAddress: string,
  networkEnvironment: string,
) {
  let token: TokenResponseData | { error: string } = { error: 'Unsupported network' }
  if (asset.isEVMNetwork) {
    token = await getCustomTokenEth({ rpcUrl: asset.providerNetworkRPC_URL, contractAddress, userAddress })
  } else if (asset.isSupraNetwork || asset.networkName === 'SUP') {
    token = await getCustomTokenSup({ rpcUrl: asset.providerNetworkRPC_URL, contractAddress, userAddress })
  } else if (asset.networkName === 'APT') {
    token = await getCustomTokenApt({
      rpcUrl: asset.providerNetworkRPC_URL,
      contractAddress,
      userAddress,
      networkEnvironment,
    })
  } else if (asset.networkName === 'SOL') {
    token = await getCustomTokenSol({ rpcUrl: asset.providerNetworkRPC_URL, contractAddress, userAddress })
  } else if (asset.networkName === 'SUI') {
    token = await getCustomTokenSui({ rpcUrl: asset.providerNetworkRPC_URL, contractAddress, userAddress })
  }
  if ('error' in token) {
    return { error: token.error } // If there was an error, return it
  }

  const newToken: NetworkToken = {
    ...asset,
    ...token,
    tokenContractAddress: contractAddress,
    shortName: `${asset.networkName}_${token.title}_${generateRandomString(5)}`,
    tokenType: token.tokenType || 'ERC20',
    isCustom: true,
    image: token.image || '',
    formattedBalance: ethers.formatUnits(token.rawBalance || 0, token.decimal),
  }
  delete newToken.rawBalance
  return newToken
}
