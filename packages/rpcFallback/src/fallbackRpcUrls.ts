export const FALLBACK_RPC_URLS: Record<string, Record<number, string[]>> = {
  ETH: {
    1: [
      'https://rpc.ankr.com/eth',
      'https://ethereum-rpc.publicnode.com',
      'https://ethereum.publicnode.com',
      'https://1rpc.io/eth',
      'https://eth-mainnet.public.blastapi.io',
      'https://ethereum.blockpi.network/v1/rpc/public',
      'https://cloudflare-eth.com',
    ],
    11155111: [
      'https://1rpc.io/sepolia',
      'https://rpc.ankr.com/eth_sepolia',
      'https://sepolia.drpc.org',
      'https://eth-sepolia.public.blastapi.io',
      'https://ethereum-sepolia-rpc.publicnode.com',
    ],
  },
  SUP: {
    6: ['https://rpc-testnet.supra.com', 'https://rpc-wallet-testnet.supra.com'],
    8: ['https://rpc-mainnet.supra.com', 'https://rpc-wallet-mainnet.supra.com'],
  },
}
