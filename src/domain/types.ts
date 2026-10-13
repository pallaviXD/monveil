export type Paise = number & { readonly __brand: 'Paise' };
export type Scenario = 'honest' | 'tampered' | 'replay' | 'over-limit' | 'expired';
export type Verdict = 'safe' | 'review' | 'blocked';
export type CheckStatus = 'pass' | 'blocked' | 'review';
export type IntegrityStatus = 'pass' | 'review' | 'unavailable';
export type PaymentStatus = 'pending' | 'submitted' | 'confirmed' | 'rejected' | 'failed';
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
  /**
   * true  → no wallet was connected; no tokens were moved; all data is locally generated.
   * false → a wallet signed and broadcast a real transaction to Monad Testnet.
   * undefined → status still pending / unknown (in-flight).
   *
   * IMPORTANT: Never render a simulated receipt as if it were an on-chain transaction.
   */
  isSimulated?: boolean;
  /** Real 66-char 0x…hex transaction hash from the chain. Only present when isSimulated=false. */
  txHash?: string;
  /** Working Monad Testnet explorer URL. Only present when isSimulated=false and txHash is set. */
  explorerUrl?: string;
  /** Human-readable network label. */
  networkLabel?: string;
  /** Address of the registry contract that recorded the receipt. */
  registryContract?: string;
  simulatedProofId?: string;
  simulatedProofUrl?: string;
  /** @deprecated use txHash + explorerUrl instead */
  detailHash?: string;
  /** @deprecated use registryContract instead */
  detailContract?: string;
  /** @deprecated use networkLabel instead */
  detailNetwork?: string;
  encryptedDetailsCiphertext?: string;
  prfKeyFingerprint?: string;
}

export interface ServiceError extends Error {
  code: string;
  userMessage: string;
}
