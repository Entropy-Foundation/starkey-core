export enum NATIVE_COINS {
  APTOS_COIN = '0x1::aptos_coin::AptosCoin',
  SOLANA_COIN = '11111111111111111111111111111111',
  SUI_COIN = '0x2::sui::SUI',
  SUPRA_COIN = '0x1::supra_coin::SupraCoin',
}

export enum TRANSACTION_TYPE {
  TRANSACTION = 'transaction',
  SEND_RECEIVED = 'send_received',
  STAKE = 'stake',
  REQUEST_TO_UNSTAKE = 'request_to_unstake',
  UNSTAKE = 'unstake',
}

export enum SUPRA_EVENT_TYPES {
  ADD_STAKE_EVENT = '0x1::pbo_delegation_pool::AddStakeEvent',
  UNLOCK_STAKE_EVENT = '0x1::pbo_delegation_pool::UnlockStakeEvent',
  WITHDRAW_STAKE_EVENT = '0x1::pbo_delegation_pool::WithdrawStakeEvent',
  VEST_EVENT = '0x1::vesting_without_staking::VestEvent',
  GENESIS_VAULT_USER_DEPOSIT_EVENT = '::genesis_vault::UserDepositEvent',
  KYC_DEPOSIT_SUPRA_VALUT_EVENT = '0x9203362d20c1a9e034b1be4c979d76b6fc4cc91dda01a0f1537d169064bfcb96::Vault::DepositSupraInVaultEvent',
  COIN_DEPOSIT_EVENT = '0x1::coin::CoinDeposit',
  FUNCTION_WITHDRAW_EVENT = '0x1::fungible_asset::Withdraw',
}
