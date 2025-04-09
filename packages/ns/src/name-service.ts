import { NetworkToken, sendRequest } from '@starkey/utils'

export const getSupraNsPrimaryDomainName = async (
  asset: NetworkToken,
  supraNsContractAddress: string,
  address?: string
) => {
  try {
    const contractAddress = supraNsContractAddress
    const data = {
      function: `${contractAddress}::router::get_primary_name`,
      type_arguments: [],
      arguments: [address ? address : asset.address],
    }

    const result = await sendRequest(asset.providerNetworkRPC_URL, '/rpc/v1/view', data)
    const response = result?.data?.result ?? []

    if (response.length === 0) return null

    const subdomain = response[0]?.vec?.[0] || null
    const domain = response[1]?.vec?.[0] || null
    return domain && subdomain
      ? `${subdomain}.${domain}.${supraNsExtension}`
      : domain
      ? `${domain}.${supraNsExtension}`
      : null
  } catch (error) {
    return null
  }
}
let abortController: AbortController | null = null

export const getSupraNsTargetWalletAddress = async (
  rpcUrl: string,
  supraNsContractAddress: string,
  supraNsDomainName: string
) => {
  try {
    // Cancel previous request if it exists
    if (abortController) {
      abortController.abort()
    }

    // Create new abort controller
    abortController = new AbortController()
    const { subdomain, domain } = parseDomain(supraNsDomainName.toLowerCase())
    if (!subdomain && !domain) return null
    const contractAddress = supraNsContractAddress
    const data = {
      function: `${contractAddress}::router::get_target_addr`,
      type_arguments: [],
      arguments: domain && subdomain ? [domain, { vec: [subdomain] }] : [domain, { vec: [] }],
    }
    const result = await sendRequest(rpcUrl, '/rpc/v1/view', data, false, abortController)
    const response = result?.data?.result ?? []

    if (response.length === 0) return null

    const walletAddress = response[0]?.vec?.[0] || null
    return walletAddress ? walletAddress : null
  } catch (error) {
    return null
  }
}

export const supraNsExtension = 'supra'

export const parseDomain = (url: string) => {
  const parts = url.split('.')
  if (parts.length < 2) return { domain: undefined }

  const extension = supraNsExtension
  const isValidExtension = parts.length === 2 ? parts[1] === extension : parts[2] === extension

  if (isValidExtension) {
    const [subdomain, domain] = parts.length === 3 ? parts : [null, parts[0]]
    return { subdomain, domain, extension }
  } else {
    return { domain: undefined }
  }
}
