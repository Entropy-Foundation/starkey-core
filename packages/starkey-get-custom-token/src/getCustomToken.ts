import { getCustomTokenEth } from '@starkey/eth'
import { NetworkToken } from '@starkey/utils'

export async function getCustomToken(asset:NetworkToken,contractAddress:string,userAddress:string):Promise<NetworkToken|{error:any}> {
  const token = await getCustomTokenEth(asset,contractAddress,userAddress)
  return token
}