import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronRight, FileCheck2, LockKeyhole, ScanLine, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo, ModeBadge, StatusRail } from '../components/ui';

const flow = ['Request', 'Bill seal', 'Guardian checks', 'Your decision', 'Proof'];

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  return <div className="landing">
    <header className="landing-nav"><Link to="/" className="landing-logo" aria-label="MONVEIL"><BrandLogo size="normal" /></Link><div className="landing-nav-right"><StatusRail compact /><Link className="button button--ghost" to="/signin">Sign in <ChevronRight size={15} /></Link></div></header>
    <section className="landing-hero">
      <motion.div className="landing-copy" initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}>
        <ModeBadge mode="demo" label="TESTNET DEMO · NO REAL MONEY" />
        <h1>Know before<br />you <em>approve.</em></h1>
        <p>See what a merchant signed. Let Guardian check the bill before you decide to pay.</p>
        <div className="landing-cta-row"><Link className="button button--primary" to="/signin">Try the demo <ArrowRight size={17} /></Link><a className="button button--secondary" href="#how-it-works">See how it works</a></div>
        <div className="landing-caption">No seed phrase. No real money. Just a clearer way to inspect a bill.</div>
      </motion.div>
      <motion.div className="hero-proof" initial={reduceMotion ? false : { opacity: 0, y: 18, rotate: 1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 120, damping: 18, delay: .12 }}>
        <div className="hero-glow" />
        <div className="hero-paper">
          <div className="hero-paper-head"><div><strong>The Indigo House</strong><div className="tiny" style={{ color: '#756E78', marginTop: 4 }}>Jaipur · Room 204</div></div><span>DEMO BILL<br />#MV-1042</span></div>
          <div className="paper-line"><span>Garden room · 1 night</span><strong>Rs 910</strong></div><div className="paper-line"><span>Breakfast for two</span><strong>Rs 90</strong></div><div className="paper-line"><span>Tax · 5%</span><strong>Rs 50</strong></div>
          <div className="paper-line paper-total"><span>Merchant signed</span><strong>Rs 1,050</strong></div>
          <div className="paper-signed"><ShieldCheck size={15} /> Merchant signed · Bill seal present</div>
          <div className="amount-compare"><div className="compare-row"><span>QR asks</span><strong>Rs 1,250</strong></div><div className="gap-bar"><span /></div><div className="gap-note">Rs 200 difference · payment blocked</div></div>
          <motion.div className="hero-stamp" animate={reduceMotion ? undefined : { rotate: [11, 8, 11], scale: [1, 1.025, 1] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}><div><ShieldCheck size={18} /><br />CHECKED<br />BEFORE PAY</div></motion.div>
        </div>
      </motion.div>
    </section>
    <section id="how-it-works" className="flow-strip" aria-label="How MONVEIL works">{flow.map((step, i) => <div className="flow-wrap" key={step}><div className="flow-step"><b>{String(i + 1).padStart(2, '0')}</b><span>{step}</span></div>{i < flow.length - 1 && <span className="flow-arrow" />}</div>)}</section>
    <section className="landing-section"><span className="eyebrow">A quieter kind of protection</span><h2>Inspect the bill.<br />Keep control of the decision.</h2><p>MONVEIL compares the QR amount to the merchant-signed bill, checks the expiry and your own limits, then explains the result in plain words. You decide what happens next.</p><div className="privacy-grid"><article className="privacy-card"><LockKeyhole size={19} /><h3>What stays off-chain</h3><p>Your bill details, item lines, merchant notes and the explanation stay in this demo experience. They are not placed on a public ledger.</p></article><article className="privacy-card"><FileCheck2 size={19} /><h3>Only the payment proof is simulated</h3><p>The mock receipt shows a simulated Proof reference only after the demo reaches confirmed. There is no real network connection or token transfer.</p></article></div></section>
    <section className="landing-section" style={{ paddingTop: 16 }}><span className="eyebrow">Good to know</span><h2>Questions, answered plainly.</h2><div className="faq-list">
      <details className="faq-item"><summary>Does this move real money? <ChevronRight size={16} /></summary><p>No. This is a testnet demo using a demo token. No real payment is sent, and no bank or UPI account is connected.</p></details>
      <details className="faq-item"><summary>Does AI decide whether I can pay? <ChevronRight size={16} /></summary><p>No. Guardian checks the bill and your rules. AI only writes one plain-language explanation of the result.</p></details>
      <details className="faq-item"><summary>What happens when an amount does not match? <ChevronRight size={16} /></summary><p>The signed amount and the QR request are shown separately. Guardian blocks a mismatch so you can review it with the merchant.</p></details>
      <details className="faq-item"><summary>Is my bill information public? <ChevronRight size={16} /></summary><p>This frontend demo keeps sample bill information in the browser for the experience. Nothing here claims to be production privacy or a live payment system.</p></details>
    </div></section>
    <section className="landing-bottom"><div><span className="eyebrow">MONVEIL</span><div style={{ marginTop: 9 }}><strong>Save More. Lose Less.<br />Pay Smarter.</strong></div></div><Link className="button button--primary" to="/signin">Try the demo <ArrowRight size={17} /></Link></section>
    <footer className="landing-footer"><span><ScanLine size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />TESTNET DEMO. DEMO TOKEN. NO REAL MONEY.</span><span style={{ marginLeft: 10 }}><Sparkles size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />AI explains. It never decides.</span></footer>
  </div>;
}
