import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Ban, CheckCircle2, ChevronRight, Clock3, QrCode, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDemo } from '../app/DemoContext';
import { Skeleton, Surface } from '../components/ui';
import { formatINR } from '../domain/money';
import type { ActivityItem, AppRules, Scenario } from '../domain/types';
import { getActivity, getRules } from '../services/mockApi';
import { ActivityStatus, PageHeading } from './shared';

const scenarios: { key: Scenario; title: string; detail: string; icon: typeof CheckCircle2 }[] = [
  { key: 'honest', title: 'Honest bill', detail: 'Rs 1,050 · all checks pass', icon: CheckCircle2 },
  { key: 'tampered', title: 'Tampered QR', detail: 'Rs 1,250 · Rs 200 gap', icon: Ban },
  { key: 'replay', title: 'Already paid', detail: 'Replay · duplicate stop', icon: Activity },
  { key: 'over-limit', title: 'Above your limit', detail: 'Rs 2,500 · rule blocks', icon: ShieldCheck },
  { key: 'expired', title: 'Expired bill', detail: 'Time window passed', icon: Clock3 },
];
export function HomePage() {
  const { startScenario, loading, notify } = useDemo();
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [rules, setRules] = useState<AppRules | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([getActivity(), getRules()]).then(([items, saved]) => { if (alive) { setActivity(items); setRules(saved); } }).catch(() => { if (alive) notify('Home data could not load. Please refresh the demo.', 'error'); });
    return () => { alive = false; };
  }, [notify]);
  const confirmed = activity?.filter((item) => item.paymentStatus === 'confirmed') ?? [];
  const protectedAmount = confirmed.reduce((sum, item) => sum + item.amountPaise, 0);
  return <div className="content-wrap">
    <PageHeading eyebrow="TUESDAY, OCTOBER 13" title="A little more certainty." description="Your bills, checked before you choose what to do." action={<Link className="button button--secondary" to="/activity">View activity <ArrowRight size={15} /></Link>} />
    <div className="grid-home">
      <Surface className="guardian-card"><div className="guardian-ring" role="img" aria-label="Guardian ready: five checks available"><div className="guardian-ring-copy"><strong>5</strong><small>checks ready</small></div></div><div className="guardian-copy"><span className="eyebrow">GUARDIAN STATUS</span><h2>Ready to inspect.</h2><p>Every bill gets checked against its seal, amount, expiry, payment history and your rules.</p><div className="protected-amount"><strong>{activity ? formatINR(protectedAmount) : <span className="skeleton skeleton-line" style={{ display: 'inline-block', width: 115, margin: 0 }} />}</strong><span>Protected this month · demo</span></div></div></Surface>
      <div className="home-side-stack"><Surface className="rule-summary"><div className="surface-header"><div><h2 className="section-title">Your rules</h2><p className="section-subtitle">A clear line you set yourself.</p></div><Link to="/rules" aria-label="Edit your rules"><ChevronRight size={17} /></Link></div>{rules ? <><div className="rule-summary-line"><span>Per payment</span><strong>{formatINR(rules.perPaymentLimitPaise)}</strong></div><div className="rule-summary-line"><span>Daily cap</span><strong>{formatINR(rules.dailyCapPaise)}</strong></div><div className="rule-summary-line"><span>Blocked merchants</span><strong>{rules.blockedMerchants.length}</strong></div></> : <Skeleton className="skeleton-block" />}</Surface><Surface className="rule-summary"><div className="surface-header"><div><h2 className="section-title">A careful check</h2><p className="section-subtitle">AI explains. It never decides.</p></div><ShieldCheck size={19} className="green" /></div><p className="tiny">If a QR asks for a different amount than the signed bill, Guardian will stop the demo payment and show you the difference.</p></Surface></div>
      <div className="scan-cta"><div><h2>Have a bill to check?</h2><p>Scan a merchant QR, or explore a sample bill first.</p></div><Link to="/scan" className="button button--primary"><QrCode size={17} /> Scan and pay</Link></div>
      <Surface className="demo-scenarios"><div className="surface-header"><div><h2 className="section-title">Try five demo outcomes</h2><p className="section-subtitle">Each sample follows the same scan → bill → Guardian → decision path.</p></div><span className="eyebrow">ALL MOCKED</span></div><div className="scenario-grid">{scenarios.map(({ key, title, detail, icon: Icon }) => <button className="scenario-card" key={key} disabled={loading} onClick={() => void startScenario(key)}><Icon size={17} className="scenario-icon" /><strong>{title}</strong><small>{detail}</small></button>)}</div></Surface>
      <Surface className="activity-mini"><div className="surface-header"><div><h2 className="section-title">Recent activity</h2><p className="section-subtitle">A short look at your demo bills.</p></div><Link className="button button--ghost button--small" to="/activity">All activity <ChevronRight size={15} /></Link></div>{!activity ? <div className="activity-list"><Skeleton className="skeleton-block" /></div> : activity.length ? <div className="activity-list">{activity.slice(0, 3).map((item) => <div className="activity-row" key={item.id}><span className={`activity-symbol ${item.verdict === 'blocked' ? 'activity-symbol--blocked' : ''}`}>{item.verdict === 'blocked' ? <Ban size={16} /> : <CheckCircle2 size={16} />}</span><div className="activity-detail"><strong>{item.merchantName}</strong><small><ActivityStatus verdict={item.verdict} /> <span style={{ marginLeft: 7 }}>{new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></small></div><span className="activity-amount">{formatINR(item.amountPaise)}</span></div>)}</div> : <p className="tiny">No demo activity yet. Scan a sample bill to begin.</p>}</Surface>
    </div>
  </div>;
}
