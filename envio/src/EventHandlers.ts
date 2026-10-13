/**
 * Envio HyperIndex Event Handlers for MonveilVerificationRegistry
 * Indexes real Monad Testnet events emitted by Monveil contracts.
 */

// Interface stubs matching generated Envio handler contracts
export interface ReceiptRecordedEvent {
  params: {
    billIdHash: string;
    reportHash: string;
    payer: string;
    merchant: string;
    resultCode: number;
    amountPaise: bigint;
    timestamp: bigint;
  };
  block: {
    number: number;
    timestamp: number;
  };
  transaction: {
    hash: string;
  };
}

export interface PaymentSettledEvent {
  params: {
    billIdHash: string;
    payer: string;
    merchant: string;
    settlementToken: string;
    tokenAmount: bigint;
    reportHash: string;
    timestamp: bigint;
  };
  block: {
    number: number;
    timestamp: number;
  };
  transaction: {
    hash: string;
  };
}

export interface EnvioContext {
  ReceiptRecord: {
    set: (entity: Record<string, unknown>) => void;
    get: (id: string) => Promise<Record<string, unknown> | undefined>;
  };
  PaymentSettlement: {
    set: (entity: Record<string, unknown>) => void;
  };
  VerificationSummary: {
    set: (entity: Record<string, unknown>) => void;
    get: (id: string) => Promise<Record<string, unknown> | undefined>;
  };
}

export function handleReceiptRecorded(event: ReceiptRecordedEvent, context: EnvioContext): void {
  const entity = {
    id: event.params.billIdHash,
    billIdHash: event.params.billIdHash,
    reportHash: event.params.reportHash,
    payer: event.params.payer,
    merchant: event.params.merchant,
    resultCode: event.params.resultCode,
    amountPaise: event.params.amountPaise,
    timestamp: event.params.timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  };

  context.ReceiptRecord.set(entity);
}

export function handlePaymentSettled(event: PaymentSettledEvent, context: EnvioContext): void {
  const entity = {
    id: `${event.params.billIdHash}-${event.transaction.hash}`,
    billIdHash: event.params.billIdHash,
    payer: event.params.payer,
    merchant: event.params.merchant,
    settlementToken: event.params.settlementToken,
    tokenAmount: event.params.tokenAmount,
    reportHash: event.params.reportHash,
    timestamp: event.params.timestamp,
    blockNumber: BigInt(event.block.number),
    transactionHash: event.transaction.hash,
  };

  context.PaymentSettlement.set(entity);
}
