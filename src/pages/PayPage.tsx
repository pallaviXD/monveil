import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDemo } from '../app/DemoContext';
import { EmptyState, ModeBadge, Skeleton, Surface, StatusIcon } from '../components/ui';
import { formatINR } from '../domain/money';
import { integrationConfig } from '../services/config';
import { PageHeading } from './shared';

export function PayPage() {
  const { bill, result, evaluateBill, submitPayment, loading } = useDemo();
  const [progress, setProgress] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const startedAt = useRef(0);
  const completed = useRef(false);
  useEffect(() => { if (bill && !result && !loading) void evaluateBill(); }, [bill, result, loading, evaluateBill]);
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
  if (!bill) return <div className="content-wrap"><EmptyState title="Nothing to pay yet" body="Scan a bill and see Guardian’s checks before reviewing any payment." action={<Link className="button button--primary" to="/scan">Scan a bill</Link>} /></div>;
  if (!result) return <div className="content-wrap"><PageHeading eyebrow="PAYMENT REVIEW" title="Checking before you continue…" /><Surface className="surface--pad"><Skeleton className="skeleton-block" /></Surface></div>;
  const blocked = result.verdict === 'blocked';
  const reason = blocked ? (result.reasonCode === 'amount' ? 'The QR asks for a different amount than the merchant signed. Review the bill before continuing.' : result.reasonCode === 'expiry' ? 'This bill has expired. Ask the merchant for a current bill.' : result.reasonCode === 'duplicate' ? 'This bill has already been paid in the demo. A duplicate payment is blocked.' : result.reasonCode === 'rules' ? 'This amount is above your Rs 2,000 per-payment limit or another saved rule.' : 'The bill seal could not be matched. Ask the merchant to create a new signed bill.') : '';
  return <div className="content-wrap"><PageHeading eyebrow="PAYMENT REVIEW" title="One last look." description="Confirm only after checking the amount and bill details." action={<ModeBadge mode={integrationConfig.chainMode} label={`PAYMENT · ${integrationConfig.chainMode.toUpperCase()}`} />} />
    <div className="pay-layout"><Surface className="pay-summary">
      <span className="eyebrow">QR AMOUNT REQUESTED</span><div className="pay-amount">{formatINR(bill.amountPaise)}</div><div className="pay-merchant"><span className="merchant-avatar"><ShieldCheck size={19} /></span><div><strong>{bill.merchantName}</strong><small>Merchant-signed bill · {bill.id}</small></div><StatusIcon verdict={result.verdict} /></div>
      <div className="pay-row"><span>Token</span><strong>Demo token</strong></div><div className="pay-row"><span>Network</span><strong>Testnet · simulated</strong></div><div className="pay-row"><span>Merchant signed</span><strong>{formatINR(bill.signedTotalPaise)}</strong></div>
      <div className="pay-safety"><LockKeyhole size={15} /><span>This is a demo payment. No real money moves.</span></div>
      {blocked && <div className="blocked-reason" role="alert"><XCircle size={15} style={{ verticalAlign: '-3px', marginRight: 6 }} />{reason}</div>}
      <button type="button" className="hold-button" disabled={blocked || loading} aria-label={blocked ? 'Payment blocked by Guardian' : 'Press and hold to confirm payment'} onPointerDown={startHold} onPointerUp={stopHold} onPointerLeave={stopHold} onPointerCancel={stopHold} onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); startHold(); } }} onKeyUp={(event) => { if (event.key === ' ' || event.key === 'Enter') stopHold(); }}>
        <span className="hold-progress" style={{ width: `${progress}%` }} /><span className="hold-label">{blocked ? 'Payment blocked' : progress > 0 ? `Keep holding · ${Math.min(100, progress)}%` : <>Press and hold to confirm <ArrowRight size={16} /></>}</span>
      </button><p className="hold-help">{blocked ? 'Review the reason above. Guardian will not send this payment.' : 'Hold for a moment. Let go to cancel.'}</p>
    </Surface><div className="pay-foot"><Link to="/verdict" className="button button--ghost"><ArrowLeft size={15} /> Back to Guardian checks</Link><ModeBadge mode="demo" label="NO REAL MONEY" /></div></div>
  </div>;
}
