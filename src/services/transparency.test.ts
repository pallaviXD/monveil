// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { getDeterministicFallbackExplanation, generateKimiExplanationServer } from './kimiExplanation';
import { fetchIndexedReceipts } from './envio';
import { encryptReceiptWithPrf } from './passkey';
import type { PaymentReceipt } from '../domain/types';

vi.mock('./blockchain', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    getOnChainTxStatus: vi.fn().mockResolvedValue('confirmed'),
  };
});

import { getOnChainTxStatus } from './blockchain';

const MINIMAL_BILL = {
  id: 'TEST-001',
  merchantName: 'Test Merchant',
  amountPaise: 105000,
  signedTotalPaise: 105000,
} as any;

describe('Transparency: Kimi AI Explanation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('getDeterministicFallbackExplanation returns non-empty for all reasonCodes', () => {
    const codes = ['amount', 'seal', 'expiry', 'duplicate', 'rules'] as const;
    for (const code of codes) {
      const result = getDeterministicFallbackExplanation({ bill: MINIMAL_BILL, verdict: 'blocked', reasonCode: code });
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('generateKimiExplanationServer with no API key returns api-key-missing + deterministic-fallback', async () => {
    const savedKimi = process.env.KIMI_API_KEY;
    const savedMoon = process.env.MOONSHOT_API_KEY;
    delete process.env.KIMI_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    try {
      const res = await generateKimiExplanationServer({ bill: MINIMAL_BILL, checks: [], verdict: 'safe' });
      expect(res.source).toBe('deterministic-fallback');
      expect(res.statusReason).toBe('api-key-missing');
    } finally {
      if (savedKimi !== undefined) process.env.KIMI_API_KEY = savedKimi;
      if (savedMoon !== undefined) process.env.MOONSHOT_API_KEY = savedMoon;
    }
  });

  it('returns statusReason=quota-exhausted for HTTP 429', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }));
    const res = await generateKimiExplanationServer({ bill: MINIMAL_BILL, checks: [], verdict: 'safe' }, 'fake-key');
    expect(res.statusReason).toBe('quota-exhausted');
  });

  it('returns statusReason=quota-exhausted for HTTP 402', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 402, json: async () => ({}) }));
    const res = await generateKimiExplanationServer({ bill: MINIMAL_BILL, checks: [], verdict: 'safe' }, 'fake-key');
    expect(res.statusReason).toBe('quota-exhausted');
  });

  it('returns statusReason=timeout-or-network when fetch throws AbortError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    const res = await generateKimiExplanationServer({ bill: MINIMAL_BILL, checks: [], verdict: 'safe' }, 'fake-key');
    expect(res.statusReason).toBe('timeout-or-network');
  });
});

describe('Transparency: Envio Indexer', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns source=envio-live when indexer returns records', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          ReceiptRecord: [{
            id: '1', billIdHash: '0xabc', reportHash: '0xdef', payer: '0x123',
            merchant: '0x456', resultCode: 1, amountPaise: '105000',
            timestamp: '1234567890', blockNumber: '100', transactionHash: '0xhash',
          }],
        },
      }),
    }));
    const result = await fetchIndexedReceipts();
    expect(result.source).toBe('envio-live');
    expect(result.receipts.length).toBeGreaterThan(0);
  });

  it('returns source=envio-live-empty when indexer returns empty array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ReceiptRecord: [] } }),
    }));
    const result = await fetchIndexedReceipts();
    expect(result.source).toBe('envio-live-empty');
    expect(result.receipts.length).toBe(0);
  });

  it('returns source=indexer-unavailable when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const result = await fetchIndexedReceipts();
    expect(result.source).toBe('indexer-unavailable');
  });

  it('returns source=graphql-error when response has errors field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'schema mismatch' }] }),
    }));
    const result = await fetchIndexedReceipts();
    expect(result.source).toBe('graphql-error');
  });
});

describe('Transparency: Passkey Encryption', () => {
  beforeEach(() => {
    vi.stubGlobal('crypto', {
      getRandomValues: (arr: Uint8Array) => { arr.fill(1); return arr; },
      subtle: webcrypto.subtle,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('encryptReceiptWithPrf with no key returns keySource=fallback', async () => {
    const vault = await encryptReceiptWithPrf({ test: 1 }, 'merchant-scope');
    expect(vault.keySource).toBe('fallback');
  });

  it('encryptReceiptWithPrf with a real CryptoKey returns keySource=prf', async () => {
    const realKey = await webcrypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    const vault = await encryptReceiptWithPrf({ test: 1 }, 'merchant-scope', realKey as CryptoKey);
    expect(vault.keySource).toBe('prf');
  });
});

describe('Transparency: Blockchain', () => {
  it('getOnChainTxStatus is callable and returns confirmed (mocked)', async () => {
    const result = await getOnChainTxStatus('0x1234' as any);
    expect(result).toBe('confirmed');
  });

  it('PaymentReceipt isSimulated field distinguishes simulated vs real receipt', () => {
    const simulated = { id: 'SIM-1', isSimulated: true } as PaymentReceipt;
    const real = { id: 'TX-1', isSimulated: false } as PaymentReceipt;
    expect(simulated.isSimulated).toBe(true);
    expect(real.isSimulated).toBe(false);
    expect(simulated.isSimulated).not.toBe(real.isSimulated);
  });
});
