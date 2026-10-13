import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShieldCheck, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../app/DemoContext';
import { Button, CheckIcon, EmptyState, ModeBadge, Surface, StatusIcon } from '../components/ui';
import { formatINR } from '../domain/money';
import { integrationConfig } from '../services/config';
import { PageHeading } from './shared';

const circumference = 2 * Math.PI * 43;
export function VerdictPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { bill, result, explanation, evaluateBill, loading } = useDemo();
  useEffect(() => { if (bill && !result && !loading) void evaluateBill(); }, [bill, result, loading, evaluateBill]);
  if (!bill) return <div className="content-wrap"><EmptyState title="No bill has been checked" body="Bring in a bill first. Guardian will explain each check before you decide." action={<Link className="button button--primary" to="/scan">Scan a bill</Link>} /></div>;
  if (!result) return <div className="content-wrap"><PageHeading eyebrow="GUARDIAN" title="Checking the bill…" description="Five quick checks, then a plain explanation." /><Surface className="surface--pad"><div className="skeleton skeleton-block" /></Surface></div>;
  const mismatch = bill.amountPaise !== bill.signedTotalPaise;
  const integrityLabel = result.lineItemStatus === 'pass' ? 'Pass' : result.lineItemStatus === 'review' ? 'Review' : 'Unavailable';
  const heading = result.verdict === 'safe' ? 'Safe to pay' : result.verdict === 'review' ? 'Review this bill' : 'Payment blocked';
  const checksPassed = result.checks.filter((check) => check.status === 'pass').length;
  const ringColor = result.verdict === 'safe' ? '#3DDC97' : result.verdict === 'review' ? '#FFB020' : '#FF5D5D';
  return <div className="content-wrap"><PageHeading eyebrow="GUARDIAN VERDICT" title="The checks are in." description="Guardian checks the bill. You make the decision." action={<StatusIcon verdict={result.verdict} />} />
    <div className="verdict-layout">
      <Surface className="verdict-main">
        <div className="verdict-hero"><motion.div className={`verdict-amount-ring verdict-amount-ring--${result.verdict}`} initial={reduceMotion ? false : { scale: .96 }} animate={{ scale: 1 }} transition={{ duration: .38 }}><svg className="verdict-ring-svg" viewBox="0 0 100 100" aria-hidden="true"><circle className="verdict-ring-track" cx="50" cy="50" r="43" /><motion.circle className="verdict-ring-value" cx="50" cy="50" r="43" stroke={ringColor} strokeDasharray={circumference} initial={reduceMotion ? false : { strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - checksPassed / 5) }} transition={{ duration: .9, ease: 'easeOut' }} /></svg><div className="verdict-amount-inner"><div><small>AMOUNT</small><strong>{formatINR(bill.amountPaise)}</strong></div></div></motion.div><div><StatusIcon verdict={result.verdict} /><h2>{heading}</h2><p>{result.verdict === 'safe' ? 'The signed amount matches and fits your rules.' : result.verdict === 'review' ? 'One detail needs a closer look.' : 'Guardian stopped this payment before it could be sent.'}</p></div></div>
        <div className="check-list">{result.checks.map((check, index) => <motion.div className="guardian-check" key={check.id} initial={reduceMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduceMotion ? 0 : index * .18, duration: .26 }}><span className="check-index">0{index + 1}</span><div><strong>{check.label}</strong><small>{check.explanation}</small></div><span className={`check-state check-state--${check.status}`}>{check.status}</span></motion.div>)}</div>
        <div className="line-check"><div><strong>Line-item overcharge check</strong><small>Math · duplicates · tax total</small></div><span className={`check-state check-state--${result.lineItemStatus === 'pass' ? 'pass' : result.lineItemStatus === 'review' ? 'review' : ''}`}><CheckIcon status={result.lineItemStatus === 'unavailable' ? 'review' : result.lineItemStatus} /> {integrityLabel}</span></div>
      </Surface>
      <div className="verdict-aside">
        {mismatch && <motion.div className="amount-mismatch" initial={reduceMotion ? false : { opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .3 }}><div className="mismatch-title"><XCircle size={15} /> THE AMOUNTS DO NOT MATCH</div><div className="mismatch-row"><span>Merchant signed</span><strong>{formatINR(bill.signedTotalPaise)}</strong></div><div className="mismatch-row"><span>QR asks</span><strong>{formatINR(bill.amountPaise)}</strong></div><div className="mismatch-bar"><span /></div><div className="mismatch-gap">{formatINR(Math.abs(bill.amountPaise - bill.signedTotalPaise))} difference</div></motion.div>}
        <Surface className="explanation-card"><div className="explanation-head"><strong><ShieldCheck size={17} /> Explained by AI</strong><ModeBadge mode={integrationConfig.aiMode} label={`AI · ${integrationConfig.aiMode.toUpperCase()}`} /></div><p>{explanation || 'Guardian has finished checking this bill. The explanation will appear here.'}</p></Surface>
        <Surface className="surface--pad" style={{ marginTop: 14 }}><span className="eyebrow">YOUR NEXT STEP</span><p className="section-subtitle" style={{ marginTop: 8 }}>{result.verdict === 'safe' ? 'All checks pass. You can review the payment summary next.' : result.verdict === 'review' ? 'Take a moment to review the bill details with the merchant.' : 'No payment will be made for this bill.'}</p><div style={{ marginTop: 14 }}>{result.verdict === 'safe' ? <Button className="button--wide" onClick={() => navigate('/pay')}>Continue to pay <ArrowRight size={16} /></Button> : <div className="page-actions"><Link className="button button--secondary" to="/bill">Review bill</Link><Link className="button button--primary" to="/scan">Scan another</Link></div>}</div></Surface>
      </div>
    </div>
  </div>;
}
