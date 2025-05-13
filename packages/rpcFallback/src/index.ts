// import { getEthProvider } from '@starkey/eth'
import { JsonRpcProvider, WebSocketProvider, ethers } from 'ethers'
import { FALLBACK_RPC_URLS } from './fallbackRpcUrls'

interface INetworkProviders {
  [networkName: string]: {
    [rpcUrl: string]: any
  }
}

const providerMaps: INetworkProviders = {}

export const getRpcProvider = (networkName: string, rpcUrl: string) => {
  const networkProviders = providerMaps[networkName]
  return networkProviders?.[rpcUrl] ?? null
}

export const setRpcProvider = (networkName: string, rpcUrl: string, provider: any) => {
  if (!providerMaps[networkName]) {
    providerMaps[networkName] = {}
  }
  providerMaps[networkName]![rpcUrl] = provider
}

interface IProviderOptionsProps {
  rpcUrl: string // Primary RPC URL for the provider
  chainId: number // network chain ID
  useFallback?: boolean // Flag to decide whether to check fallback RPCs
}

const getEthProvider = (
  url: string,
  chainId?: number
): ethers.JsonRpcProvider | ethers.WebSocketProvider | undefined => {
  try {
    const _provider = url.startsWith('wss://')
      ? new ethers.WebSocketProvider(url, undefined, { batchMaxCount: 1 })
      : chainId
      ? new ethers.JsonRpcProvider(url, undefined, {
          staticNetwork: ethers.Network.from(chainId),
        })
      : new ethers.JsonRpcProvider(url)
    return _provider
  } catch (_) {}
}

const RPC_TIMEOUT = 1000 // Timeout in milliseconds
/**
 * Creates and returns a fallback provider for a given chain type.
 * Attempts to use the primary RPC first, then falls back to alternative RPCs if necessary.
 * @param chainType - The blockchain type (e.g., 'ETH', 'SUP')
 * @param options - Provider options including RPC URL, chainId, and fallback settings
 * @returns A working RpcProvider instance
 */
export const getFallbackProvider = async (chainType: string, options: IProviderOptionsProps) => {
  const { rpcUrl, chainId, useFallback = true } = options
  let provider: JsonRpcProvider | WebSocketProvider | null | undefined = null

  // Determine the list of RPC URLs to try, including fallbacks if enabled
  const rpcUrls = useFallback ? [rpcUrl, ...(FALLBACK_RPC_URLS[chainType]?.[chainId] ?? [])] : [rpcUrl]

  if (chainType === 'ETH') {
    // Iterate through available RPC URLs, stopping at the first responsive one
    for (const url of rpcUrls) {
      try {
        const _provider = getEthProvider(url, chainId)
        await Promise.race([
          _provider?.getBlockNumber(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: RPC took too long')), RPC_TIMEOUT)),
        ])
        /*const chainIdHex = await _provider.send('eth_chainId', [])
        if (chainId === parseInt(chainIdHex, 16)) {
          provider = _provider
          break
        }*/
        provider = _provider as JsonRpcProvider | WebSocketProvider | null | undefined
        break
      } catch (_) {}
    }
    // If no provider was found, fall back to the primary RPC URL
    if (!provider) {
      provider = getEthProvider(rpcUrl) as JsonRpcProvider | WebSocketProvider | null | undefined
    }
  } else if (chainType === 'SUP') {
    // TODO: Implement provider logic for Supra blockchain
  }
  return provider
}
