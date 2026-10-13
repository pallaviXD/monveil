import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, Copy, Share2, XCircle, KeyRound, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useDemo } from '../app/DemoContext';
import { Button, EmptyState, ModeBadge, Surface } from '../components/ui';
import { formatINR } from '../domain/money';
import { paiseToAusdMicroUnits, formatAusdAmount } from '../contracts/ausd';
import { PageHeading } from './shared';

export function ReceiptPage() {
  const { receipt, notify } = useDemo();
  const [sharing, setSharing] = useState(false);

  const confirmed = receipt?.status === 'confirmed';

  useEffect(() => {
    if (confirmed) {
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
    }
  }, [confirmed]);

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

  const proofId = receipt.simulatedProofId ?? `proof-${receipt.bill.id.toLowerCase()}`;
  const isLiveExplorerUrl = receipt.simulatedProofUrl?.startsWith('http');
  const ausdDisplay = formatAusdAmount(paiseToAusdMicroUnits(receipt.bill.amountPaise));

  return (
    <div className="content-wrap">
      <PageHeading
        eyebrow="TRANSACTION RECEIPT · MONAD TESTNET"
        title={
          confirmed
            ? 'A clear, immutable record.'
            : receipt.status === 'failed'
            ? 'Payment halted by Guardian.'
            : 'Payment in progress…'
        }
        description="This verified receipt records the cryptographic bill signature and settlement outcome."
        action={<ModeBadge mode={isLiveExplorerUrl ? 'testnet' : 'demo'} label={isLiveExplorerUrl ? 'MONAD TESTNET' : 'SIMULATED TESTNET'} />}
      />

      <div className="receipt-layout">
        <motion.article
          className="receipt-paper receipt-paper-large"
          aria-label="MONVEIL demo receipt"
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          {confirmed && (
            <div className="receipt-stamp">
              <span>
                PAID<br />
                ON MONAD
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
              <small>SAFE-PAY RECEIPT · MONAD TESTNET</small>
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
              <span>Settlement Status</span>
              <strong className={confirmed ? 'green' : receipt.status === 'failed' ? 'red' : 'amber'}>
                {receipt.status === 'confirmed' ? 'CONFIRMED ✓' : receipt.status.toUpperCase()}
              </strong>
            </div>
            <div className="receipt-total-row">
              <span>Recorded timestamp</span>
              <strong>
                {new Date(receipt.confirmedAt ?? receipt.submittedAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </strong>
            </div>
            {receipt.prfKeyFingerprint && (
              <div className="receipt-total-row" style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                <span><KeyRound size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} />Mera PRF Vault</span>
                <span className="font-mono">Encrypted (Key {receipt.prfKeyFingerprint})</span>
              </div>
            )}
          </div>

          <div className="receipt-footer">
            MONAD TESTNET · CHAIN ID 10143 · AGORA AUSD & MON · VERIFICATION REGISTRY
          </div>

          <details className="details-accordion">
            <summary>
              Details <span>Cryptographic seal · Contract · Network</span>
            </summary>
            <div className="receipt-details">
              <span>Transaction / Report: {receipt.detailHash ?? receipt.id}</span>
              <span>Registry contract: {receipt.detailContract ?? '0x4a6b58611F36928e18FDAb821cEa7fE195F483c7'}</span>
              <span>Network: {receipt.detailNetwork ?? 'Monad Testnet (10143)'}</span>
            </div>
          </details>
        </motion.article>

        <Surface className="surface--pad" style={{ marginTop: 17 }}>
          <div className="receipt-statusline">
            {confirmed ? (
              <>
                <Check size={16} /> Settlement recorded on Monad Testnet
              </>
            ) : receipt.status === 'failed' ? (
              <>
                <XCircle size={16} /> No payment was broadcasted
              </>
            ) : (
              <>
                <span className="status-pulse" />{' '}
                {receipt.status === 'pending' ? 'Pending transaction…' : 'Submitted'}
              </>
            )}
          </div>
          <p className="section-subtitle" style={{ marginTop: 8 }}>
            {confirmed
              ? 'The cryptographically signed bill and verification report hash are preserved on Monad Testnet.'
              : receipt.status === 'failed'
              ? 'Guardian prevented settlement execution. No tokens were moved.'
              : 'Preparing settlement verification.'}
          </p>

          <div className="receipt-actions">
            {confirmed && receipt.simulatedProofUrl && (
              <a
                id={proofId}
                className="button button--secondary"
                href={receipt.simulatedProofUrl}
                target={isLiveExplorerUrl ? '_blank' : undefined}
                rel={isLiveExplorerUrl ? 'noopener noreferrer' : undefined}
              >
                {isLiveExplorerUrl ? <ExternalLink size={15} /> : <ArrowUpRight size={15} />}
                {isLiveExplorerUrl ? 'Monad Explorer' : 'Simulated Proof'}
              </a>
            )}
            {confirmed && (
              <Button variant="secondary" onClick={() => void share()} disabled={sharing}>
                <Share2 size={15} />
                {sharing ? 'Sharing…' : 'Share Receipt'}
              </Button>
            )}
            <Link className={`button ${confirmed ? 'button--primary' : 'button--secondary'}`} to="/home">
              Done <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
            </Link>
          </div>

          {confirmed && (
            <p className="tiny" style={{ margin: '14px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Copy size={12} />
              {isLiveExplorerUrl ? 'Verified transaction recorded on Monad testnet.' : 'Proof link preserved for demonstration.'}
            </p>
          )}
        </Surface>
      </div>
    </div>
  );
}
