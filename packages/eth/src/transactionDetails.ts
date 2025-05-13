import { getFallbackProvider, getRpcProvider, setRpcProvider } from '@starkey/rpcfallback'
import { NetworkToken, ReturnTransactionData, TRANSACTION_TYPE } from '@starkey/utils'
import { ZeroAddress, ethers } from 'ethers'
import { getTokenBalanceChange } from './ethereumParser'

const getRpcProviderData = async (rpcUrl: string, chainId?: string) => {
  let provider = getRpcProvider('ETH', rpcUrl)
  if (!provider) {
    provider = await getFallbackProvider('ETH', {
      rpcUrl: rpcUrl,
      chainId: Number(chainId),
    })
    setRpcProvider('ETH', rpcUrl, provider)
  }

  provider = provider
  return provider
}

/**
 * Get the fee data.
 * @returns {Promise<any>} - A promise that resolves to the fee data if the request is successful, or rejects with an error if the request fails.
 */
const getFeeData = async (asset: NetworkToken) => {
  const provider = await getRpcProviderData(asset.providerNetworkRPC_URL, String(asset.providerNetworkRPC_Network_Name))
  return new Promise((resolve, reject) => {
    provider
      .getFeeData()
      .then((feeData: any) => {
        resolve(feeData)
      })
      .catch((e: any) => {
        reject(e)
      })
  })
}

/**
 * Get the transaction for a specific transaction hash.
 * @param {string} transactionHash - The hash of the transaction.
 * @returns {Promise<any>} - A promise that resolves to the transaction if the transaction is successful, or rejects with an error if the transaction fails.
 */
export const getEthTransactionDetail = async (
  transactionHash: string,
  asset: NetworkToken
): Promise<ReturnTransactionData> => {
  try {
    const provider = await getRpcProviderData(
      asset.providerNetworkRPC_URL,
      String(asset.providerNetworkRPC_Network_Name)
    )
    const txData = await provider.getTransaction(transactionHash)
    const receipt = await provider.getTransactionReceipt(transactionHash)
    const block = await provider.getBlock(txData.blockNumber)
    const feeData: any = await getFeeData(asset)
    const isTokenTransfer = Boolean(asset.tokenContractAddress)
    const address = asset.address.toLowerCase()
    const decimals = asset.decimal ?? 6
    let fromAddress = txData.from
    let toAddress = txData.to
    let value = ethers.formatUnits(txData.value, Number(decimals))
    let transactionType = TRANSACTION_TYPE.SEND_RECEIVED
    let transactionStatus: 'Success' | 'Failed' | 'Pending' = 'Pending'
    let networkFees = '0'

    if (receipt) {
      transactionStatus = receipt.status === 1 ? 'Success' : 'Failed'
      networkFees = ethers.formatEther(receipt.gasUsed * (receipt.effectiveGasPrice ?? txData.gasPrice))
    }

    if (isTokenTransfer) {
      const parser = await getTokenBalanceChange(provider, transactionHash, address)
      if (parser?.transferEvents?.length) {
        const lowerTokenAddress = asset.tokenContractAddress?.toLowerCase()
        const isSimpleTransfer = parser.tokenBalanceChanges.length === 2

        // Define matching conditions
        const matchSendReceive = (event: any) =>
          (event.from.toLowerCase() === address && event.to.toLowerCase() !== ZeroAddress) ||
          (event.to.toLowerCase() === address && event.from.toLowerCase() !== ZeroAddress)

        const matchToAddress = (event: any) =>
          event.to.toLowerCase() === address && event.tokenAddress.toLowerCase() === lowerTokenAddress

        const matchTokenOnly = (event: any) => event.tokenAddress.toLowerCase() === lowerTokenAddress

        // Apply matching logic
        const filteredTransfer =
          parser.transferEvents.find(isSimpleTransfer ? matchSendReceive : matchToAddress) ||
          parser.transferEvents.find(matchTokenOnly)

        if (filteredTransfer) {
          fromAddress = filteredTransfer.from
          toAddress = filteredTransfer.to
          value = ethers.formatUnits(filteredTransfer.value || '0', decimals)
        }
      }
    }

    return {
      blockNumber: txData.blockNumber,
      time: block?.timestamp || '',
      hash: txData.hash,
      nonce: txData.nonce,
      from: fromAddress,
      to: toAddress,
      value: value,
      gas: '',
      gasPrice: txData.gasPrice || feeData.gasPrice,
      gasUsed: '',
      cumulativeGasUsed: '',
      tokenDecimal: asset.decimal,
      networkFees: networkFees,
      title: asset.title,
      transactionType,
      status: transactionStatus,
    }
  } catch (error) {
    throw error
  }
}

export async function checkEthTransactionStatus(rpcUrl: string, txHash: string, chainId?: string): Promise<boolean> {
  try {
    const provider = await getRpcProviderData(rpcUrl, chainId)
    const receipt = await provider.waitForTransaction(txHash, 1, 150000)
    return !!receipt?.status
  } catch (error) {
    return false
  }
}
