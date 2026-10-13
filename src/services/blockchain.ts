import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hash,
} from 'viem';
import type { Bill, GuardianResult, PaymentReceipt } from '../domain/types';
import {
  MONAD_TESTNET_CHAIN,
  DEFAULT_MONVEIL_REGISTRY_ADDRESS,
  DEFAULT_AGORA_AUSD_ADDRESS,
  MONVEIL_REGISTRY_ABI,
} from '../contracts/registry';
import { ERC20_ABI, paiseToAusdMicroUnits } from '../contracts/ausd';
import { computeReportHash, getMerchantAddress } from './merchantRegistry';

export interface WalletState {
  address: Address | null;
  chainId: number | null;
  connected: boolean;
  isOnMonad: boolean;
  ausdBalance: bigint | null;
  monBalance: bigint | null;
}

export interface SettlementOptions {
  asset: 'AUSD' | 'MON' | 'DEMO';
  payerAddress?: Address;
}

const publicClient = createPublicClient({
  chain: MONAD_TESTNET_CHAIN,
  transport: http(MONAD_TESTNET_CHAIN.rpcUrls.default.http[0]),
});

export async function getMonadRpcBlockNumber(): Promise<bigint | null> {
  try {
    return await publicClient.getBlockNumber();
  } catch {
    return null;
  }
}

export function getExplorerTxUrl(txHash: string): string {
  return `${MONAD_TESTNET_CHAIN.blockExplorers.default.url}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${MONAD_TESTNET_CHAIN.blockExplorers.default.url}/address/${address}`;
}

/**
 * Polls the Monad Testnet RPC for a transaction receipt.
 * Returns the canonical PaymentStatus based on the on-chain result.
 *
 * 'submitted'  — hash exists, block not yet mined
 * 'confirmed'  — mined with status=success
 * 'rejected'   — mined with status=reverted (contract rejected the call)
 * 'failed'     — RPC error or hash not found after timeout
 */
export async function getOnChainTxStatus(
  txHash: Hash
): Promise<'submitted' | 'confirmed' | 'rejected' | 'failed'> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (!receipt) return 'submitted';
    return receipt.status === 'success' ? 'confirmed' : 'rejected';
  } catch {
    return 'failed';
  }
}

export async function checkWalletConnection(): Promise<WalletState> {
  if (typeof window === 'undefined' || !(window as unknown as { ethereum?: unknown }).ethereum) {
    return {
      address: null,
      chainId: null,
      connected: false,
      isOnMonad: false,
      ausdBalance: null,
      monBalance: null,
    };
  }

  try {
    const ethereum = (window as unknown as { ethereum: { request: (args: unknown) => Promise<unknown> } }).ethereum;
    const accounts = (await ethereum.request({ method: 'eth_accounts' })) as string[];
    const chainIdHex = (await ethereum.request({ method: 'eth_chainId' })) as string;
    const chainId = Number.parseInt(chainIdHex, 16);

    if (!accounts || accounts.length === 0) {
      return {
        address: null,
        chainId,
        connected: false,
        isOnMonad: chainId === MONAD_TESTNET_CHAIN.id,
        ausdBalance: null,
        monBalance: null,
      };
    }

    const address = accounts[0] as Address;
    const isOnMonad = chainId === MONAD_TESTNET_CHAIN.id;

    let monBalance: bigint | null = null;
    let ausdBalance: bigint | null = null;

    if (isOnMonad) {
      try {
        monBalance = await publicClient.getBalance({ address });
      } catch {
        // RPC fallback
      }

      try {
        ausdBalance = await publicClient.readContract({
          address: DEFAULT_AGORA_AUSD_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        });
      } catch {
        // Token contract fallback
      }
    }

    return {
      address,
      chainId,
      connected: true,
      isOnMonad,
      ausdBalance,
      monBalance,
    };
  } catch {
    return {
      address: null,
      chainId: null,
      connected: false,
      isOnMonad: false,
      ausdBalance: null,
      monBalance: null,
    };
  }
}

export async function requestWalletConnect(): Promise<WalletState> {
  if (typeof window === 'undefined' || !(window as unknown as { ethereum?: unknown }).ethereum) {
    throw new Error('No EVM wallet detected. Install MetaMask, Rabby, or a Web3 browser extension.');
  }

  const ethereum = (window as unknown as { ethereum: { request: (args: unknown) => Promise<unknown> } }).ethereum;
  await ethereum.request({ method: 'eth_requestAccounts' });

  // Prompt chain switch if not on Monad Testnet
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${MONAD_TESTNET_CHAIN.id.toString(16)}` }],
    });
  } catch (switchError: unknown) {
    // If chain has not been added to provider
    if ((switchError as { code: number }).code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${MONAD_TESTNET_CHAIN.id.toString(16)}`,
            chainName: MONAD_TESTNET_CHAIN.name,
            nativeCurrency: MONAD_TESTNET_CHAIN.nativeCurrency,
            rpcUrls: MONAD_TESTNET_CHAIN.rpcUrls.default.http,
            blockExplorerUrls: [MONAD_TESTNET_CHAIN.blockExplorers.default.url],
          },
        ],
      });
    }
  }

  return checkWalletConnection();
}

/**
 * Executes on-chain payment or record settlement on Monad Testnet.
 * If wallet is connected, prompts user signature for real transaction.
 * If not connected, returns typed simulated testnet receipt with clear distinction.
 */
export async function executeMonadSettlement(
  bill: Bill,
  result: GuardianResult,
  options: SettlementOptions = { asset: 'AUSD' }
): Promise<PaymentReceipt> {
  if (result.verdict === 'blocked') {
    throw new Error('Guardian prevented on-chain settlement: bill is blocked.');
  }

  const reportHash = computeReportHash(bill, result.checks);
  const merchantAddress = getMerchantAddress(bill.merchantName) ?? '0x8b3213a5Dfe6499b87F179C5d04017fA72591fA0';
  const now = Date.now();

  const wallet = await checkWalletConnection();

  if (wallet.connected && wallet.address && wallet.isOnMonad) {
    const ethereum = (window as unknown as { ethereum: unknown }).ethereum;
    const walletClient = createWalletClient({
      chain: MONAD_TESTNET_CHAIN,
      transport: custom(ethereum as { request: (args: unknown) => Promise<unknown> }),
    });

    let txHash: Hash;

    if (options.asset === 'AUSD') {
      const ausdMicroUnits = paiseToAusdMicroUnits(bill.amountPaise);

      // Settle via Monveil registry with Agora AUSD token transfer
      txHash = await walletClient.writeContract({
        account: wallet.address,
        address: DEFAULT_MONVEIL_REGISTRY_ADDRESS,
        abi: MONVEIL_REGISTRY_ABI,
        functionName: 'settleWithToken',
        args: [
          bill.id,
          reportHash,
          DEFAULT_AGORA_AUSD_ADDRESS,
          ausdMicroUnits,
          BigInt(bill.amountPaise),
          merchantAddress,
        ],
      });
    } else if (options.asset === 'MON') {
      // Settle native MON (approximate benchmark: ₹1,050 ~ 0.05 MON on testnet)
      const weiAmount = (BigInt(bill.amountPaise) * 10n ** 18n) / (8300n * 100n);
      txHash = await walletClient.writeContract({
        account: wallet.address,
        address: DEFAULT_MONVEIL_REGISTRY_ADDRESS,
        abi: MONVEIL_REGISTRY_ABI,
        functionName: 'settleWithNative',
        args: [
          bill.id,
          reportHash,
          BigInt(bill.amountPaise),
          merchantAddress,
        ],
        value: weiAmount,
      });
    } else {
      // Record verification report only
      txHash = await walletClient.writeContract({
        account: wallet.address,
        address: DEFAULT_MONVEIL_REGISTRY_ADDRESS,
        abi: MONVEIL_REGISTRY_ABI,
        functionName: 'recordReceipt',
        args: [
          bill.id,
          reportHash,
          1, // ResultCode.Safe
          BigInt(bill.amountPaise),
          merchantAddress,
        ],
      });
    }

    const explorerUrl = getExplorerTxUrl(txHash);

    // Real on-chain transaction — populate explicit tx fields
    return {
      id: `TX-${txHash.slice(0, 10).toUpperCase()}`,
      bill,
      status: 'submitted', // DemoContext will poll/update to 'confirmed' once mined
      submittedAt: now,
      isSimulated: false,
      txHash,
      explorerUrl,
      networkLabel: `Monad Testnet (Chain ID ${MONAD_TESTNET_CHAIN.id})`,
      registryContract: DEFAULT_MONVEIL_REGISTRY_ADDRESS,
      // Keep deprecated fields for backward-compat with existing ReceiptPage reads
      detailHash: txHash,
      detailContract: DEFAULT_MONVEIL_REGISTRY_ADDRESS,
      detailNetwork: `Monad Testnet (${MONAD_TESTNET_CHAIN.id})`,
      simulatedProofId: txHash,
      simulatedProofUrl: explorerUrl,
    };
  }

  // ── Simulated receipt (no wallet connected) ──────────────────────────────
  // No tokens were moved. No transaction was broadcast.
  // Never set isSimulated=false here; never generate a fake 0x…64 tx hash.
  return {
    id: `SIM-${now.toString(36).toUpperCase()}`,
    bill,
    status: 'confirmed', // local demo flow resolves immediately
    submittedAt: now - 350,
    confirmedAt: now,
    isSimulated: true,
    txHash: undefined,
    explorerUrl: undefined,
    networkLabel: 'Monad Testnet (no wallet — simulated)',
    registryContract: DEFAULT_MONVEIL_REGISTRY_ADDRESS,
    simulatedProofId: `proof-${bill.id.toLowerCase()}`,
    simulatedProofUrl: `#simulated-proof-${bill.id.toLowerCase()}`,
    // Deprecated fields — kept for ReceiptPage backward-compat
    detailHash: `sim-${reportHash.slice(2, 18)}`,
    detailContract: `Guardian · ${DEFAULT_MONVEIL_REGISTRY_ADDRESS.slice(0, 10)}… (simulated)`,
    detailNetwork: 'Monad Testnet (Simulated / Unconnected Wallet)',
  };
}
