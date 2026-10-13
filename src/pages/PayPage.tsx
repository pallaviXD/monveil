import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, AlertOctagon, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDemo } from '../app/DemoContext';
import { EmptyState, ModeBadge, Skeleton, Surface, StatusIcon } from '../components/ui';
import { formatINR } from '../domain/money';
import { integrationConfig } from '../services/config';
import { paiseToAusdMicroUnits, formatAusdAmount } from '../contracts/ausd';
import { checkWalletConnection, requestWalletConnect, type WalletState } from '../services/blockchain';
import { PageHeading } from './shared';

export function PayPage() {
  const { bill, result, evaluateBill, submitPayment, loading, notify } = useDemo();
  const [progress, setProgress] = useState(0);
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    connected: false,
    isOnMonad: false,
    ausdBalance: null,
    monBalance: null,
  });
  const timer = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);
  const completed = useRef(false);

  useEffect(() => {
    if (bill && !result && !loading) void evaluateBill();
  }, [bill, result, loading, evaluateBill]);

  useEffect(() => {
    void checkWalletConnection().then(setWallet);
  }, []);

  const handleConnectWallet = async () => {
    try {
      const state = await requestWalletConnect();
      setWallet(state);
      if (state.connected) {
        localStorage.setItem('monveil.wallet.connected', 'true');
        notify('Connected to Monad Testnet wallet.');
      }
    } catch (err: unknown) {
      notify((err as Error).message, 'error');
    }
  };

  const startHold = () => {
    if (result?.verdict !== 'safe' || completed.current) return;
    window.clearInterval(timer.current);
    completed.current = false;
    startedAt.current = Date.now();
    timer.current = window.setInterval(() => {
      const next = Math.min(100, Math.floor((Date.now() - startedAt.current) / 12));
      setProgress(next);
      if (next >= 100) {
        window.clearInterval(timer.current);
        timer.current = undefined;
        completed.current = true;
        void submitPayment();
      }
    }, 30);
  };

  const stopHold = () => {
    window.clearInterval(timer.current);
    timer.current = undefined;
    if (!completed.current) setProgress(0);
  };

  useEffect(() => () => window.clearInterval(timer.current), []);

  if (!bill) {
    return (
      <div className="content-wrap">
        <EmptyState
          title="Nothing to pay yet"
          body="Scan a bill and inspect Guardian’s verification before reviewing payments."
          action={
            <Link className="button button--primary" to="/scan">
              Scan a bill
            </Link>
          }
        />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="content-wrap">
        <PageHeading eyebrow="PAYMENT REVIEW" title="Checking before you continue…" />
        <Surface className="surface--pad">
          <Skeleton className="skeleton-block" />
        </Surface>
      </div>
    );
  }

  const blocked = result.verdict === 'blocked';
  const reason = blocked
    ? result.reasonCode === 'amount'
      ? 'The QR asks for a different amount than the merchant signed. Settlement is permanently blocked.'
      : result.reasonCode === 'expiry'
      ? 'This bill has expired. Ask the merchant for a fresh signed bill.'
      : result.reasonCode === 'duplicate'
      ? 'This bill has already been paid in the demo. A duplicate payment is blocked.'
      : result.reasonCode === 'rules'
      ? 'This amount is above your ₹2,000 per-payment limit or triggers a security rule.'
      : 'The bill cryptographic seal could not be verified against the merchant key.'
    : '';

  const ausdDisplay = formatAusdAmount(paiseToAusdMicroUnits(bill.amountPaise));

  return (
    <div className="content-wrap">
      <PageHeading
        eyebrow="STAGE 3 · FINAL CONFIRMATION"
        title="One last look."
        description="Verify the destination merchant and final amount. Once approved, settlement executes on Monad testnet."
        action={
          <ModeBadge
            mode={wallet.connected ? 'testnet' : integrationConfig.chainMode}
            label={`SETTLEMENT · ${wallet.connected ? 'TESTNET (LIVE)' : integrationConfig.chainMode.toUpperCase()}`}
          />
        }
      />

      <div className="pay-layout">
        <Surface className="pay-summary">
          <span className="eyebrow">FINAL SETTLEMENT AMOUNT</span>
          <div className="pay-amount font-editorial">{formatINR(bill.amountPaise)}</div>
          <small className="field-hint" style={{ marginTop: 2, marginBottom: 12 }}>
            Agora Cross-Border Equivalent: <strong>{ausdDisplay}</strong>
          </small>

          <div className="pay-merchant">
            <span className="merchant-avatar">
              <ShieldCheck size={20} />
            </span>
            <div>
              <strong>{bill.merchantName}</strong>
              <small>Merchant-signed payload · {bill.id}</small>
            </div>
            <StatusIcon verdict={result.verdict} />
          </div>

          <div className="pay-row">
            <span>Settlement Token</span>
            <strong>Agora AUSD ({ausdDisplay}) · MON</strong>
          </div>
          <div className="pay-row">
            <span>Target Network</span>
            <strong>Monad Testnet (Chain ID 10143)</strong>
          </div>
          <div className="pay-row">
            <span>Account Settlement</span>
            <span>
              {wallet.connected && wallet.address ? (
                <span className="green font-mono" style={{ fontSize: '0.82rem' }}>
                  {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleConnectWallet()}
                  className="button button--ghost button--small"
                  style={{ padding: '2px 8px', height: 'auto', fontSize: '0.78rem' }}
                >
                  <Wallet size={12} /> Connect EVM Wallet
                </button>
              )}
            </span>
          </div>
          <div className="pay-row">
            <span>Merchant Signed Total</span>
            <strong>{formatINR(bill.signedTotalPaise)}</strong>
          </div>
          <div className="pay-row">
            <span>Guardian Policy Check</span>
            <strong style={{ color: blocked ? 'var(--red)' : 'var(--green)' }}>
              {blocked ? 'BLOCKED BY POLICY' : 'VERIFIED SAFE ✓'}
            </strong>
          </div>

          <div className="pay-safety">
            <LockKeyhole size={15} />
            <span>
              {wallet.connected
                ? 'Monad Testnet active. Explicit user authorization required before broadcast.'
                : 'Monad testnet demo payment. Demo tokens only. No real money moves.'}
            </span>
          </div>

          {blocked && (
            <motion.div
              className="blocked-reason"
              role="alert"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertOctagon size={16} style={{ verticalAlign: '-3px', marginRight: 8, flex: 'none' }} />
              <span>{reason}</span>
            </motion.div>
          )}

          <motion.button
            type="button"
            className="hold-button"
            disabled={blocked || loading}
            aria-label={blocked ? 'Payment blocked by Guardian' : 'Press and hold to confirm payment'}
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                startHold();
              }
            }}
            onKeyUp={(event) => {
              if (event.key === ' ' || event.key === 'Enter') stopHold();
            }}
            whileTap={blocked ? {} : { scale: 0.99 }}
          >
            <span className="hold-progress" style={{ width: `${progress}%` }} />
            <span className="hold-label">
              {blocked ? (
                'Payment blocked by Guardian'
              ) : progress > 0 ? (
                `Authorizing · ${Math.min(100, progress)}%`
              ) : (
                <>
                  Press and hold to authorize <ArrowRight size={16} />
                </>
              )}
            </span>
          </motion.button>

          <p className="hold-help">
            {blocked
              ? 'Review the blocked rule above. Guardian refuses to sign or broadcast this transaction.'
              : 'Press and hold for 1.2s to broadcast. Release early to cancel.'}
          </p>
        </Surface>

        <div className="pay-foot">
          <Link to="/verdict" className="button button--ghost">
            <ArrowLeft size={15} /> Back to Guardian checks
          </Link>
          <ModeBadge mode={wallet.connected ? 'testnet' : 'demo'} label={wallet.connected ? 'TESTNET (10143)' : 'NO REAL MONEY'} />
        </div>
      </div>
    </div>
  );
}
