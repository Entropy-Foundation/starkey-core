import { NetworkToken, ReturnTransactionData, TRANSACTION_TYPE } from '@starkey/utils'
import { ethers } from 'ethers'

/**
 * Fetches the transactions of a specified address from the Ethereum blockchain.
 *
 * @param {any} provider - The provider object used to connect to the Ethereum network.
 * @param {NetworkToken} asset - The network token object containing information about the token.
 * @returns {Promise<Array<ReturnTransactionData>>} An array of transaction objects, each containing details about a specific transaction.
 */
export const getEthTransactions = async (asset: NetworkToken, apiKey?: string): Promise<ReturnTransactionData[]> => {
  const transactions: ReturnTransactionData[] = []
  try {
    const rpcNetworkName =
      Number(asset.providerNetworkRPC_Network_Name) > 0
        ? Number(asset.providerNetworkRPC_Network_Name)
        : asset.providerNetworkRPC_Network_Name
    let etherscanProvider = new ethers.EtherscanProvider(rpcNetworkName, apiKey)

    const fetchParams: Record<string, any> = {
      action: asset.tokenContractAddress ? 'tokentx' : 'txlist',
      address: asset.address,
      sort: 'desc',
      page: 1,
      offset: 20,
    }
    if (asset.tokenContractAddress) {
      fetchParams.contractaddress = asset.tokenContractAddress
    }
    const txDataList = await etherscanProvider.fetch('account', fetchParams)

    for (const tx of txDataList) {
      const tokenDecimal = Number((tx.tokenDecimal || asset.decimal) ?? 18)
      const isFailed = tx.isError === '1' && tx.txreceipt_status === '0'
      transactions.push({
        blockNumber: tx.blockNumber,
        time: tx.timeStamp || '',
        hash: tx.hash,
        nonce: tx.nonce,
        from: tx.from,
        to: tx.to,
        value: ethers.formatUnits(tx.value, tokenDecimal),
        gas: ethers.parseUnits(tx.value, 'wei'),
        gasPrice: ethers.parseUnits(tx.gasPrice, 'wei'),
        gasUsed: ethers.parseUnits(tx.gasUsed, 'wei'),
        cumulativeGasUsed: ethers.parseUnits(tx.cumulativeGasUsed, 'wei'),
        tokenDecimal,
        transactionType: TRANSACTION_TYPE.SEND_RECEIVED,
        status: isFailed ? 'Failed' : undefined,
      })
    }
    return transactions
  } catch (error) {
    return []
  }
}
