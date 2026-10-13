// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityItem } from '../domain/types';
import { asPaise } from '../domain/money';
import { createSampleBill, getActivity, getRules, parseBillQr, payBill, runGuardianChecks, serializeBillQr, setRules } from './mockApi';
import { generateBillQr } from './qr';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
});

describe('MONVEIL demo outcomes', () => {
  it('passes and simulates a confirmed receipt for an honest Rs 1,050 bill', async () => {
    const bill = await createSampleBill('honest');
    expect(bill.amountPaise).toBe(105000);
    expect((await runGuardianChecks(bill)).verdict).toBe('safe');
    const receipt = await payBill(bill);
    expect(receipt.status).toBe('confirmed');
    expect(receipt.simulatedProofUrl).toContain('simulated-proof');
  });

  it('creates a real QR image and round-trips compact signed JSON', async () => {
    const bill = await createSampleBill('honest');
    const image = await generateBillQr(bill);
    expect(image).toMatch(/^data:image\/png;base64,/);
    const parsed = await parseBillQr(serializeBillQr(bill));
    expect(parsed.signatureValid).toBe(true);
    expect(parsed.amountPaise).toBe(105000);
  });

  it('blocks a genuinely altered Rs 1,250 request and explains the Rs 200 mismatch', async () => {
    const bill = await createSampleBill('honest');
    const altered = { ...bill, amountPaise: asPaise(125000) };
    const decoded = await parseBillQr(serializeBillQr(altered));
    const result = await runGuardianChecks(decoded);
    expect(decoded.signatureValid).toBe(false);
    expect(result.verdict).toBe('blocked');
    expect(result.reasonCode).toBe('amount');
  });

  it('blocks a replayed bill that is already marked paid', async () => {
    const result = await runGuardianChecks(await createSampleBill('replay'));
    expect(result.verdict).toBe('blocked');
    expect(result.reasonCode).toBe('duplicate');
  });

  it('blocks a Rs 2,500 bill above the Rs 2,000 payment limit', async () => {
    const bill = await createSampleBill('over-limit');
    expect(bill.amountPaise).toBe(250000);
    const result = await runGuardianChecks(bill);
    expect(result.verdict).toBe('blocked');
    expect(result.reasonCode).toBe('rules');
  });

  it('blocks an expired signed bill', async () => {
    const result = await runGuardianChecks(await createSampleBill('expired'));
    expect(result.verdict).toBe('blocked');
    expect(result.reasonCode).toBe('expiry');
  });

  it('keeps mock activity, rules and paise-backed settings behind the service functions', async () => {
    const initial = await getRules();
    expect(initial.perPaymentLimitPaise).toBe(200000);
    await setRules({ ...initial, perPaymentLimitPaise: asPaise(300000) });
    expect((await getRules()).perPaymentLimitPaise).toBe(300000);
    const rows: ActivityItem[] = await getActivity();
    expect(rows.length).toBeGreaterThan(0);
  });
});
