import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, Copy, Share2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDemo } from '../app/DemoContext';
import { Button, EmptyState, ModeBadge, Surface } from '../components/ui';
import { formatINR } from '../domain/money';
import { PageHeading } from './shared';

export function ReceiptPage() {
  const { receipt, notify } = useDemo();
  const [sharing, setSharing] = useState(false);
  if (!receipt) return <div className="content-wrap"><EmptyState title="No receipt yet" body="A receipt appears here after a demo payment is confirmed or fails." action={<Link className="button button--primary" to="/scan">Scan a bill</Link>} /></div>;
  const confirmed = receipt.status === 'confirmed';
  const share = async () => {
    setSharing(true);
    const message = `MONVEIL demo receipt · ${receipt.bill.merchantName} · ${formatINR(receipt.bill.amountPaise)} · simulated, no real money`;
    try {
      if (navigator.share) await navigator.share({ title: 'MONVEIL demo receipt', text: message });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(message); notify('Receipt summary copied.'); }
      else notify('Sharing is not available on this device.');
    } catch { notify('Share was cancelled.'); }
    finally { setSharing(false); }
  };
  const proofId = receipt.simulatedProofId ?? `proof-${receipt.bill.id.toLowerCase()}`;
  return <div className="content-wrap"><PageHeading eyebrow="PAYMENT STATUS" title={confirmed ? 'A clear record.' : receipt.status === 'failed' ? 'Payment did not complete.' : 'Payment in progress…'} description="This receipt is part of the simulated MONVEIL demo." action={<ModeBadge mode="demo" label="SIMULATED" />} />
    <div className="receipt-layout"><article className="receipt-paper receipt-paper-large" aria-label="MONVEIL demo receipt">
      {confirmed && <div className="receipt-stamp"><span>PAID<br />IN DEMO</span></div>}
      {receipt.status === 'failed' && <div className="receipt-stamp receipt-stamp--failed"><span><XCircle size={18} /><br />NOT<br />SENT</span></div>}
      <div className="receipt-brand"><div><strong>MONVEIL</strong><small>PAYMENT RECEIPT · TESTNET DEMO</small></div><span className="signed-stamp"><CheckCircle2 size={13} /> BILL CHECKED</span></div>
      <div className="receipt-total" style={{ paddingTop: 20 }}><div className="receipt-total-row"><span>Merchant</span><strong>{receipt.bill.merchantName}</strong></div><div className="receipt-total-row"><span>Bill reference</span><strong className="font-mono">{receipt.bill.id}</strong></div><div className="receipt-total-row receipt-total-row--grand"><span>Demo amount</span><strong>{formatINR(receipt.bill.amountPaise)}</strong></div><div className="receipt-total-row"><span>Status</span><strong className={confirmed ? 'green' : receipt.status === 'failed' ? 'red' : 'amber'}>{receipt.status.toUpperCase()}</strong></div><div className="receipt-total-row"><span>Recorded</span><strong>{new Date(receipt.confirmedAt ?? receipt.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong></div></div>
      <div className="receipt-footer">TESTNET DEMO · DEMO TOKEN · NO REAL MONEY</div>
      <details className="details-accordion"><summary>Details <span>Hash · contract · network</span></summary><div className="receipt-details"><span>Demo reference: {receipt.detailHash ?? receipt.id}</span><span>Guardian contract: {receipt.detailContract ?? 'Not connected'}</span><span>Network: {receipt.detailNetwork ?? 'Testnet · simulated'}</span></div></details>
    </article>
      <Surface className="surface--pad" style={{ marginTop: 17 }}><div className="receipt-statusline">{confirmed ? <><Check size={16} /> Confirmed in the demo</> : receipt.status === 'failed' ? <><XCircle size={16} /> No payment was sent</> : <><span className="status-pulse" /> {receipt.status === 'pending' ? 'Pending' : 'Submitted'}</>}</div><p className="section-subtitle" style={{ marginTop: 8 }}>{confirmed ? 'The signed bill and payment amount are recorded in this simulated receipt.' : receipt.status === 'failed' ? 'The payment did not complete. No real money moved.' : 'The demo is still preparing the payment status.'}</p>
        <div className="receipt-actions">{confirmed && receipt.simulatedProofUrl && <a id={proofId} className="button button--secondary" href={receipt.simulatedProofUrl}><ArrowUpRight size={15} /> Simulated Proof</a>}{confirmed && <Button variant="secondary" onClick={() => void share()} disabled={sharing}><Share2 size={15} />{sharing ? 'Sharing…' : 'Share'}</Button>}<Link className={`button ${confirmed ? 'button--ghost' : 'button--primary'}`} to="/home">Done <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} /></Link></div>
        {confirmed && <p className="tiny" style={{ margin: '12px 0 0' }}><Copy size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />Proof is simulated. It is not an explorer link or a real transaction.</p>}
      </Surface></div>
  </div>;
}
