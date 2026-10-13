import {
  keccak256,
  stringToBytes,
  verifyTypedData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { Bill, GuardianCheck } from '../domain/types';
import { DEFAULT_MONVEIL_REGISTRY_ADDRESS, MONAD_TESTNET_CHAIN } from '../contracts/registry';

export const TRUSTED_MERCHANTS: Record<string, `0x${string}`> = {
  'The Indigo House · Jaipur': '0x49a12111006630CcdD37916029a8b3e1a545E44E',
  'Blue Courtyard · Udaipur': '0x5C2665e3158c544fa9F200A5aB963507D674bC30',
  'Monsoon Kitchen · Kochi': '0x19E61Afb82F48A631e61ea70cFe3Bf3e30489953',
  'Old City Café · Jaipur': '0x22135D7cCe25E123512aDeA7eFc4834221191567',
};

export const DEFAULT_MERCHANT_KEY: `0x${string}` =
  '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f360ea9';

const EIP712_DOMAIN = {
  name: 'Monveil Verification Protocol',
  version: '1',
  chainId: BigInt(MONAD_TESTNET_CHAIN.id),
  verifyingContract: DEFAULT_MONVEIL_REGISTRY_ADDRESS,
} as const;

const EIP712_TYPES = {
  Bill: [
    { name: 'id', type: 'string' },
    { name: 'merchantName', type: 'string' },
    { name: 'currency', type: 'string' },
    { name: 'subtotalPaise', type: 'uint256' },
    { name: 'taxPaise', type: 'uint256' },
    { name: 'signedTotalPaise', type: 'uint256' },
    { name: 'createdAt', type: 'uint256' },
    { name: 'expiresAt', type: 'uint256' },
  ],
} as const;

export function getMerchantAddress(name: string): `0x${string}` | undefined {
  const normalized = Object.keys(TRUSTED_MERCHANTS).find(
    (k) => k.toLowerCase() === name.trim().toLowerCase()
  );
  return normalized ? TRUSTED_MERCHANTS[normalized] : undefined;
}

export function canonicalBillJson(bill: Bill): string {
  return JSON.stringify({
    id: bill.id,
    merchantName: bill.merchantName,
    currency: bill.currency,
    items: bill.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPricePaise: item.unitPricePaise,
    })),
    taxBasisPoints: bill.taxBasisPoints,
    subtotalPaise: bill.subtotalPaise,
    taxPaise: bill.taxPaise,
    signedTotalPaise: bill.signedTotalPaise,
    amountPaise: bill.amountPaise,
    createdAt: bill.createdAt,
    expiresAt: bill.expiresAt,
    scenario: bill.scenario,
  });
}

/**
 * Signs a bill using EIP-712 structured data with the merchant POS private key.
 */
export async function signBillEip712(
  bill: Bill,
  privateKey: `0x${string}` = DEFAULT_MERCHANT_KEY
): Promise<{ signature: `0x${string}`; merchantAddress: `0x${string}` }> {
  const account = privateKeyToAccount(privateKey);
  const signature = await account.signTypedData({
    domain: EIP712_DOMAIN,
    types: EIP712_TYPES,
    primaryType: 'Bill',
    message: {
      id: bill.id,
      merchantName: bill.merchantName,
      currency: bill.currency,
      subtotalPaise: BigInt(bill.subtotalPaise),
      taxPaise: BigInt(bill.taxPaise),
      signedTotalPaise: BigInt(bill.signedTotalPaise),
      createdAt: BigInt(bill.createdAt),
      expiresAt: BigInt(bill.expiresAt),
    },
  });
  return { signature, merchantAddress: account.address };
}

/**
 * Computes a privacy-preserving keccak256 report hash for on-chain commitment.
 * Contains only cryptographically digested summaries; no sensitive customer receipt text is revealed.
 */
export function computeReportHash(bill: Bill, checks: GuardianCheck[]): `0x${string}` {
  const checkSummary = checks.map((c) => `${c.id}:${c.status}`).join(';');
  const payload = `${bill.id}|${bill.merchantName}|${bill.signedTotalPaise}|${bill.amountPaise}|${checkSummary}`;
  return keccak256(stringToBytes(payload));
}

/**
 * Cryptographic verification of merchant signature (supports both EIP-712 and canonical HMAC).
 */
export async function verifyBillSignature(
  bill: Bill,
  hmacVerifier?: (bill: Bill) => Promise<boolean>
): Promise<{ valid: boolean; method: 'eip712' | 'hmac' | 'invalid'; signer?: string }> {
  // If signature starts with 0x and is 65-byte ECDSA (132 chars)
  if (bill.signature && bill.signature.startsWith('0x') && bill.signature.length === 132) {
    try {
      const trustedAddress = getMerchantAddress(bill.merchantName);
      if (!trustedAddress) {
        return { valid: false, method: 'eip712', signer: 'unregistered_merchant' };
      }

      const isValid = await verifyTypedData({
        address: trustedAddress,
        domain: EIP712_DOMAIN,
        types: EIP712_TYPES,
        primaryType: 'Bill',
        message: {
          id: bill.id,
          merchantName: bill.merchantName,
          currency: bill.currency,
          subtotalPaise: BigInt(bill.subtotalPaise),
          taxPaise: BigInt(bill.taxPaise),
          signedTotalPaise: BigInt(bill.signedTotalPaise),
          createdAt: BigInt(bill.createdAt),
          expiresAt: BigInt(bill.expiresAt),
        },
        signature: bill.signature as `0x${string}`,
      });

      return { valid: isValid, method: 'eip712', signer: trustedAddress };
    } catch {
      return { valid: false, method: 'eip712' };
    }
  }

  // Fallback to HMAC verifier for backwards compatibility
  if (hmacVerifier) {
    const valid = await hmacVerifier(bill);
    return { valid, method: 'hmac' };
  }

  return { valid: false, method: 'invalid' };
}
