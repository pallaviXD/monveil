import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Ban, CheckCircle2, ChevronRight, Clock3, QrCode, ShieldCheck, Sparkles, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDemo } from '../app/DemoContext';
import { Skeleton, Surface } from '../components/ui';
import { formatINR } from '../domain/money';
import type { ActivityItem, AppRules, Scenario } from '../domain/types';
import { getActivity, getRules } from '../services/mockApi';
import { ActivityStatus, PageHeading } from './shared';

const scenarios: {
  key: Scenario;
  title: string;
  detail: string;
  icon: typeof CheckCircle2;
  badge: string;
  tone: 'safe' | 'danger' | 'warning';
}[] = [
  { key: 'honest', title: 'Honest bill', detail: '₹1,050 · all checks pass', icon: CheckCircle2, badge: 'PASS', tone: 'safe' },
  { key: 'tampered', title: 'Tampered QR', detail: '₹1,250 · ₹200 gap caught', icon: Ban, badge: 'BLOCKED', tone: 'danger' },
  { key: 'replay', title: 'Already paid', detail: 'Replay · duplicate stop', icon: Activity, badge: 'BLOCKED', tone: 'danger' },
  { key: 'over-limit', title: 'Above limit', detail: '₹2,500 · cap triggered', icon: AlertTriangle, badge: 'BLOCKED', tone: 'danger' },
  { key: 'expired', title: 'Expired bill', detail: 'Time window lapsed', icon: Clock3, badge: 'EXPIRED', tone: 'warning' },
];

export function HomePage() {
  const { startScenario, loading, notify } = useDemo();
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [rules, setRules] = useState<AppRules | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getActivity(), getRules()])
      .then(([items, saved]) => {
        if (alive) {
          setActivity(items);
          setRules(saved);
        }
      })
      .catch(() => {
        if (alive) notify('Home data could not load. Please refresh the demo.', 'error');
      });
    return () => { alive = false; };
  }, [notify]);

  const confirmed = activity?.filter((item) => item.paymentStatus === 'confirmed') ?? [];
  const protectedAmount = confirmed.reduce((sum, item) => sum + item.amountPaise, 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
  };

  return (
    <div className="content-wrap">
      <PageHeading
        eyebrow="TUESDAY, OCTOBER 13 · MONAD TESTNET"
        title="A little more certainty."
        description="Every bill inspected against merchant signature, amount, expiry and your personal rules before money moves."
        action={
          <Link className="button button--secondary" to="/activity">
            View activity <ArrowRight size={15} />
          </Link>
        }
      />

      <motion.div
        className="grid-home"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Guardian Status Main Card */}
        <motion.div variants={itemVariants}>
          <Surface className="guardian-card">
            <div className="guardian-ring" role="img" aria-label="Guardian ready: five checks available">
              <div className="guardian-ring-glow" aria-hidden="true" />
              <div className="guardian-ring-copy">
                <strong>5</strong>
                <small>checks ready</small>
              </div>
            </div>
            <div className="guardian-copy">
              <div className="guardian-card-badge-row">
                <span className="eyebrow">GUARDIAN ENGINE ACTIVE</span>
                <span className="guardian-pulse-indicator">
                  <span className="guardian-pulse-dot" />
                  Live verification
                </span>
              </div>
              <h2>Ready to inspect.</h2>
              <p>Every bill gets checked against its seal, amount, expiry, payment history and rules.</p>
              <div className="protected-amount">
                <strong>
                  {activity ? (
                    formatINR(protectedAmount)
                  ) : (
                    <span className="skeleton skeleton-line" style={{ display: 'inline-block', width: 115, margin: 0 }} />
                  )}
                </strong>
                <span>Protected this month · demo simulation</span>
              </div>
            </div>
          </Surface>
        </motion.div>

        {/* Side Stack: Rules & Philosophy */}
        <motion.div className="home-side-stack" variants={itemVariants}>
          <Surface className="rule-summary">
            <div className="surface-header">
              <div>
                <h2 className="section-title">Your rules</h2>
                <p className="section-subtitle">Limits set strictly on-device.</p>
              </div>
              <Link to="/rules" className="rule-link-arrow" aria-label="Edit your rules">
                <ChevronRight size={17} />
              </Link>
            </div>
            {rules ? (
              <>
                <div className="rule-summary-line">
                  <span>Per payment</span>
                  <strong>{formatINR(rules.perPaymentLimitPaise)}</strong>
                </div>
                <div className="rule-summary-line">
                  <span>Daily cap</span>
                  <strong>{formatINR(rules.dailyCapPaise)}</strong>
                </div>
                <div className="rule-summary-line">
                  <span>Blocked merchants</span>
                  <strong>{rules.blockedMerchants.length}</strong>
                </div>
              </>
            ) : (
              <Skeleton className="skeleton-block" />
            )}
          </Surface>

          <Surface className="rule-summary rule-summary--accent">
            <div className="surface-header">
              <div>
                <h2 className="section-title">A careful check</h2>
                <p className="section-subtitle">AI explains. It never decides.</p>
              </div>
              <ShieldCheck size={19} className="green" />
            </div>
            <p className="tiny" style={{ lineHeight: 1.55 }}>
              If a QR asks for a different amount than the merchant signed, Guardian immediately halts settlement and displays the exact difference.
            </p>
          </Surface>
        </motion.div>

        {/* Scan CTA Banner */}
        <motion.div className="scan-cta" variants={itemVariants}>
          <div className="scan-cta-copy">
            <div className="scan-cta-badge">
              <Sparkles size={13} />
              <span>Direct Flow</span>
            </div>
            <h2>Have a bill to check?</h2>
            <p>Scan any merchant QR code, or explore a sample scenario below.</p>
          </div>
          <Link to="/scan" className="button button--primary button--scan-cta">
            <QrCode size={18} />
            <span>Scan and pay</span>
          </Link>
        </motion.div>

        {/* Five Demo Scenarios Bento */}
        <motion.div variants={itemVariants} style={{ gridColumn: '1 / -1' }}>
          <Surface className="demo-scenarios">
            <div className="surface-header">
              <div>
                <h2 className="section-title">Try five demo outcomes</h2>
                <p className="section-subtitle">
                  Each sample runs through the full scan → bill → Guardian check → settlement path.
                </p>
              </div>
              <span className="eyebrow">INTERACTIVE DEMO</span>
            </div>
            <div className="scenario-grid">
              {scenarios.map(({ key, title, detail, icon: Icon, badge, tone }) => (
                <motion.button
                  className={`scenario-card scenario-card--${tone}`}
                  key={key}
                  disabled={loading}
                  onClick={() => void startScenario(key)}
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                >
                  <div className="scenario-card-top">
                    <Icon size={18} className="scenario-icon" />
                    <span className={`scenario-badge scenario-badge--${tone}`}>{badge}</span>
                  </div>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </motion.button>
              ))}
            </div>
          </Surface>
        </motion.div>

        {/* Activity Mini Feed */}
        <motion.div variants={itemVariants} style={{ gridColumn: '1 / -1' }}>
          <Surface className="activity-mini">
            <div className="surface-header">
              <div>
                <h2 className="section-title">Recent activity</h2>
                <p className="section-subtitle">Bills inspected and demo transactions.</p>
              </div>
              <Link className="button button--ghost button--small" to="/activity">
                All activity <ChevronRight size={15} />
              </Link>
            </div>
            {!activity ? (
              <div className="activity-list">
                <Skeleton className="skeleton-block" />
              </div>
            ) : activity.length ? (
              <div className="activity-list">
                {activity.slice(0, 3).map((item) => (
                  <div className="activity-row" key={item.id}>
                    <span
                      className={`activity-symbol ${
                        item.verdict === 'blocked' ? 'activity-symbol--blocked' : ''
                      }`}
                    >
                      {item.verdict === 'blocked' ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                    </span>
                    <div className="activity-detail">
                      <strong>{item.merchantName}</strong>
                      <small>
                        <ActivityStatus verdict={item.verdict} />
                        <span style={{ marginLeft: 8 }}>
                          {new Date(item.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </small>
                    </div>
                    <span className="activity-amount">{formatINR(item.amountPaise)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="tiny">No demo activity yet. Scan a sample bill to begin.</p>
            )}
          </Surface>
        </motion.div>
      </motion.div>
    </div>
  );
}
