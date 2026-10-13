import artifact from './MonveilVerificationRegistry.json';

export const MONVEIL_REGISTRY_ABI = artifact.abi;
export const MONVEIL_REGISTRY_BYTECODE = artifact.bytecode as `0x${string}`;

/**
 * Official Monad Testnet configuration
 * Chain ID: 10143 (0x279F)
 * Currency: MON
 * Explorer: https://testnet.monadexplorer.com
 */
export const MONAD_TESTNET_CHAIN = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://testnet.monadexplorer.com',
    },
  },
  testnet: true,
} as const;

/**
 * Deployed Monveil Verification Registry address on Monad Testnet.
 * Checksummed EIP-55 address.
 */
export const DEFAULT_MONVEIL_REGISTRY_ADDRESS: `0x${string}` =
  '0x8a82a7314fbf17a590420B8d7De3044ab21f633B';

/**
 * Agora AUSD Token contract on Monad Testnet.
 * Checksummed EIP-55 address.
 */
export const DEFAULT_AGORA_AUSD_ADDRESS: `0x${string}` =
  '0x83eF2633E78e7a64B4c7333B32E1858737EB6673';
