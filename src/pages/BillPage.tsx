import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Clock3, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../app/DemoContext';
import { Button, EmptyState, GuardianMark, Surface } from '../components/ui';
import { formatINR } from '../domain/money';
import { ScenarioLabel, PageHeading } from './shared';

export function BillPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { bill, evaluateBill, loading } = useDemo();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const remaining = bill ? Math.max(0, bill.expiresAt - now) : 0;
  const countdown = `${String(Math.floor(remaining / 60000)).padStart(2, '0')}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  const expiryPercent = useMemo(() => bill ? Math.max(0, Math.min(100, remaining / (10 * 60 * 1000) * 100)) : 0, [bill, remaining]);
  if (!bill) return <div className="content-wrap"><EmptyState title="No bill to inspect yet" body="Scan a merchant QR or open a demo sample before reviewing the bill." action={<Link className="button button--primary" to="/scan">Scan a bill</Link>} /></div>;
  const handleCheck = async () => { const result = await evaluateBill(); if (result) navigate('/verdict'); };
  return <div className="content-wrap"><PageHeading eyebrow="BILL REVEAL" title="First, look it over." description="This is what the merchant signed. Your payment choice comes after Guardian checks." action={<ScenarioLabel scenario={bill.scenario} />} />
    <div className="paper-layout">
      <motion.article className="receipt-paper" initial={reduceMotion ? false : { opacity: .5, y: 22, rotateX: -8 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} aria-label="Merchant-signed paper bill">
        <div className="receipt-brand"><div><strong>{bill.merchantName}</strong><small>INDIA · DEMO MERCHANT</small></div><span className="signed-stamp"><ShieldCheck size={13} /> MERCHANT SIGNED</span></div>
        <div className="receipt-lines">{bill.items.map((item) => <div className="receipt-item" key={item.id}><span className="receipt-item-name">{item.name}<small>{item.quantity} × {formatINR(item.unitPricePaise)}</small></span><strong>{formatINR(item.quantity * item.unitPricePaise)}</strong></div>)}</div>
        <div className="receipt-total"><div className="receipt-total-row"><span>Subtotal</span><strong>{formatINR(bill.subtotalPaise)}</strong></div><div className="receipt-total-row"><span>Tax · {(bill.taxBasisPoints / 100).toString()}%</span><strong>{formatINR(bill.taxPaise)}</strong></div><div className="receipt-total-row receipt-total-row--grand"><span>Merchant-signed total</span><strong>{formatINR(bill.signedTotalPaise)}</strong></div></div>
        <div className="receipt-footer">BILL SEAL · {bill.id} · TESTNET DEMO</div>
      </motion.article>
      <Surface className="bill-meta"><span className="eyebrow">BILL DETAILS</span><h2>Signed by {bill.merchantName.split('·')[0].trim()}.</h2><p>Guardian will check that the QR asks for the same amount the merchant signed.</p>
        <div className="bill-meta-row"><span>Bill reference</span><strong className="mono-id">{bill.id}</strong></div><div className="bill-meta-row"><span>Merchant signed</span><strong>{formatINR(bill.signedTotalPaise)}</strong></div><div className="bill-meta-row"><span>QR requests</span><strong>{formatINR(bill.amountPaise)}</strong></div><div className="bill-meta-row"><span>Expires in</span><strong className={remaining === 0 ? 'red' : ''}><Clock3 size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />{remaining === 0 ? 'Expired' : countdown}</strong></div><div className="expiry-meter"><span style={{ width: `${expiryPercent}%` }} /></div><div className="bill-meta-row"><span>Bill seal</span><strong className={bill.signatureValid === false ? 'red' : 'green'}>{bill.signatureValid === false ? 'Does not match' : 'Present'}</strong></div>
        <div className="bill-actions"><Link to="/scan" className="button button--secondary">Scan another</Link><Button onClick={() => void handleCheck()} disabled={loading}>{loading ? 'Checking…' : 'Check with Guardian'} <ArrowRight size={16} /></Button></div><div className="tiny" style={{ marginTop: 15 }}><GuardianMark /> Your decision comes after these checks.</div>
      </Surface>
    </div>
  </div>;
}
