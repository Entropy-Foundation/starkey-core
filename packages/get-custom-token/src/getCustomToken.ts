import { getCustomToken as getCustomTokenApt } from '@starkey/aptos'
import { getCustomToken as getCustomTokenEth } from '@starkey/eth'
import { NetworkToken } from '@starkey/utils'
export async function getCustomTokenData(asset:NetworkToken,contractAddress:string,userAddress:string,networkEnvironment:string){
  let token: NetworkToken | any = {}
  if(asset.networkName === 'ETH'){
     token = await getCustomTokenEth(asset,contractAddress,userAddress)
  }
  if(asset.networkName === 'APT'){
    console.log("in APt")
     token = await getCustomTokenApt(asset,contractAddress,userAddress,networkEnvironment)
     console.log("token", token)
  }
  return token
}