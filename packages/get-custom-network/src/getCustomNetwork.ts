import { getCustomNetwork as getEthNetwork } from '@starkey/eth'
import { getCustomNetwork as getSupraNetwork } from '@starkey/supra'
import { NetworkToken } from '@starkey/utils'

export async function getCustomNetwork(networkURL: string, activeNetwork?: NetworkToken) {
  let networkData: any = null
  if (activeNetwork && (activeNetwork?.isSupraNetwork || activeNetwork?.networkName === 'SUP')) {
    networkData = await getSupraNetwork({ networkURL })
  } else {
    networkData = await getEthNetwork({ networkURL })
  }
  return networkData
}
