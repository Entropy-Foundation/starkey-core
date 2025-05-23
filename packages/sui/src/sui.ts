import { SuiClient } from '@mysten/sui.js/client'
import { NATIVE_COINS, NetworkToken, ReturnTransactionData, TRANSACTION_TYPE, TokenRequestParams } from '@starkey/utils'
import { ethers, toBigInt } from 'ethers'

/**
 * @description Get the custom token details for a specific token contract address.
 * @param {string} contractAddress - The token contract address.
 * @param {string} userAddress - The address of the wallet.
 * @param {string} rpcUrl - The rpc url of network.
 * @returns {TokenResponseData | { error: string }} - An object containing the custom token details or an object with an error message if the token contract address is not valid.
 * @throws {Error} - If the token contract address is not valid.
 */
export async function getCustomToken(params: TokenRequestParams) {
  try {
    const provider = new SuiClient({
      url: params.rpcUrl,
    })
    const tokenInfo = await provider.getCoinMetadata({
      coinType: params.contractAddress,
    })
    if (tokenInfo) {
      let balance = 0
      balance = await getTokenBalance(params)
      const filteredSymbol = tokenInfo?.symbol.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10)

      return {
        title: filteredSymbol,
        subTitle: tokenInfo.name,
        balance: Number(balance),
        decimal: tokenInfo?.decimals ?? '',
        image: tokenInfo?.iconUrl ?? '',
        rawBalance: balance,
      }
    } else {
      return { error: 'Address is incorrect' }
    }
  } catch (error: any) {
    // const match = error.toString().match(/Error: Invalid struct type: (.+?)\. Got/)[0]
    // const errorMessage = match ? match.split(':')[1].trim() : error
    // return { error: errorMessage }
    return { error: 'Address is incorrect' }
  }
}

/**
 * Get the balance of a SUI address for a specific asset.
 * @param userAddress - The address of the wallet.
 * @param params - The asset for which the balance is to be retrieved.
 * @returns The total balance of the specified asset for the given address.
 */
const getTokenBalance = async (params: TokenRequestParams, checkNative?: boolean): Promise<number> => {
  try {
    const suiProvider = new SuiClient({ url: params.rpcUrl })
    const coinType = checkNative
      ? NATIVE_COINS.SUI_COIN
      : params.contractAddress
      ? params.contractAddress
      : NATIVE_COINS.SUI_COIN

    let { totalBalance } = await suiProvider.getBalance({
      owner: params.userAddress,
      coinType: coinType,
    })
    const bigBalance = totalBalance
    const bigBalanceString = bigBalance.toString()
    // @ts-ignore
    totalBalance = toBigInt(bigBalanceString)
    // @ts-ignore
    return totalBalance
  } catch (error: any) {
    return 0
  }
}

/**
 * Get the SUI transactions for a specific address.
 * @param network - The network type.
 * @param address - The address of the wallet.
 * @param contractAddress - The address of the contract (optional).
 * @returns An array of transaction objects.
 */
export const getSuiTransactions = async (asset: NetworkToken) => {
  let transactions: Array<ReturnTransactionData> = []

  try {
    const suiProvider = new SuiClient({ url: asset.providerNetworkRPC_URL })
    const paginationCount = 20

    const commonQueryOptions = {
      options: {
        showBalanceChanges: true,
        showEffects: true,
        showInput: true,
      },
      limit: paginationCount,
      order: 'descending' as const,
    }

    const [fromBlocks, toBlocks] = await Promise.all([
      suiProvider.queryTransactionBlocks({
        filter: { FromAddress: asset?.address },
        ...commonQueryOptions,
      }),
      suiProvider.queryTransactionBlocks({
        filter: { ToAddress: asset?.address },
        ...commonQueryOptions,
      }),
    ])

    const transactionList: any = [...fromBlocks?.data, ...toBlocks?.data]
    const seen = new Set()

    for (const obj of transactionList) {
      const txnHash = obj?.digest
      if (!txnHash || seen.has(txnHash)) continue

      const { value, functionName, toAddress, transactionType } = buildTransactionData(obj, asset, false)

      if (value) {
        transactions.push(formatedResponse(obj, toAddress, value, asset, transactionType, functionName, false))
      }

      seen.add(txnHash)
    }

    transactions.sort((a, b) => Number(b.time) - Number(a.time))
    const filtered = asset?.tokenContractAddress
      ? transactions.filter((tx) => tx.functionName === asset.tokenContractAddress)
      : transactions.filter((tx) => tx.functionName === '')

    return filtered
  } catch (_) {}
}

/**
 * Get a Sui transaction using a specific hash.
 * @param transactionHash - The hash of the transaction.
 * @returns An object containing the transaction details.
 */
export const getSuiTransactionDetail = async (transactionHash: string, asset: NetworkToken) => {
  try {
    const suiProvider = new SuiClient({ url: asset.providerNetworkRPC_URL })
    const transactionBlock = await suiProvider.getTransactionBlock({
      digest: transactionHash,
      options: {
        showBalanceChanges: true,
        showEffects: true,
        showInput: true,
      },
    })

    const { toAddress, value, transactionType, functionName } = buildTransactionData(transactionBlock, asset, true)
    const details = formatedResponse(transactionBlock, toAddress, value, asset, transactionType, functionName, true)
    return details
  } catch (_) {}
  return null
}

function formatedResponse(
  transactionDetail: any,
  toAddress: string,
  value: string,
  asset: NetworkToken,
  transactionType: TRANSACTION_TYPE,
  functionName: string,
  isDetail: boolean
) {
  let transaction: ReturnTransactionData = {
    blockNumber: transactionDetail?.checkpoint,
    time: transactionDetail?.timestampMs ? (Number(transactionDetail?.timestampMs ?? 0) / 1000).toString() : '',
    hash: transactionDetail?.digest,
    nonce: '',
    from: transactionDetail?.transaction?.data?.sender ?? '',
    to: toAddress ?? '',
    value: value,
    gas: '',
    gasPrice: transactionDetail?.transaction?.data?.gasData?.price ?? '0',
    gasUsed: '',
    cumulativeGasUsed: '',
    tokenDecimal: asset.decimal,
    transactionType,
  }
  if (isDetail) {
    const gasPrice = transactionDetail?.transaction?.data?.gasData?.price
    transaction.networkFees = gasPrice ? ethers.formatUnits(gasPrice, 9) : '0'
    transaction.title = asset.title
  } else {
    transaction.functionName = functionName
  }
  return transaction
}

function buildTransactionData(obj: any, asset: NetworkToken, isDetail: boolean) {
  let toAddress = ''
  let functionName = ''
  let value = ''
  let transactionType = TRANSACTION_TYPE.SEND_RECEIVED

  const inputs = obj?.transaction?.data?.transaction?.inputs
  const inputAddress = inputs?.find((i: { valueType: string }) => i.valueType === 'address')?.value
  const inputAmount = inputs?.find((i: { valueType: string }) => i.valueType === 'u64')?.value

  toAddress = inputAddress || ''

  if (obj?.balanceChanges?.length) {
    for (const balanceChange of obj?.balanceChanges) {
      const amount = inputAmount
      value = amount ? ethers.formatUnits(amount, asset.decimal ?? 9) : '0'
      if (isDetail || (!isDetail && !balanceChange?.coinType?.includes('sui::SUI'))) {
        functionName = balanceChange?.coinType ?? ''
      }
    }

    const hasMoveCall = obj?.transaction?.data?.transaction?.transactions?.some((tx: any) =>
      tx.hasOwnProperty('MoveCall')
    )

    if (hasMoveCall) {
      const coinType = asset?.tokenContractAddress ?? NATIVE_COINS.SUI_COIN
      const matched = obj?.balanceChanges.find(
        (b: any) => b?.owner?.AddressOwner === asset?.address && b?.coinType === coinType
      )

      if (matched) {
        value = ethers.formatUnits(matched.amount, asset.decimal ?? 9)
        functionName = asset?.tokenContractAddress ? coinType : ''
        transactionType = TRANSACTION_TYPE.TRANSACTION

        if (isDetail && Array.isArray(obj?.transaction?.data?.transaction?.transactions)) {
          const moveCallTx = obj?.transaction.data.transaction.transactions.find((tx: any) => tx?.MoveCall)
          if (moveCallTx?.MoveCall) {
            const { function: fn, module, package: pkg } = moveCallTx.MoveCall
            toAddress = `${pkg}::${module}::${fn}`
          }
        }
      }
    }
  } else if (!asset?.tokenContractAddress) {
    value = inputAmount ? ethers.formatUnits(inputAmount, asset.decimal ?? 9) : '0'
  }

  return {
    value,
    functionName,
    transactionType,
    toAddress,
  }
}

export const checkSuiTransactionStatus = async (rpcUrl: string, txHash: string) => {
  const suiProvider = new SuiClient({ url: rpcUrl })
  const tx: any = await suiProvider.waitForTransactionBlock({
    digest: txHash,
    options: {
      showEffects: true,
    },
  })
  if (tx?.effects?.status?.status !== 'success') {
    throw new Error('Something went wrong')
  }
}
