import { getFallbackProvider, getRpcProvider, setRpcProvider } from '@starkey/rpcfallback'
import { NetworkToken, ReturnTransactionData, TRANSACTION_TYPE } from '@starkey/utils'
import { ZeroAddress, ethers } from 'ethers'
import { getTokenBalanceChange } from './ethereumParser'

const getRpcProviderData = async (asset: NetworkToken) => {
  let provider = getRpcProvider('ETH', asset.providerNetworkRPC_URL)
  if (!provider) {
    provider = await getFallbackProvider('ETH', {
      rpcUrl: asset.providerNetworkRPC_URL,
      chainId: Number(asset.providerNetworkRPC_Network_Name),
    })
    setRpcProvider('ETH', asset.providerNetworkRPC_URL, provider)
  }

  provider = provider
  return provider
}

/**
 * Get the fee data.
 * @returns {Promise<any>} - A promise that resolves to the fee data if the request is successful, or rejects with an error if the request fails.
 */
const getFeeData = async (asset: NetworkToken) => {
  const provider = await getRpcProviderData(asset)
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
  const provider = await getRpcProviderData(asset)
  return new Promise((resolve, reject) => {
    provider
      .getTransaction(transactionHash)
      .then(async (txData: any) => {
        let transactionType = TRANSACTION_TYPE.SEND_RECEIVED
        let toAddress = txData.to
        let fromAddress = txData.from
        const res = await provider.getTransactionReceipt(transactionHash)
        const address = asset.address.toLowerCase()
        let log: any
        const decimals = asset.decimal ?? 6
        let value = ethers.formatUnits(txData.value, txData.tokenDecimal)
        if (asset.tokenContractAddress) {
          const parser = await getTokenBalanceChange(provider, transactionHash, address)
          if (parser && parser.transferEvents) {
            let filteredTransfer
            if (parser.tokenBalanceChanges.length === 2) {
              // normal send_receive
              filteredTransfer = parser.transferEvents.find(
                (event: any) =>
                  (event.from.toLowerCase() === address && event.to.toLowerCase() !== ZeroAddress) ||
                  (event.to.toLowerCase() === address && event.from.toLowerCase() !== ZeroAddress)
              )
              if (!filteredTransfer) {
                // swap and other transactions
                filteredTransfer = parser.transferEvents.find(
                  (event: any) =>
                    event.to.toLowerCase() === address &&
                    event.tokenAddress.toLowerCase() === asset.tokenContractAddress?.toLowerCase()
                )
              }
            } else {
              // swap and other transactions
              filteredTransfer = parser.transferEvents.find(
                (event: any) =>
                  event.tokenAddress.toLowerCase() === asset.tokenContractAddress?.toLowerCase() &&
                  event.to.toLowerCase() === address.toLowerCase()
              )
              if (!filteredTransfer) {
                filteredTransfer = parser.transferEvents.find(
                  (event: any) => event.tokenAddress.toLowerCase() === asset.tokenContractAddress?.toLowerCase()
                )
              }
            }
            const result = filteredTransfer
              ? { from: filteredTransfer.from, to: filteredTransfer.to, value: filteredTransfer.value }
              : null
            if (result) {
              fromAddress = result.from
              toAddress = result.to
              value = ethers.formatUnits(result.value || '0', decimals)
            }
          }
        }
        let networkFees: string = '0'
        if (res) {
          networkFees = ethers.formatEther(res?.gasPrice * res?.gasUsed)
        }

        const block = await provider.getBlock(txData.blockNumber)
        const feeData: any = await getFeeData(asset)

        // Check transaction status
        let transactionStatus = 'Pending' // Default to pending
        if (res) {
          transactionStatus = res.status === 1 ? 'Success' : 'Failed'
        }
        const tx: any = {
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
        resolve(tx)
      })
      .catch((e: any) => {
        reject(e)
      })
  })
}
