import { useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, CircleDashed, ShieldCheck, XCircle } from 'lucide-react';
import type { Mode, Verdict } from '../domain/types';

export function BrandLogo({ size = 'normal', className = '', variant = 'full' }: { size?: 'compact' | 'normal' | 'large'; className?: string; variant?: 'full' | 'mark' }) {
  const [failed, setFailed] = useState(false);
  const src = variant === 'mark' ? '/logo-mark.png' : '/logo.png';
  return failed
    ? <span className={`brand-fallback brand-fallback--${size} ${className}`}>MONVEIL</span>
    : <img className={`brand-image brand-image--${size} brand-image--${variant} ${className}`} src={src} alt="MONVEIL: Save More. Lose Less. Pay Smarter." onError={() => setFailed(true)} />;
}

export function ModeBadge({ mode = 'demo', label }: { mode?: Mode; label?: string }) {
  const display = mode.toUpperCase();
  return <span className={`mode-badge mode-badge--${mode}`} title={label ?? `${display} mode`}><span className="mode-dot" />{label ?? display}</span>;
}

export function StatusRail({ compact = false }: { compact?: boolean }) {
  return <div className={`status-rail ${compact ? 'status-rail--compact' : ''}`} aria-label="Environment status">
    <ModeBadge mode="demo" label="DEMO" />
    <span className="mode-badge mode-badge--off" title="TESTNET is not connected"><span className="mode-dot" />TESTNET <small>offline</small></span>
    <span className="mode-badge mode-badge--off" title="LIVE is not connected"><span className="mode-dot" />LIVE <small>off</small></span>
  </div>;
}

export function StatusIcon({ verdict, label }: { verdict: Verdict; label?: string }) {
  const Icon = verdict === 'safe' ? CheckCircle2 : verdict === 'review' ? AlertCircle : XCircle;
  return <span className={`status-label status-label--${verdict}`}><Icon size={16} strokeWidth={2.2} aria-hidden="true" />{label ?? (verdict === 'safe' ? 'Safe to pay' : verdict === 'review' ? 'Review' : 'Blocked')}</span>;
}

export function CheckIcon({ status }: { status: 'pass' | 'blocked' | 'review' }) {
  const Icon = status === 'pass' ? CheckCircle2 : status === 'review' ? AlertCircle : XCircle;
  return <Icon size={18} aria-hidden="true" className={`check-icon check-icon--${status}`} />;
}

export function Button({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; children: ReactNode }) {
  return <button className={`button button--${variant} ${className}`} {...props}>{children}</button>;
}

export function Surface({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <section className={`surface ${className}`} style={style}>{children}</section>;
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function GuardianMark({ className = '' }: { className?: string }) {
  return <span className={`guardian-mark ${className}`} aria-hidden="true"><ShieldCheck size={18} /></span>;
}

export function EmptyState({ icon = 'empty', title, body, action }: { icon?: 'empty' | 'error'; title: string; body: string; action?: ReactNode }) {
  return <div className="empty-state">{icon === 'error' ? <AlertCircle size={24} /> : <CircleDashed size={24} />}<strong>{title}</strong><p>{body}</p>{action}</div>;
}
