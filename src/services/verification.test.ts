// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { asPaise } from '../domain/money';
import {
  verifyBillSignature,
  computeReportHash,
  TRUSTED_MERCHANTS,
} from './merchantRegistry';
import {
  generateKimiExplanationServer,
  getDeterministicFallbackExplanation,
} from './kimiExplanation';
import { encryptReceiptWithPrf } from './passkey';
import {
  createSampleBill,
  runGuardianChecks,
  signBill,
} from './mockApi';

describe('MONVEIL Comprehensive Verification & Bounty Test Suite', () => {
  describe('1. Five Guardian Verification Checks', () => {
    it('passes honest bill across all 5 checks', async () => {
      const bill = await createSampleBill('honest');
      const result = await runGuardianChecks(bill);

      expect(result.verdict).toBe('safe');
      expect(result.checks).toHaveLength(5);
      expect(result.checks.every((c) => c.status === 'pass')).toBe(true);
    });

    it('blocks tampered QR with exact amount mismatch check', async () => {
      const bill = await createSampleBill('tampered');
      const result = await runGuardianChecks(bill);

      expect(result.verdict).toBe('blocked');
      expect(result.reasonCode).toBe('amount');
      const amountCheck = result.checks.find((c) => c.id === 'amount');
      expect(amountCheck?.status).toBe('blocked');
    });

    it('blocks expired bill with timestamp check', async () => {
      const bill = await createSampleBill('expired');
      const result = await runGuardianChecks(bill);

      expect(result.verdict).toBe('blocked');
      expect(result.reasonCode).toBe('expiry');
      const expiryCheck = result.checks.find((c) => c.id === 'expiry');
      expect(expiryCheck?.status).toBe('blocked');
    });

    it('blocks replayed bill with duplicate detection', async () => {
      const bill = await createSampleBill('replay');
      const result = await runGuardianChecks(bill);

      expect(result.verdict).toBe('blocked');
      expect(result.reasonCode).toBe('duplicate');
      const dupCheck = result.checks.find((c) => c.id === 'duplicate');
      expect(dupCheck?.status).toBe('blocked');
    });

    it('blocks over-limit bill exceeding user spending limits', async () => {
      const bill = await createSampleBill('over-limit');
      const result = await runGuardianChecks(bill);

      expect(result.verdict).toBe('blocked');
      expect(result.reasonCode).toBe('rules');
      const rulesCheck = result.checks.find((c) => c.id === 'rules');
      expect(rulesCheck?.status).toBe('blocked');
    });
  });

  describe('2. Cryptographic EIP-712 Merchant Signing & Seal Verification', () => {
    it('signs and verifies authentic EIP-712 merchant bill against trusted registry', async () => {
      const bill = await signBill(
        [{ id: 'room', name: 'Deluxe Room', quantity: 1, unitPricePaise: asPaise(91000) }],
        { merchantName: 'The Indigo House · Jaipur', useEip712: true }
      );

      expect(bill.signature).toMatch(/^0x[a-fA-F0-9]{130}$/);

      const verification = await verifyBillSignature(bill);
      expect(verification.valid).toBe(true);
      expect(verification.method).toBe('eip712');
      expect(verification.signer).toBe(TRUSTED_MERCHANTS['The Indigo House · Jaipur']);
    });

    it('rejects tampered amount on EIP-712 signed bill', async () => {
      const bill = await signBill(
        [{ id: 'room', name: 'Deluxe Room', quantity: 1, unitPricePaise: asPaise(91000) }],
        { merchantName: 'The Indigo House · Jaipur', useEip712: true }
      );

      // Malicious actor tampers with amount from ₹955.50 (95550 paise) to ₹1,250
      const tamperedBill = { ...bill, amountPaise: asPaise(125000), signedTotalPaise: asPaise(125000) };
      const verification = await verifyBillSignature(tamperedBill);

      expect(verification.valid).toBe(false);
    });

    it('rejects bill signed by unregistered or untrusted merchant', async () => {
      const bill = await signBill(
        [{ id: 'item1', name: 'Coffee', quantity: 1, unitPricePaise: asPaise(50000) }],
        { merchantName: 'Untrusted Rogue Store · Unknown', useEip712: true }
      );

      const verification = await verifyBillSignature(bill);
      expect(verification.valid).toBe(false);
      expect(verification.signer).toBe('unregistered_merchant');
    });
  });

  describe('3. Privacy-Preserving Off-Chain Receipts & Report Hashes', () => {
    it('generates a 32-byte report hash without leaking raw line items', async () => {
      const bill = await createSampleBill('honest');
      const result = await runGuardianChecks(bill);
      const reportHash = computeReportHash(bill, result.checks);

      expect(reportHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      // Hash is exactly 32 bytes hex encoded
      expect(reportHash.length).toBe(66);
      // Sensitive string 'Garden room' is not visible in reportHash
      expect(reportHash).not.toContain('Garden room');
    });
  });

  describe('4. Mera PRF Receipt Vault Encryption ("One Passkey, Many Keys")', () => {
    it('encrypts private receipt payload using merchant-scoped AES-GCM vault', async () => {
      const receiptData = {
        items: [{ name: 'Secret luxury spa package', price: 50000 }],
        tax: 2500,
        personalNote: 'Room 304, special anniversary setup',
      };

      const vault = await encryptReceiptWithPrf(receiptData, 'The Indigo House · Jaipur');

      expect(vault.ciphertext).toBeDefined();
      expect(vault.ciphertext.length).toBeGreaterThan(20);
      expect(vault.iv).toBeDefined();
      expect(vault.keyFingerprint).toBeDefined();
      expect(vault.merchantScope).toBe('The Indigo House · Jaipur');

      // Assert private information is encrypted and cannot be found in ciphertext
      expect(vault.ciphertext).not.toContain('Secret luxury spa package');
      expect(vault.ciphertext).not.toContain('Room 304');
    });
  });

  describe('5. Kimi AI Explanation & Deterministic Fallbacks', () => {
    it('produces calm, grounded explanation for amount mismatch without accusing merchant', () => {
      const bill = {
        id: 'MV-TAMPER-001',
        merchantName: 'The Indigo House · Jaipur',
        amountPaise: asPaise(125000),
        signedTotalPaise: asPaise(105000),
      } as any;

      const explanation = getDeterministicFallbackExplanation({
        bill,
        verdict: 'blocked',
        reasonCode: 'amount',
      });

      expect(explanation).toContain('₹1,250');
      expect(explanation).toContain('₹1,050');
      expect(explanation).toContain('amounts do not match');
      // Must not accuse merchant of fraud
      expect(explanation.toLowerCase()).not.toContain('thief');
      expect(explanation.toLowerCase()).not.toContain('scam');
    });

    it('falls back seamlessly to deterministic engine when Kimi API credentials are absent', async () => {
      const bill = await createSampleBill('tampered');
      const result = await runGuardianChecks(bill);

      const aiResponse = await generateKimiExplanationServer({
        bill,
        checks: result.checks,
        verdict: result.verdict,
        reasonCode: result.reasonCode,
      });

      expect(aiResponse.source).toBe('deterministic-fallback');
      expect(aiResponse.explanation).toContain('amounts do not match');
    });
  });
});
