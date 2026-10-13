import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  KeyRound,
  Share2,
  ShieldOff,
  AlertTriangle,
  XCircle,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useDemo } from '../app/DemoContext';
import { Button, EmptyState, Surface } from '../components/ui';
import { formatINR } from '../domain/money';
import { paiseToAusdMicroUnits, formatAusdAmount } from '../contracts/ausd';
import { PageHeading } from './shared';

/**
 * Settlement mode banner — the authoritative label for every receipt.
 *
 * Strict rendering contract:
 *  isSimulated = true        → "Simulated receipt". Never implies any tx occurred.
 *  isSimulated = false       → "Real on-chain transaction" with tx hash + explorer link.
 *                              If status = 'rejected', show the rejection state clearly.
 *  isSimulated = undefined   → Transaction is still in-flight; show pending state.
 */
function SettlementModeBanner({
  isSimulated,
  txHash,
  explorerUrl,
  status,
}: {
  isSimulated?: boolean;
  txHash?: string;
  explorerUrl?: string;
  status: string;
}) {
  // Still in-flight (before payBill resolves)
  if (isSimulated === undefined) {
    return (
      <div className="settlement-mode-banner settlement-mode-banner--pending">
        <Clock size={14} />
        <span>
          <strong>Transaction in progress</strong> — waiting for Monad Testnet response.
        </span>
      </div>
    );
  }

  // Real on-chain path — wallet was connected
  if (!isSimulated) {
    if (status === 'rejected') {
      return (
        <div className="settlement-mode-banner settlement-mode-banner--rejected">
          <ShieldOff size={14} />
          <span>
            <strong>Transaction rejected on-chain</strong> — the contract reverted on Monad Testnet
            (Chain&nbsp;ID&nbsp;10143). No tokens were transferred.
            {txHash && (
              <>
                {' '}Tx:{' '}
                <code className="font-mono">
                  {txHash.slice(0, 12)}…{txHash.slice(-8)}
                </code>
              </>
            )}
            {explorerUrl && (
              <>
                {' '}—{' '}
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-link">
                  View on Monad Explorer <ExternalLink size={11} style={{ verticalAlign: '-1px' }} />
                </a>
              </>
            )}
          </span>
        </div>
      );
    }

    if (txHash) {
      return (
        <div className="settlement-mode-banner settlement-mode-banner--live">
          <Zap size={14} />
          <span>
            <strong>Real on-chain transaction</strong> — submitted to Monad Testnet (Chain&nbsp;ID&nbsp;10143).{' '}
            Tx:{' '}
            <code className="font-mono">
              {txHash.slice(0, 12)}…{txHash.slice(-8)}
            </code>
            {explorerUrl && (
              <>
                {' '}—{' '}
                <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-link">
                  View on Monad Explorer <ExternalLink size={11} style={{ verticalAlign: '-1px' }} />
                </a>
              </>
            )}
          </span>
        </div>
      );
    }

    // Submitted but hash not yet resolved
    return (
      <div className="settlement-mode-banner settlement-mode-banner--pending">
        <Clock size={14} />
        <span>
          <strong>Transaction submitted to Monad Testnet</strong> — awaiting mining confirmation.
        </span>
      </div>
    );
  }

  // isSimulated = true — must be explicit, never claim a tx occurred
  return (
    <div className="settlement-mode-banner settlement-mode-banner--simulated">
      <AlertTriangle size={14} />
      <span>
        <strong>Simulated receipt — no transaction was broadcast.</strong> No wallet was connected
        and no tokens were moved. Connect an EVM wallet on Monad Testnet to submit a real
        transaction.
      </span>
    </div>
  );
}

export function ReceiptPage() {
  const { receipt, notify } = useDemo();
  const [sharing, setSharing] = useState(false);

  const confirmed = receipt?.status === 'confirmed';
  const isRejected = receipt?.status === 'rejected';

  useEffect(() => {
    if (confirmed && receipt?.isSimulated === true) {
      // Confetti for simulated demo completions
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#A78BFA', '#3DDC97', '#D8CCFF', '#F4EFE6'],
        });
      } catch {
        // Safe fallback if canvas is restricted
      }
    } else if (confirmed && receipt?.isSimulated === false) {
      // Real on-chain confirmed — bigger celebration
      try {
        confetti({
          particleCount: 120,
          spread: 90,
          origin: { y: 0.6 },
          colors: ['#3DDC97', '#A78BFA', '#FFD700', '#F4EFE6'],
        });
      } catch {
        // noop
      }
    }
  }, [confirmed, receipt?.isSimulated]);

  if (!receipt) {
    return (
      <div className="content-wrap">
        <EmptyState
          title="No receipt yet"
          body="A receipt appears here after a demo payment is confirmed or evaluated."
          action={
            <Link className="button button--primary" to="/scan">
              Scan a bill
            </Link>
          }
        />
      </div>
    );
  }

  const share = async () => {
    setSharing(true);
    const message = `MONVEIL Safe-Pay receipt · ${receipt.bill.merchantName} · ${formatINR(
      receipt.bill.amountPaise
    )} · Monad Testnet`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'MONVEIL receipt', text: message });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        notify('Receipt summary copied to clipboard.');
      } else {
        notify('Sharing is not available on this device.');
      }
    } catch {
      notify('Share was cancelled.');
    } finally {
      setSharing(false);
    }
  };

  const ausdDisplay = formatAusdAmount(paiseToAusdMicroUnits(receipt.bill.amountPaise));

  // Prefer the new explicit fields; fall back to deprecated ones for backward-compat
  const displayTxHash = receipt.txHash ?? (
    typeof receipt.detailHash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(receipt.detailHash)
      ? receipt.detailHash
      : undefined
  );
  const displayExplorerUrl = receipt.explorerUrl ?? (
    receipt.simulatedProofUrl?.startsWith('http') ? receipt.simulatedProofUrl : undefined
  );
  const displayNetwork = receipt.networkLabel ?? receipt.detailNetwork ?? 'Monad Testnet (10143)';
  const displayContract = receipt.registryContract ?? receipt.detailContract ?? '0x8a82a7314fbf17a590420B8d7De3044ab21f633B';

  const pageTitle =
    confirmed
      ? receipt.isSimulated
        ? 'Simulated demo record.'
        : 'A clear, immutable record.'
      : isRejected
      ? 'Transaction rejected on-chain.'
      : receipt.status === 'failed'
      ? 'Payment halted by Guardian.'
      : 'Payment in progress…';

  return (
    <div className="content-wrap">
      <PageHeading
        eyebrow="TRANSACTION RECEIPT · MONAD TESTNET"
        title={pageTitle}
        description={
          receipt.isSimulated
            ? 'This is a simulated demo receipt. No real transaction occurred.'
            : 'This receipt records the cryptographic bill signature and on-chain settlement outcome.'
        }
      />

      {/* Always show the banner — it's the primary honesty signal */}
      <SettlementModeBanner
        isSimulated={receipt.isSimulated}
        txHash={displayTxHash}
        explorerUrl={displayExplorerUrl}
        status={receipt.status}
      />

      <div className="receipt-layout">
        <motion.article
          className="receipt-paper receipt-paper-large"
          aria-label="MONVEIL receipt"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          {confirmed && !isRejected && (
            <div className="receipt-stamp">
              <span>
                {receipt.isSimulated ? 'DEMO\nSIM' : 'PAID\nON MONAD'}
              </span>
            </div>
          )}
          {isRejected && (
            <div className="receipt-stamp receipt-stamp--failed">
              <span>
                <ShieldOff size={18} />
                <br />
                REJECTED
              </span>
            </div>
          )}
          {receipt.status === 'failed' && (
            <div className="receipt-stamp receipt-stamp--failed">
              <span>
                <XCircle size={18} />
                <br />
                BLOCKED
              </span>
            </div>
          )}

          <div className="receipt-brand">
            <div>
              <strong>MONVEIL</strong>
              <small>
                {receipt.isSimulated
                  ? 'SIMULATED DEMO RECEIPT · NOT ON-CHAIN'
                  : 'SAFE-PAY RECEIPT · MONAD TESTNET'}
              </small>
            </div>
            <span className="signed-stamp">
              <CheckCircle2 size={13} />
              <span>GUARDIAN VERIFIED</span>
            </span>
          </div>

          <div className="receipt-total" style={{ paddingTop: 20 }}>
            <div className="receipt-total-row">
              <span>Merchant</span>
              <strong>{receipt.bill.merchantName}</strong>
            </div>
            <div className="receipt-total-row">
              <span>Bill reference</span>
              <strong className="font-mono">{receipt.bill.id}</strong>
            </div>
            <div className="receipt-total-row receipt-total-row--grand">
              <span>Settled amount</span>
              <strong className="font-editorial">{formatINR(receipt.bill.amountPaise)}</strong>
            </div>
            <div className="receipt-total-row">
              <span>Agora AUSD equivalent</span>
              <strong>{ausdDisplay}</strong>
            </div>
            <div className="receipt-total-row">
              <span>Settlement type</span>
              <strong style={{ color: receipt.isSimulated ? 'var(--amber)' : 'var(--green)' }}>
                {receipt.isSimulated ? 'SIMULATED (no tx)' : 'ON-CHAIN (Monad Testnet)'}
              </strong>
            </div>
            <div className="receipt-total-row">
              <span>Status</span>
              <strong
                className={
                  confirmed ? 'green' : isRejected ? 'red' : receipt.status === 'failed' ? 'red' : 'amber'
                }
              >
                {receipt.status === 'confirmed'
                  ? 'CONFIRMED ✓'
                  : receipt.status === 'rejected'
                  ? 'REJECTED ✕'
                  : receipt.status.toUpperCase()}
              </strong>
            </div>
            <div className="receipt-total-row">
              <span>Recorded at</span>
              <strong>
                {new Date(receipt.confirmedAt ?? receipt.submittedAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </strong>
            </div>
            {receipt.prfKeyFingerprint && (
              <div className="receipt-total-row" style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                <span>
                  <KeyRound size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />
                  Mera PRF Vault
                </span>
                <span className="font-mono">Encrypted (Key {receipt.prfKeyFingerprint})</span>
              </div>
            )}
          </div>

          <div className="receipt-footer">
            MONAD TESTNET · CHAIN ID 10143 · AGORA AUSD &amp; MON · VERIFICATION REGISTRY
          </div>

          <details className="details-accordion">
            <summary>
              Technical details{' '}
              <span>
                {receipt.isSimulated
                  ? 'Simulated IDs · No real tx'
                  : 'Tx hash · Contract · Network'}
              </span>
            </summary>
            <div className="receipt-details">
              {receipt.isSimulated ? (
                <>
                  <span>
                    <strong>⚠ No real transaction hash.</strong> This receipt is a local simulation
                    — no transaction was broadcast to any chain.
                  </span>
                  <span>Proof ID (simulation): {receipt.simulatedProofId ?? receipt.id}</span>
                </>
              ) : (
                <>
                  <span>Tx hash: {displayTxHash ?? '(awaiting confirmation)'}</span>
                  <span>Registry contract: {displayContract}</span>
                </>
              )}
              <span>Network: {displayNetwork}</span>
            </div>
          </details>
        </motion.article>

        <Surface className="surface--pad" style={{ marginTop: 17 }}>
          <div className="receipt-statusline">
            {confirmed ? (
              <>
                <Check size={16} />{' '}
                {receipt.isSimulated
                  ? 'Demo simulation complete — not an on-chain record'
                  : 'Settlement recorded on Monad Testnet'}
              </>
            ) : isRejected ? (
              <>
                <ShieldOff size={16} /> Transaction rejected — contract reverted on-chain
              </>
            ) : receipt.status === 'failed' ? (
              <>
                <XCircle size={16} /> No payment was broadcast
              </>
            ) : (
              <>
                <span className="status-pulse" />{' '}
                {receipt.status === 'pending' ? 'Pending…' : 'Submitted — awaiting confirmation'}
              </>
            )}
          </div>

          <p className="section-subtitle" style={{ marginTop: 8 }}>
            {confirmed && receipt.isSimulated
              ? 'This is a local Guardian demo result. No tokens were moved. Connect an EVM wallet to submit a real transaction.'
              : confirmed
              ? 'The cryptographically signed bill and verification report hash are preserved on Monad Testnet.'
              : isRejected
              ? 'The transaction was mined but the contract reverted. No tokens were transferred. Check the explorer for details.'
              : receipt.status === 'failed'
              ? 'Guardian prevented settlement execution. No tokens were moved.'
              : 'Preparing settlement verification.'}
          </p>

          <div className="receipt-actions">
            {(confirmed || isRejected) && displayExplorerUrl && !receipt.isSimulated && (
              <a
                className="button button--secondary"
                href={displayExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={15} /> Monad Explorer
              </a>
            )}
            {confirmed && receipt.isSimulated && receipt.simulatedProofUrl && (
              <a
                id={receipt.simulatedProofId ?? `proof-${receipt.bill.id.toLowerCase()}`}
                className="button button--secondary"
                href={receipt.simulatedProofUrl}
              >
                <ArrowUpRight size={15} /> Simulated Proof
              </a>
            )}
            {confirmed && (
              <Button variant="secondary" onClick={() => void share()} disabled={sharing}>
                <Share2 size={15} />
                {sharing ? 'Sharing…' : 'Share Receipt'}
              </Button>
            )}
            <Link
              className={`button ${confirmed ? 'button--primary' : 'button--secondary'}`}
              to="/home"
            >
              Done <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
            </Link>
          </div>

          {confirmed && (
            <p className="tiny" style={{ margin: '14px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Copy size={12} />
              {receipt.isSimulated
                ? 'Demo receipt — simulated record, not on-chain.'
                : 'Verified transaction recorded on Monad testnet.'}
            </p>
          )}
        </Surface>
      </div>
    </div>
  );
}
