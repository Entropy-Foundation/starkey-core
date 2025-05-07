import BN from 'bn.js'
import { ethers } from 'ethers'

const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

interface TransferEvent {
  from: string
  to: string
  value: string
  tokenAddress: string
}
interface TokenBalanceChange {
  tokenAddress: string
  balanceBefore: string
  balanceAfter: string
  balanceChange: string
}
interface EventResponse {
  ethBalanceBefore: string
  ethBalanceAfter: string
  ethBalanceChange: string
  tokenBalanceChanges: TokenBalanceChange[]
  transferEvents: TransferEvent[]
}

interface IERC20 {
  balanceOf(address: string, overrides?: { blockTag?: number }): Promise<string>
}

async function getTransactionReceipt(provider: any, transactionHash: string): Promise<any> {
  try {
    const receipt = await provider.getTransactionReceipt(transactionHash)
    if (!receipt) {
      return null
    }
    return receipt
  } catch (error) {
    return null
  }
}
function parseTransferEvent(provider: any, log: any): TransferEvent | null {
  try {
    const abi = ['event Transfer(address indexed from, address indexed to, uint256 value)']

    // Create an Interface directly using ethers (no need for a separate package)
    const iface = new ethers.Interface(abi)

    // Decode the log using the Interface
    const decodedLog = iface.parseLog({
      data: log.data,
      topics: log.topics,
    })

    // Ensure decodedLog.args has the correct structure
    const transferEvent: TransferEvent = {
      from: decodedLog?.args.from,
      to: decodedLog?.args.to,
      value: decodedLog?.args.value,
      tokenAddress: log.address,
    }

    return transferEvent
  } catch (error) {
    return null
  }
}
async function getEthBalance(provider: any, address: string, blockNumber: number): Promise<string> {
  try {
    const balance = await provider.getBalance(address, blockNumber)
    return ethers.formatUnits(balance.toString(), 18)
  } catch (error) {
    return '0'
  }
}

async function getTokenBalance(
  provider: any,
  address: string,
  tokenAddress: string,
  blockNumber: number
): Promise<string> {
  try {
    const abi = [
      {
        inputs: [{ name: '_owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: 'balance', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ]

    const tokenContract = new ethers.Contract(tokenAddress, abi, provider) as unknown as IERC20
    const balance = await tokenContract.balanceOf(address, { blockTag: blockNumber })

    return balance
  } catch (error) {
    return '0'
  }
}
export async function getTokenBalanceChange(
  provider: any,
  transactionHash: string,
  address: string
): Promise<EventResponse | null> {
  try {
    const receipt = await getTransactionReceipt(provider, transactionHash)
    if (!receipt) {
      return null
    }
    const transferEvents: TransferEvent[] = []
    const tokenAddresses: Set<string> = new Set()
    // Get block number of the transaction
    const blockNumber = Number(receipt.blockNumber)
    // Get ETH balance before and after the transaction
    const ethBalanceBefore = await getEthBalance(provider, address, blockNumber - 1)
    const ethBalanceAfter = await getEthBalance(provider, address, blockNumber)

    // Convert ETH values to Wei (BigInt)
    const weiBalanceAfter = ethers.parseUnits(ethBalanceAfter, 18) // BigInt
    const weiBalanceBefore = ethers.parseUnits(ethBalanceBefore, 18) // BigInt

    const ethBalanceChange = new BN(weiBalanceAfter.toString()).sub(new BN(weiBalanceBefore.toString())).toString()

    receipt.logs.forEach((log: any) => {
      if (log.topics && log.topics.includes(TRANSFER_EVENT_SIGNATURE)) {
        const transferEvent = parseTransferEvent(provider, log)
        if (transferEvent) {
          transferEvents.push(transferEvent)
          tokenAddresses.add(transferEvent.tokenAddress)
        }
      }
    })
    const tokenBalanceChanges: TokenBalanceChange[] = []
    for (const tokenAddress of tokenAddresses) {
      const tokenBalanceBefore = await getTokenBalance(provider, address, tokenAddress, blockNumber - 1)
      const tokenBalanceAfter = await getTokenBalance(provider, address, tokenAddress, blockNumber)
      const tokenBalanceChange = new BN(tokenBalanceAfter).sub(new BN(tokenBalanceBefore)).toString()
      tokenBalanceChanges.push({
        tokenAddress,
        balanceBefore: tokenBalanceBefore,
        balanceAfter: tokenBalanceAfter,
        balanceChange: tokenBalanceChange,
      })
    }
    tokenBalanceChanges.push({
      tokenAddress: '0x0000000000000000000000000000000000000000',
      balanceBefore: ethBalanceBefore,
      balanceAfter: ethBalanceAfter,
      balanceChange: ethBalanceChange,
    })

    return {
      ethBalanceBefore,
      ethBalanceAfter,
      ethBalanceChange: ethers.formatUnits(ethBalanceChange, 18),
      tokenBalanceChanges,
      transferEvents,
    }
  } catch (error) {
    return null
  }
}
