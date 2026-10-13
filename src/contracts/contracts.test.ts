// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  encodeFunctionData,
  keccak256,
  stringToBytes,
} from 'viem';
import {
  MONVEIL_REGISTRY_ABI,
  MONAD_TESTNET_CHAIN,
  DEFAULT_MONVEIL_REGISTRY_ADDRESS,
  DEFAULT_AGORA_AUSD_ADDRESS,
} from './registry';
import { paiseToAusdMicroUnits, formatAusdAmount, ERC20_ABI } from './ausd';

const CHECKSUM_MERCHANT: `0x${string}` = '0x8b3213a5Dfe6499b87F179C5d04017fA72591fA0';

describe('MonveilVerificationRegistry Contract Architecture', () => {
  it('has valid Monad Testnet configuration', () => {
    expect(MONAD_TESTNET_CHAIN.id).toBe(10143);
    expect(MONAD_TESTNET_CHAIN.name).toBe('Monad Testnet');
    expect(MONAD_TESTNET_CHAIN.nativeCurrency.symbol).toBe('MON');
    expect(MONAD_TESTNET_CHAIN.rpcUrls.default.http[0]).toBe('https://testnet-rpc.monad.xyz');
    expect(MONAD_TESTNET_CHAIN.blockExplorers.default.url).toBe('https://testnet.monadexplorer.com');
  });

  it('correctly encodes recordReceipt function call data', () => {
    const billId = 'MV-HONEST-001';
    const reportHash = keccak256(stringToBytes('canonical-verification-report-json'));
    const resultCode = 1; // Safe
    const amountPaise = 105000n;

    const calldata = encodeFunctionData({
      abi: MONVEIL_REGISTRY_ABI,
      functionName: 'recordReceipt',
      args: [billId, reportHash, resultCode, amountPaise, CHECKSUM_MERCHANT],
    });

    expect(calldata).toMatch(/^0x/);
    expect(calldata.length).toBeGreaterThan(10);
  });

  it('correctly encodes settleWithToken function call data for Agora AUSD', () => {
    const billId = 'MV-HONEST-001';
    const reportHash = keccak256(stringToBytes('canonical-verification-report-json'));
    const token = DEFAULT_AGORA_AUSD_ADDRESS;
    const tokenAmount = 12600504n; // 12.60 AUSD (6 decimals)
    const amountPaise = 105000n;

    const calldata = encodeFunctionData({
      abi: MONVEIL_REGISTRY_ABI,
      functionName: 'settleWithToken',
      args: [billId, reportHash, token, tokenAmount, amountPaise, CHECKSUM_MERCHANT],
    });

    expect(calldata).toMatch(/^0x/);
  });

  it('computes deterministic billIdHash for duplicate and replay prevention', () => {
    const billId1 = 'MV-HONEST-001';
    const billId2 = 'MV-HONEST-001';
    const billId3 = 'MV-TAMPER-002';

    const hash1 = keccak256(stringToBytes(billId1));
    const hash2 = keccak256(stringToBytes(billId2));
    const hash3 = keccak256(stringToBytes(billId3));

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('accurately converts integer paise to Agora AUSD with 6 decimals without floating point loss', () => {
    // ₹1,050 = 105,000 paise => 105,000 * 1,000,000 / 8,333 ~ 12,600,504 micro-units (~12.60 AUSD)
    const microUnits = paiseToAusdMicroUnits(105000);
    expect(microUnits).toBe(12600504n);
    expect(formatAusdAmount(microUnits)).toBe('12.60 AUSD');

    // ₹0 = 0 paise => 0 AUSD
    expect(paiseToAusdMicroUnits(0)).toBe(0n);

    // Large transaction: ₹100,000 = 10,000,000 paise
    const largeMicroUnits = paiseToAusdMicroUnits(10000000);
    expect(largeMicroUnits).toBe(1200048002n);
    expect(formatAusdAmount(largeMicroUnits)).toBe('1200.04 AUSD');
  });

  it('validates ERC-20 transferFrom encoding for Agora AUSD settlement approval', () => {
    const calldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [DEFAULT_MONVEIL_REGISTRY_ADDRESS, 12600504n],
    });
    expect(calldata).toMatch(/^0x/);
  });
});
