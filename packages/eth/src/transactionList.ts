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
  const transactions: Array<ReturnTransactionData> = []
  let txDataList: any = []
  try {
    const rpcNetworkName =
      Number(asset.providerNetworkRPC_Network_Name) > 0
        ? Number(asset.providerNetworkRPC_Network_Name)
        : asset.providerNetworkRPC_Network_Name

    let etherscanProvider = new ethers.EtherscanProvider(rpcNetworkName, apiKey)
    if (asset.tokenContractAddress) {
      txDataList = await etherscanProvider.fetch('account', {
        action: 'tokentx',
        address: asset.address,
        sort: 'desc',
        contractaddress: asset.tokenContractAddress,
        page: 1,
        offset: 20,
      })
    } else {
      txDataList = await etherscanProvider.fetch('account', {
        action: 'txlist',
        address: asset.address,
        page: 1,
        offset: 20,
        sort: 'desc',
      })
    }
    for (const txData of txDataList) {
      let transactionStatus: string | undefined = undefined
      if (txData.isError === '1' && txData.txreceipt_status === '0') {
        transactionStatus = 'Failed'
      }

      transactions.push({
        blockNumber: txData.blockNumber,
        time: txData.timeStamp ? txData.timeStamp : '',
        hash: txData.hash,
        nonce: txData.nonce,
        from: txData.from,
        to: txData.to,
        value: ethers.formatUnits(
          txData.value,
          txData.tokenDecimal ? Number(txData.tokenDecimal) : Number(asset.decimal)
        ),
        gas: ethers.parseUnits(txData.value, 'wei'),
        gasPrice: ethers.parseUnits(txData.gasPrice, 'wei'),
        gasUsed: ethers.parseUnits(txData.gasUsed, 'wei'),
        cumulativeGasUsed: ethers.parseUnits(txData.cumulativeGasUsed, 'wei'),
        tokenDecimal: Number(txData.tokenDecimal || asset.decimal),
        transactionType: TRANSACTION_TYPE.SEND_RECEIVED,
        status: transactionStatus,
      })
    }
    return transactions
  } catch (error) {
    return []
  }
}
