import { getCustomToken as getCustomTokenApt } from '@starkey/aptos'
import { getCustomToken as getCustomTokenEth } from '@starkey/eth'
import { getCustomToken as getCustomTokenSol } from '@starkey/solana'
import { getCustomToken as getCustomTokenSui } from '@starkey/sui'
import { getCustomToken as getCustomTokenSup } from '@starkey/supra'
import { NetworkToken } from '@starkey/utils'

export async function getCustomTokenData(asset:NetworkToken,contractAddress:string,userAddress:string,networkEnvironment:string){
  let token: NetworkToken | any = {}
  if(asset.networkName === 'ETH'){
     token = await getCustomTokenEth(asset,contractAddress,userAddress)
  }
  else if(asset.networkName === 'APT'){
     token = await getCustomTokenApt(asset,contractAddress,userAddress,networkEnvironment)
  }
  else if(asset.networkName === 'SOL'){
     token = await getCustomTokenSol(asset,contractAddress,userAddress)
  }
  else if(asset.networkName === 'SUI'){
     token = await getCustomTokenSui(asset,contractAddress,userAddress)
  }
  else if(asset.networkName === 'SUP'){
     token = await getCustomTokenSup(asset,contractAddress,userAddress)
  }
  return token
}