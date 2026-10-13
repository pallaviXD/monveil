export type Paise = number & { readonly __brand: 'Paise' };
export type Scenario = 'honest' | 'tampered' | 'replay' | 'over-limit' | 'expired';
export type Verdict = 'safe' | 'review' | 'blocked';
export type CheckStatus = 'pass' | 'blocked' | 'review';
export type IntegrityStatus = 'pass' | 'review' | 'unavailable';
export type PaymentStatus = 'pending' | 'submitted' | 'confirmed' | 'failed';
export type Mode = 'demo' | 'testnet' | 'live';

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  unitPricePaise: Paise;
}

export interface Bill {
  id: string;
  merchantName: string;
  currency: 'INR';
  items: BillItem[];
  taxBasisPoints: number;
  subtotalPaise: Paise;
  taxPaise: Paise;
  signedTotalPaise: Paise;
  amountPaise: Paise;
  createdAt: number;
  expiresAt: number;
  scenario: Scenario;
  signature: string;
  signatureValid?: boolean;
}

export interface GuardianCheck {
  id: 'seal' | 'amount' | 'expiry' | 'duplicate' | 'rules';
  label: 'Bill seal' | 'Amount' | 'Expiry' | 'Not paid before' | 'Your rules';
  status: CheckStatus;
  explanation: string;
}

export interface GuardianResult {
  bill: Bill;
  verdict: Verdict;
  checks: GuardianCheck[];
  lineItemStatus: IntegrityStatus;
  reasonCode?: string;
  createdAt: number;
}

export interface AppRules {
  perPaymentLimitPaise: Paise;
  dailyCapPaise: Paise;
  blockedMerchants: string[];
}

export interface ActivityItem {
  id: string;
  billId: string;
  merchantName: string;
  amountPaise: Paise;
  date: number;
  verdict: Verdict;
  paymentStatus: PaymentStatus;
  scenario: Scenario;
  reason: string;
}

export interface PaymentReceipt {
  id: string;
  bill: Bill;
  status: PaymentStatus;
  submittedAt: number;
  confirmedAt?: number;
  simulatedProofId?: string;
  simulatedProofUrl?: string;
  detailHash?: string;
  detailContract?: string;
  detailNetwork?: string;
  encryptedDetailsCiphertext?: string;
  prfKeyFingerprint?: string;
}

export interface ServiceError extends Error {
  code: string;
  userMessage: string;
}
