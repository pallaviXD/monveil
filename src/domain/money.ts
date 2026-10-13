import type { Paise } from './types';

export function asPaise(value: number): Paise {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Money must be a non-negative integer number of paise.');
  return value as Paise;
}

export function parseRupeesToPaise(value: string): Paise {
  const trimmed = value.trim().replace(/[₹,\s]/g, '');
  if (!/^\d+(?:\.\d{0,2})?$/.test(trimmed)) return asPaise(0);
  const [rupeesText, paiseText = ''] = trimmed.split('.');
  const rupees = Number.parseInt(rupeesText || '0', 10);
  const cents = Number.parseInt(paiseText.padEnd(2, '0') || '0', 10);
  return asPaise(rupees * 100 + cents);
}

export function formatINR(value: number, compact = false): string {
  const paise = BigInt(Math.max(0, Math.trunc(value)));
  const rupees = paise / 100n;
  const remainder = Number(paise % 100n);
  const whole = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(rupees));
  const amount = remainder ? `${whole}.${String(remainder).padStart(2, '0')}` : whole;
  return `${compact ? 'Rs' : '₹'}${compact ? ` ${amount}` : amount}`;
}

export function formatUSD(paiseValue: number): string {
  const paise = BigInt(Math.max(0, Math.trunc(paiseValue)));
  const usdCents = (paise * 100n + 4150n) / 8300n;
  const whole = usdCents / 100n;
  const cents = String(usdCents % 100n).padStart(2, '0');
  return `US$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(whole))}.${cents}`;
}

export function calculateTax(subtotalPaise: number, basisPoints: number): Paise {
  const tax = (BigInt(subtotalPaise) * BigInt(basisPoints) + 5000n) / 10000n;
  return asPaise(Number(tax));
}

export function formatMoney(paise: number, currency: 'INR' | 'USD' = 'INR'): string {
  return currency === 'USD' ? formatUSD(paise) : formatINR(paise);
}
