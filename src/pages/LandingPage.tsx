import { lazy, Suspense, useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ChevronRight, ShieldCheck, ScanLine,
  FileCheck2, Zap, Eye, Fingerprint
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo, ModeBadge, StatusRail } from '../components/ui';
import { PaperBill } from '../components/primitives/PaperBill';
import '../styles/landing.css';

// Lazy-load the WebGL aurora – if it fails, the CSS fallback shows
const AuroraCanvas = lazy(() =>
  import('../components/primitives/AuroraCanvas').then(m => ({ default: m.AuroraCanvas }))
);

const storySteps = [
  {
    num: '01',
    title: 'Merchant signs the bill',
    body: 'Before showing you a QR, the merchant creates and cryptographically signs a bill: items, total, expiry, their address. The signature seals the amount.',
    tag: { label: 'EIP-712 signature', cls: 'violet' },
  },
  {
    num: '02',
    title: 'You scan. Guardian checks.',
    body: 'MONVEIL reads the QR and verifies the seal, checks that the QR amount matches exactly what was signed, confirms it has not expired, and checks your own rules (per-payment limit, daily cap).',
    tag: { label: 'On-device, before payment', cls: 'green' },
  },
  {
    num: '03',
    title: 'AI explains in one sentence',
    body: 'Kimi gives you one calm sentence about the result. It never makes the decision. You see the exact numbers. You decide.',
    tag: { label: 'AI explains only', cls: 'amber' },
  },
  {
    num: '04',
    title: 'You approve. Proof recorded.',
    body: 'Only if every check passes do you see the "Hold to pay" button. Once confirmed, a PaymentSettled event is recorded on Monad testnet and indexed by Envio.',
    tag: { label: 'On-chain proof', cls: 'violet' },
  },
];

const bentoCards = [
  {
    icon: <ShieldCheck size={20} />,
    title: 'Bill seal verification',
    body: 'Every bill is EIP-712 signed by the merchant. Guardian verifies the signature client-side before you ever see a payment button.',
    wide: false,
  },
  {
    icon: <Eye size={20} />,
    title: 'Amount tamper detection',
    body: 'The QR amount is compared byte-for-byte with what the merchant signed. A Rs 1 difference blocks the payment.',
    wide: false,
  },
  {
    icon: <Zap size={20} />,
    title: 'Your rules, always enforced',
    body: 'Set a per-payment limit, a daily cap, or block specific merchants. Guardian checks your rules before every payment, silently, in milliseconds.',
    wide: true,
  },
  {
    icon: <Fingerprint size={20} />,
    title: 'Passkey sign-in',
    body: 'No seed phrase. No password. Sign in with your device biometrics via Mera passkeys.',
    wide: false,
  },
  {
    icon: <FileCheck2 size={20} />,
    title: 'On-chain receipt',
    body: 'Every confirmed payment is indexed by Envio HyperIndex on Monad testnet so you can always look up the proof.',
    wide: false,
  },
];

// Fade-up helper – returns inline initial/animate/transition props
function fadeUp(i: number) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' as const },
  };
}

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [tampered, setTampered] = useState(false);
  const [webglOk, setWebglOk] = useState(true);

  // Detect WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const ok = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
      setWebglOk(ok);
    } catch {
      setWebglOk(false);
    }
  }, []);

  return (
    <div style={{ position: 'relative', background: 'var(--canvas-0)', minHeight: '100dvh', color: '#fff', overflowX: 'hidden' }}>

      {/* ── Aurora background ───────────────────────────────── */}
      <div className="landing-aurora" aria-hidden="true">
        {webglOk ? (
          <Suspense fallback={<div className="landing-aurora-fallback" />}>
            <AuroraCanvas />
          </Suspense>
        ) : (
          <div className="landing-aurora-fallback" />
        )}
      </div>

      {/* ── Testnet banner ──────────────────────────────────── */}
      <div className="testnet-banner" role="status" aria-live="polite">
        <ScanLine size={11} />
        TESTNET DEMO &nbsp;·&nbsp; DEMO TOKEN &nbsp;·&nbsp; NO REAL MONEY
      </div>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="ln-nav" aria-label="Main navigation">
        <Link to="/" className="ln-nav-logo" aria-label="MONVEIL home">
          <BrandLogo size="normal" />
        </Link>
        <div className="ln-nav-right">
          <StatusRail compact />
          <Link className="button button--ghost" to="/signin">
            Launch app <ChevronRight size={15} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="ln-hero" aria-label="MONVEIL hero">

        {/* Left: copy */}
        <div>
          <motion.div
            {...(reduceMotion ? {} : fadeUp(0))}
            className="ln-copy-eyebrow"
          >
            <span className="ln-copy-eyebrow-dot" aria-hidden="true" />
            Live on Monad testnet
          </motion.div>

          <motion.h1 {...(reduceMotion ? {} : fadeUp(1))} className="ln-headline">
            Know before<br />you <em>approve.</em>
          </motion.h1>

          <motion.p {...(reduceMotion ? {} : fadeUp(2))} className="ln-subline">
            A merchant signs the bill. You scan. Guardian verifies the seal,
            amount, expiry and your rules - before you ever see a payment button.
          </motion.p>

          <motion.div {...(reduceMotion ? {} : fadeUp(3))} className="ln-cta-row">
            <Link className="button button--primary" to="/signin" id="landing-try-demo-btn">
              Try the demo <ArrowRight size={17} />
            </Link>
            <a className="button button--secondary" href="#how-it-works">
              See how it works
            </a>
          </motion.div>

          <motion.p {...(reduceMotion ? {} : fadeUp(4))} className="ln-demo-note">
            No seed phrase &nbsp;·&nbsp; No real money &nbsp;·&nbsp; 5 demo scenarios
          </motion.p>
        </div>

        {/* Right: interactive paper bill */}
        <motion.div
          className="ln-bill-col"
          initial={reduceMotion ? false : { opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Tamper toggle */}
          <div className="ln-tamper-toggle" role="group" aria-label="Toggle bill tamper state">
            <button
              id="landing-toggle-honest"
              className={`ln-tamper-btn${!tampered ? ' active' : ''}`}
              onClick={() => setTampered(false)}
              aria-pressed={!tampered}
            >
              Honest bill
            </button>
            <button
              id="landing-toggle-tampered"
              className={`ln-tamper-btn${tampered ? ' active-red' : ''}`}
              onClick={() => setTampered(true)}
              aria-pressed={tampered}
            >
              Tampered QR
            </button>
          </div>

          {/* Guardian ring + paper bill */}
          <div className={`ln-guardian-ring${tampered ? ' tampered' : ''}`}>
            <div className="ln-guardian-label" aria-label="Guardian status">
              <ShieldCheck size={10} />
              {tampered ? 'GUARDIAN BLOCKED' : 'GUARDIAN VERIFIED'}
            </div>
            <PaperBill tampered={tampered} />
          </div>

          <ModeBadge mode="demo" label="TESTNET · DEMO TOKEN" />
        </motion.div>
      </section>

      {/* ── Scroll story ───────────────────────────────────── */}
      <section id="how-it-works" className="ln-story" aria-label="How MONVEIL works">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: '64px' }}
        >
          <span className="eyebrow" style={{ color: 'var(--brand-light)' }}>How it works</span>
          <h2 className="headline" style={{ fontSize: 'clamp(28px, 4vw, 48px)', marginTop: '12px', color: '#fff' }}>
            Five checks. One sentence. You decide.
          </h2>
        </motion.div>

        <div className="ln-story-steps">
          {storySteps.map((step, i) => (
            <motion.div
              key={step.num}
              className="ln-story-step"
              initial={reduceMotion ? false : { opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <div className="ln-story-num" aria-hidden="true">{step.num}</div>
              <div>
                <h3 className="ln-story-step-title">{step.title}</h3>
                <p className="ln-story-step-body">{step.body}</p>
                <span className={`ln-story-step-tag ${step.tag.cls}`}>
                  {step.tag.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Bento features ─────────────────────────────────── */}
      <section className="ln-bento" aria-label="Features">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          style={{ textAlign: 'center', marginBottom: '40px' }}
        >
          <span className="eyebrow" style={{ color: 'var(--brand-light)' }}>Built on real tools</span>
          <h2 className="headline" style={{ fontSize: 'clamp(26px, 3.5vw, 42px)', marginTop: '12px', color: '#fff' }}>
            Guardian never sleeps.
          </h2>
        </motion.div>

        <div className="ln-bento-grid">
          {bentoCards.map((card, i) => (
            <motion.article
              key={card.title}
              className={`ln-bento-card${card.wide ? ' wide' : ''}`}
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
            >
              <div className="ln-bento-icon" aria-hidden="true">{card.icon}</div>
              <h3 className="ln-bento-title">{card.title}</h3>
              <p className="ln-bento-body">{card.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ── CTA footer ─────────────────────────────────────── */}
      <section className="ln-cta-footer" aria-label="Call to action">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="ln-cta-footer-title">
            Save More. Lose Less.<br /><em>Pay Smarter.</em>
          </h2>
          <p className="ln-cta-footer-sub">
            Try all five demo scenarios: honest bill, tampered QR, replay, over-limit, expired.
          </p>
          <Link className="button button--primary" to="/signin" id="landing-cta-launch-btn"
            style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}>
            Launch the demo <ArrowRight size={18} />
          </Link>

          <div className="ln-footer-legal">
            TESTNET DEMO &nbsp;·&nbsp; DEMO TOKEN &nbsp;·&nbsp; NO REAL MONEY &nbsp;·&nbsp;
            AI EXPLAINS &nbsp;·&nbsp; IT NEVER DECIDES
          </div>
        </motion.div>
      </section>

    </div>
  );
}
