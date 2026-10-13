import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Scenario, Verdict } from '../domain/types';
import { Skeleton, StatusIcon } from '../components/ui';

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-actions">{action}</div>}</div>;
}
export function LoadingCard({ title = 'Loading securely' }: { title?: string }) {
  return <div className="surface surface--pad" aria-live="polite"><span className="eyebrow">{title}</span><Skeleton className="skeleton-line" /><Skeleton className="skeleton-block" /></div>;
}
export function ScenarioLabel({ scenario }: { scenario: Scenario }) {
  const labels: Record<Scenario, string> = { honest: 'Signed bill', tampered: 'Amount changed', replay: 'Already paid', 'over-limit': 'Above your limit', expired: 'Expired bill' };
  return <span className="pill"><span className="mode-dot" />{labels[scenario]}</span>;
}
export function ActivityStatus({ verdict }: { verdict: Verdict }) {
  const Icon = verdict === 'safe' ? CheckCircle2 : verdict === 'review' ? CircleAlert : XCircle;
  return <span className={`tag tag--${verdict}`}><Icon size={14} />{verdict === 'safe' ? 'Paid' : verdict === 'review' ? 'Review' : 'Blocked'}</span>;
}
export function BackTo({ to = '/home', label = 'Back to Home' }: { to?: string; label?: string }) {
  return <Link className="back-link" to={to}><ArrowLeft size={15} />{label}</Link>;
}
export function ContinueLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="continue-link" to={to}>{children}<ArrowRight size={15} /></Link>;
}
export function OutcomeBadge({ verdict, label }: { verdict: Verdict; label?: string }) { return <StatusIcon verdict={verdict} label={label} />; }
