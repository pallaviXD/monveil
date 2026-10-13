import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Clock3, ShieldCheck, Receipt, ArrowLeft } from 'lucide-react';
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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = bill ? Math.max(0, bill.expiresAt - now) : 0;
  const countdown = `${String(Math.floor(remaining / 60000)).padStart(2, '0')}:${String(
    Math.floor((remaining % 60000) / 1000)
  ).padStart(2, '0')}`;
  const expiryPercent = useMemo(
    () => (bill ? Math.max(0, Math.min(100, (remaining / (10 * 60 * 1000)) * 100)) : 0),
    [bill, remaining]
  );

  if (!bill) {
    return (
      <div className="content-wrap">
        <EmptyState
          title="No bill to inspect yet"
          body="Scan a merchant QR or open a demo sample before reviewing the bill."
          action={
            <Link className="button button--primary" to="/scan">
              Scan a bill
            </Link>
          }
        />
      </div>
    );
  }

  const handleCheck = async () => {
    const result = await evaluateBill();
    if (result) navigate('/verdict');
  };

  const isExpired = remaining === 0;

  return (
    <div className="content-wrap">
      <PageHeading
        eyebrow="BILL INSPECTION · STAGE 1"
        title="First, look it over."
        description="This is what the merchant cryptographically signed. Your payment decision comes strictly after Guardian verifies."
        action={<ScenarioLabel scenario={bill.scenario} />}
      />

      <div className="paper-layout">
        {/* The 3D Paper Bill */}
        <motion.article
          className="receipt-paper"
          initial={reduceMotion ? false : { opacity: 0, y: 26, rotateX: -10 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
          aria-label="Merchant-signed paper bill"
        >
          <div className="receipt-brand">
            <div>
              <strong>{bill.merchantName}</strong>
              <small>INDIA · CRYPTOGRAPHICALLY SIGNED</small>
            </div>
            <span className="signed-stamp">
              <ShieldCheck size={13} />
              <span>MERCHANT SIGNED</span>
            </span>
          </div>

          <div className="receipt-lines">
            {bill.items.map((item) => (
              <div className="receipt-item" key={item.id}>
                <span className="receipt-item-name">
                  {item.name}
                  <small>
                    {item.quantity} × {formatINR(item.unitPricePaise)}
                  </small>
                </span>
                <strong>{formatINR(item.quantity * item.unitPricePaise)}</strong>
              </div>
            ))}
          </div>

          <div className="receipt-total">
            <div className="receipt-total-row">
              <span>Subtotal</span>
              <strong>{formatINR(bill.subtotalPaise)}</strong>
            </div>
            <div className="receipt-total-row">
              <span>Tax · {(bill.taxBasisPoints / 100).toString()}% GST</span>
              <strong>{formatINR(bill.taxPaise)}</strong>
            </div>
            <div className="receipt-total-row receipt-total-row--grand">
              <span>Merchant-signed total</span>
              <strong>{formatINR(bill.signedTotalPaise)}</strong>
            </div>
          </div>

          <div className="receipt-footer">
            BILL SEAL · {bill.id} · MONAD TESTNET SAFE-PAY
          </div>
        </motion.article>

        {/* Bill Meta & Actions */}
        <Surface className="bill-meta">
          <div className="bill-meta-header">
            <span className="eyebrow">VERIFICATION PREVIEW</span>
            <span className="bill-ref-badge">
              <Receipt size={12} />
              <span className="font-mono">{bill.id.slice(0, 10)}</span>
            </span>
          </div>

          <h2>Signed by {bill.merchantName.split('·')[0].trim()}</h2>
          <p>Guardian will verify that the payment QR matches this exact signed amount.</p>

          <div className="bill-meta-rows">
            <div className="bill-meta-row">
              <span>Bill reference</span>
              <strong className="mono-id">{bill.id}</strong>
            </div>
            <div className="bill-meta-row">
              <span>Merchant signed</span>
              <strong className="font-editorial" style={{ fontSize: 16 }}>
                {formatINR(bill.signedTotalPaise)}
              </strong>
            </div>
            <div className="bill-meta-row">
              <span>QR requests</span>
              <strong
                className="font-editorial"
                style={{
                  fontSize: 16,
                  color: bill.amountPaise !== bill.signedTotalPaise ? 'var(--red)' : 'inherit',
                }}
              >
                {formatINR(bill.amountPaise)}
              </strong>
            </div>
            <div className="bill-meta-row">
              <span>Expires in</span>
              <strong className={isExpired ? 'red' : ''}>
                <Clock3 size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />
                {isExpired ? 'Expired' : countdown}
              </strong>
            </div>
            <div className="expiry-meter">
              <motion.span
                style={{
                  width: `${expiryPercent}%`,
                  background: isExpired
                    ? 'var(--red)'
                    : expiryPercent < 25
                    ? 'var(--amber)'
                    : 'var(--violet)',
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="bill-meta-row">
              <span>Bill seal integrity</span>
              <strong className={bill.signatureValid === false ? 'red' : 'green'}>
                {bill.signatureValid === false ? 'Does not match' : 'Valid HMAC Signature ✓'}
              </strong>
            </div>
          </div>

          <div className="bill-actions">
            <Link to="/scan" className="button button--secondary">
              <ArrowLeft size={15} /> Scan another
            </Link>
            <Button
              className="button--primary"
              onClick={() => void handleCheck()}
              disabled={loading}
            >
              {loading ? 'Inspecting…' : 'Check with Guardian'} <ArrowRight size={16} />
            </Button>
          </div>

          <div className="tiny" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <GuardianMark /> Your approval decision occurs strictly after these checks.
          </div>
        </Surface>
      </div>
    </div>
  );
}
