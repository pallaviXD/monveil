import type { ActivityItem, AppRules, Bill, BillItem, GuardianCheck, GuardianResult, IntegrityStatus, PaymentReceipt, Scenario, ServiceError } from '../domain/types';
import { asPaise, calculateTax } from '../domain/money';
import { verifyBillSignature, signBillEip712 } from './merchantRegistry';
import { authenticatePasskey, encryptReceiptWithPrf, type PasskeyAccount } from './passkey';
import { requestAiExplanation, requestAiExplanationDetailed } from './kimiExplanation';
import { executeMonadSettlement } from './blockchain';

const STORAGE = { activity: 'monveil.activity.v1', rules: 'monveil.rules.v1', paid: 'monveil.paid.v1', currentBill: 'monveil.currentBill.v1', currency: 'monveil.currency.v1' } as const;
const DEMO_HMAC_SECRET = 'MONVEIL-DEMO-ONLY-NOT-A-REAL-SIGNING-KEY';
const delay = (ms = 380) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const paise = (value: number) => asPaise(value);

function serviceError(code: string, userMessage: string): ServiceError {
  return Object.assign(new Error(userMessage), { code, userMessage }) as ServiceError;
}
function safeRead<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}
function safeWrite<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Demo remains usable if storage is unavailable. */ }
}
export function getStoredBill(): Bill | null { return safeRead<Bill | null>(STORAGE.currentBill, null); }
export function storeCurrentBill(bill: Bill | null): void {
  try { if (bill) safeWrite(STORAGE.currentBill, bill); else localStorage.removeItem(STORAGE.currentBill); } catch { /* Demo remains usable if storage is unavailable. */ }
}
export async function getDisplayCurrency(): Promise<'INR' | 'USD'> {
  await delay(120);
  const value = safeRead<unknown>(STORAGE.currency, 'INR');
  return value === 'USD' ? 'USD' : 'INR';
}
export async function setDisplayCurrency(value: 'INR' | 'USD'): Promise<'INR' | 'USD'> {
  await delay(120);
  safeWrite(STORAGE.currency, value);
  return value;
}
function canonicalBill(bill: Bill): string {
  return JSON.stringify({
    id: bill.id, merchantName: bill.merchantName, currency: bill.currency,
    items: bill.items.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity, unitPricePaise: item.unitPricePaise })),
    taxBasisPoints: bill.taxBasisPoints, subtotalPaise: bill.subtotalPaise, taxPaise: bill.taxPaise,
    signedTotalPaise: bill.signedTotalPaise, amountPaise: bill.amountPaise,
    createdAt: bill.createdAt, expiresAt: bill.expiresAt, scenario: bill.scenario,
  });
}
async function hmac(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw serviceError('CRYPTO_UNAVAILABLE', 'Secure bill checks are unavailable in this browser. Try the sample bill instead.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(DEMO_HMAC_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function signatureMatches(bill: Bill): Promise<boolean> {
  const result = await verifyBillSignature(bill, async (b) => {
    try {
      const expected = await hmac(canonicalBill(b));
      if (expected.length !== b.signature.length) return false;
      let diff = 0;
      for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ b.signature.charCodeAt(i);
      return diff === 0;
    } catch {
      return false;
    }
  });
  return result.valid;
}

export interface BillQrPayload extends Omit<Bill, 'signatureValid'> { signature: string }
export function serializeBillQr(bill: Bill): string {
  const { signatureValid: _verified, ...payload } = bill;
  return JSON.stringify(payload);
}

export async function signBill(
  items: BillItem[],
  options: {
    id?: string;
    merchantName?: string;
    taxBasisPoints?: number;
    scenario?: Scenario;
    expiresInMs?: number;
    useEip712?: boolean;
  } = {}
): Promise<Bill> {
  await delay(180);
  if (items.length === 0) throw serviceError('EMPTY_BILL', 'Add at least one item before signing this bill.');
  const normalized = items.map((item) => {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || !Number.isSafeInteger(item.unitPricePaise) || item.unitPricePaise < 0) {
      throw serviceError('INVALID_LINE', 'Check item quantities and prices, then sign again.');
    }
    return { ...item, unitPricePaise: paise(item.unitPricePaise) };
  });
  const subtotal = normalized.reduce((sum, item) => sum + item.unitPricePaise * item.quantity, 0);
  if (!Number.isSafeInteger(subtotal)) throw serviceError('AMOUNT_TOO_LARGE', 'This bill is too large for the demo.');
  const taxBasisPoints = options.taxBasisPoints ?? 500;
  const tax = calculateTax(subtotal, taxBasisPoints);
  const total = asPaise(subtotal + tax);
  const now = Date.now();
  const bill: Bill = {
    id: options.id ?? `MV-${now.toString(36).toUpperCase()}`,
    merchantName: options.merchantName ?? 'The Indigo House · Jaipur',
    currency: 'INR', items: normalized, taxBasisPoints,
    subtotalPaise: asPaise(subtotal), taxPaise: tax,
    signedTotalPaise: total, amountPaise: total,
    createdAt: now, expiresAt: now + (options.expiresInMs ?? 10 * 60 * 1000),
    scenario: options.scenario ?? 'honest', signature: '', signatureValid: true,
  };

  if (options.useEip712) {
    const eipResult = await signBillEip712(bill);
    bill.signature = eipResult.signature;
  } else {
    bill.signature = await hmac(canonicalBill(bill));
  }
  return bill;
}

const defaultItems: BillItem[] = [
  { id: 'room', name: 'Garden room · 1 night', quantity: 1, unitPricePaise: paise(91000) },
  { id: 'breakfast', name: 'Breakfast for two', quantity: 1, unitPricePaise: paise(9000) },
];

export async function createSampleBill(scenario: Scenario): Promise<Bill> {
  const billId = scenario === 'replay' ? 'MV-REPLAY-001' : `MV-${scenario.toUpperCase()}-001`;
  const items = scenario === 'over-limit'
    ? [{ id: 'suite', name: 'Suite · 1 night', quantity: 1, unitPricePaise: paise(238095) }]
    : defaultItems;
  const expiry = scenario === 'expired' ? -60_000 : 10 * 60 * 1000;
  const signed = await signBill(items, { id: billId, merchantName: 'The Indigo House · Jaipur', scenario, expiresInMs: expiry, taxBasisPoints: 500 });
  if (scenario === 'tampered') return { ...signed, amountPaise: paise(125000), signatureValid: false };
  return signed;
}

export async function connectWithPasskey(): Promise<{ connected: true; method: 'passkey' | 'demo-passkey'; account?: PasskeyAccount }> {
  try {
    const auth = await authenticatePasskey();
    return { connected: true, method: auth.account.isSimulated ? 'demo-passkey' : 'passkey', account: auth.account };
  } catch {
    await delay(320);
    return { connected: true, method: 'demo-passkey' };
  }
}

export async function parseBillQr(payload: string): Promise<Bill> {
  await delay(240);
  let parsed: unknown;
  try { parsed = JSON.parse(payload); } catch { throw serviceError('QR_NOT_MONVEIL', 'This QR does not contain a MONVEIL bill. Load a sample bill or scan a signed bill QR.'); }
  if (!parsed || typeof parsed !== 'object') throw serviceError('QR_NOT_MONVEIL', 'This QR does not contain a MONVEIL bill.');
  const raw = parsed as Partial<Bill>;
  const required = ['id', 'merchantName', 'currency', 'items', 'taxBasisPoints', 'subtotalPaise', 'taxPaise', 'signedTotalPaise', 'amountPaise', 'createdAt', 'expiresAt', 'scenario', 'signature'] as const;
  if (required.some((key) => raw[key] === undefined) || raw.currency !== 'INR' || !Array.isArray(raw.items) || typeof raw.signature !== 'string') {
    throw serviceError('QR_INVALID', 'Some bill details are missing. Ask the merchant to create a new signed bill.');
  }
  const bill = raw as Bill;
  if (![bill.subtotalPaise, bill.taxPaise, bill.signedTotalPaise, bill.amountPaise, bill.createdAt, bill.expiresAt, bill.taxBasisPoints].every(Number.isSafeInteger)) {
    throw serviceError('QR_INVALID', 'This bill has an invalid amount or date. Ask the merchant to create a new signed bill.');
  }
  const signatureValid = await signatureMatches(bill);
  return { ...bill, signatureValid };
}

function currentRules(): AppRules {
  return safeRead<AppRules>(STORAGE.rules, { perPaymentLimitPaise: paise(200000), dailyCapPaise: paise(1000000), blockedMerchants: [] });
}
function isPreviouslyPaid(bill: Bill): boolean {
  const paid = safeRead<string[]>(STORAGE.paid, ['MV-REPLAY-001']);
  return paid.includes(bill.id);
}

export async function runGuardianChecks(bill: Bill): Promise<GuardianResult> {
  await delay(420);
  const rules = currentRules();
  const activity = safeRead<ActivityItem[]>(STORAGE.activity, seedActivity());
  const dailySpend = activity.filter((entry) => entry.paymentStatus === 'confirmed' && new Date(entry.date).toDateString() === new Date().toDateString()).reduce((sum, entry) => sum + entry.amountPaise, 0);
  const validAmount = Number.isSafeInteger(bill.amountPaise) && bill.amountPaise > 0 && Number.isSafeInteger(bill.signedTotalPaise) && bill.signedTotalPaise > 0;
  const validSignature = bill.signatureValid ?? await signatureMatches(bill);
  const amountMatches = validAmount && bill.amountPaise === bill.signedTotalPaise;
  const unexpired = bill.expiresAt > Date.now();
  const duplicate = isPreviouslyPaid(bill) || bill.scenario === 'replay';
  const merchantBlocked = rules.blockedMerchants.some((name) => name.toLowerCase() === bill.merchantName.toLowerCase());
  const underLimits = validAmount && bill.amountPaise <= rules.perPaymentLimitPaise && dailySpend + bill.amountPaise <= rules.dailyCapPaise && !merchantBlocked;
  const checks: GuardianCheck[] = [
    { id: 'seal', label: 'Bill seal', status: validSignature ? 'pass' : 'blocked', explanation: validSignature ? 'This QR matches the merchant-sealed bill.' : 'The QR details do not match the merchant-sealed bill.' },
    { id: 'amount', label: 'Amount', status: amountMatches ? 'pass' : 'blocked', explanation: !validAmount ? 'Invalid or non-positive monetary amount.' : amountMatches ? 'The requested amount matches the signed total.' : 'The QR requests a different amount from the signed bill.' },
    { id: 'expiry', label: 'Expiry', status: unexpired ? 'pass' : 'blocked', explanation: unexpired ? 'This bill is still within its valid time.' : 'This bill has expired.' },
    { id: 'duplicate', label: 'Not paid before', status: duplicate ? 'blocked' : 'pass', explanation: duplicate ? 'This bill has already been paid in the demo.' : 'No earlier payment is recorded for this bill.' },
    { id: 'rules', label: 'Your rules', status: underLimits ? 'pass' : 'blocked', explanation: merchantBlocked ? 'This merchant is on your blocked list.' : !validAmount ? 'Invalid monetary value.' : bill.amountPaise > rules.perPaymentLimitPaise ? 'This bill is above your per-payment limit.' : dailySpend + bill.amountPaise > rules.dailyCapPaise ? 'This payment would exceed your daily cap.' : 'This bill fits within your saved limits.' },
  ];
  const lineStatus = verifyLines(bill);
  const failed = checks.find((check) => check.status === 'blocked');
  const verdict = failed ? 'blocked' : (lineStatus === 'review' || lineStatus === 'unavailable') ? 'review' : 'safe';
  return { bill, verdict, checks, lineItemStatus: lineStatus, reasonCode: !amountMatches ? 'amount' : failed?.id ?? (lineStatus === 'review' || lineStatus === 'unavailable' ? 'line-items' : undefined), createdAt: Date.now() };
}

function verifyLines(bill: Bill): IntegrityStatus {
  if (!bill.items.length) return 'unavailable';
  const keys = bill.items.map((item) => `${item.name.trim().toLowerCase()}|${item.quantity}|${item.unitPricePaise}`);
  if (new Set(keys).size !== keys.length) return 'review';
  const subtotal = bill.items.reduce((sum, item) => sum + item.quantity * item.unitPricePaise, 0);
  if (subtotal !== bill.subtotalPaise || calculateTax(subtotal, bill.taxBasisPoints) !== bill.taxPaise || subtotal + bill.taxPaise !== bill.signedTotalPaise) return 'review';
  return 'pass';
}

export async function explainResult(result: GuardianResult): Promise<string> {
  await delay(120);
  return requestAiExplanation(result);
}

export async function explainResultDetailed(result: GuardianResult) {
  await delay(120);
  return requestAiExplanationDetailed(result);
}

const seedActivity = (): ActivityItem[] => {
  const today = new Date();
  const at = (daysAgo: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo, 12, 20).getTime();
  return [
    { id: 'act-1', billId: 'MV-PAID-017', merchantName: 'The Indigo House · Jaipur', amountPaise: paise(105000), date: at(0), verdict: 'safe', paymentStatus: 'confirmed', scenario: 'honest', reason: 'Bill seal and amount matched; within your rules.' },
    { id: 'act-2', billId: 'MV-BLOCK-016', merchantName: 'Old City Café · Jaipur', amountPaise: paise(125000), date: at(0) - 2 * 60 * 60 * 1000, verdict: 'blocked', paymentStatus: 'failed', scenario: 'tampered', reason: 'QR amount did not match the merchant-signed bill.' },
    { id: 'act-3', billId: 'MV-PAID-015', merchantName: 'Blue Courtyard · Udaipur', amountPaise: paise(189000), date: at(1), verdict: 'safe', paymentStatus: 'confirmed', scenario: 'honest', reason: 'All five Guardian checks passed.' },
    { id: 'act-4', billId: 'MV-BLOCK-014', merchantName: 'The Indigo House · Jaipur', amountPaise: paise(250000), date: at(2), verdict: 'blocked', paymentStatus: 'failed', scenario: 'over-limit', reason: 'Above the Rs 2,000 per-payment limit.' },
    { id: 'act-5', billId: 'MV-PAID-013', merchantName: 'Monsoon Kitchen · Kochi', amountPaise: paise(74000), date: at(3), verdict: 'safe', paymentStatus: 'confirmed', scenario: 'honest', reason: 'Bill was current and within your rules.' },
  ];
};

export async function getActivity(): Promise<ActivityItem[]> {
  await delay(360);
  return safeRead<ActivityItem[]>(STORAGE.activity, seedActivity()).sort((a, b) => b.date - a.date);
}
export async function getRules(): Promise<AppRules> { await delay(300); return currentRules(); }
export async function setRules(rules: AppRules): Promise<AppRules> {
  await delay(460);
  if (!Number.isSafeInteger(rules.perPaymentLimitPaise) || !Number.isSafeInteger(rules.dailyCapPaise)) throw serviceError('INVALID_RULES', 'Please set whole-paise limits before saving.');
  safeWrite(STORAGE.rules, rules);
  return rules;
}
export async function payBill(bill: Bill): Promise<PaymentReceipt> {
  await delay(200);
  const result = await runGuardianChecks(bill);
  if (result.verdict === 'blocked') throw serviceError(`BLOCKED_${result.reasonCode?.toUpperCase() ?? 'BILL'}`, 'Guardian blocked this bill. Review the reason before trying again.');

  // Execute on-chain Monad / Agora settlement (real if wallet connected, honest simulated testnet otherwise)
  const receipt = await executeMonadSettlement(bill, result, { asset: 'AUSD' });

  // Encrypt private receipt payload locally using Mera PRF key material
  try {
    const encryptedVault = await encryptReceiptWithPrf({
      items: bill.items,
      tax: bill.taxPaise,
      subtotal: bill.subtotalPaise,
      merchant: bill.merchantName,
    }, bill.merchantName);
    receipt.encryptedDetailsCiphertext = encryptedVault.ciphertext;
    receipt.prfKeyFingerprint = encryptedVault.keyFingerprint;
  } catch {
    // PRF vault optional encryption
  }

  const paid = safeRead<string[]>(STORAGE.paid, ['MV-REPLAY-001']);
  safeWrite(STORAGE.paid, [...new Set([...paid, bill.id])]);
  const activity = safeRead<ActivityItem[]>(STORAGE.activity, seedActivity());
  safeWrite(STORAGE.activity, [{ id: receipt.id, billId: bill.id, merchantName: bill.merchantName, amountPaise: bill.amountPaise, date: receipt.confirmedAt ?? Date.now(), verdict: 'safe', paymentStatus: 'confirmed', scenario: bill.scenario, reason: 'All Guardian checks passed before this payment.' }, ...activity]);
  return receipt;
}

export function clearDemoData(): void { Object.values(STORAGE).forEach((key) => localStorage.removeItem(key)); }
export function hasValidSeal(bill: Bill): Promise<boolean> { return signatureMatches(bill); }
export function createBlockedResult(bill: Bill, reasonCode: string): GuardianResult {
  const labels: Record<string, GuardianCheck['label']> = { seal: 'Bill seal', amount: 'Amount', expiry: 'Expiry', duplicate: 'Not paid before', rules: 'Your rules' };
  const checks: GuardianCheck[] = ['seal', 'amount', 'expiry', 'duplicate', 'rules'].map((key) => ({
    id: key as GuardianCheck['id'], label: labels[key], status: key === reasonCode ? 'blocked' : 'pass', explanation: key === reasonCode ? 'Guardian stopped this bill for this check.' : 'This check passed.',
  }));
  return { bill, verdict: 'blocked', checks, lineItemStatus: 'pass' as IntegrityStatus, reasonCode, createdAt: Date.now() };
}
