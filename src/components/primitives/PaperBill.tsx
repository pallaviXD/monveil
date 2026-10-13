import { useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface PaperBillProps {
  tampered: boolean;
}

export function PaperBill({ tampered }: PaperBillProps) {
  const billRef = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(8);
  const rotY = useMotionValue(-6);
  const springX = useSpring(rotX, { stiffness: 120, damping: 20 });
  const springY = useSpring(rotY, { stiffness: 120, damping: 20 });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    function onMove(e: MouseEvent | TouchEvent) {
      const bill = billRef.current;
      if (!bill) return;
      const rect = bill.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const ex = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const ey = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = (ex - cx) / (rect.width / 2);
      const dy = (ey - cy) / (rect.height / 2);
      rotX.set(-dy * 14 + 8);
      rotY.set(dx * 14 - 6);
    }

    function onLeave() {
      rotX.set(8);
      rotY.set(-6);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [rotX, rotY]);

  const signedAmt = 1050;
  const qrAmt     = tampered ? 1250 : 1050;
  const gap        = qrAmt - signedAmt;

  return (
    <div ref={billRef} style={{ perspective: '900px', perspectiveOrigin: '50% 40%' }}>
      <motion.div
        style={{
          rotateX: springX,
          rotateY: springY,
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          width: 'min(100%, 400px)',
          margin: '0 auto',
        }}
      >
        {/* Bill surface */}
        <div className="hero-bill-paper" data-tampered={tampered}>
          {/* Perforated top edge */}
          <div className="hero-bill-perforate" />

          {/* Bill header */}
          <div className="hero-bill-head">
            <div>
              <strong className="hero-bill-merchant">The Imperial Spice</strong>
              <span className="hero-bill-sub">New Delhi · Table 7</span>
            </div>
            <div className="hero-bill-signed-stamp">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Merchant signed
            </div>
          </div>

          {/* Line items */}
          <div className="hero-bill-lines">
            {[
              { name: 'Butter Chicken', qty: 2, price: 340 },
              { name: 'Garlic Naan', qty: 4, price: 80 },
              { name: 'Masala Chai', qty: 2, price: 60 },
            ].map(item => (
              <div className="hero-bill-item" key={item.name}>
                <span>{item.name} <span style={{ opacity: 0.55 }}>×{item.qty}</span></span>
                <span className="money">₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>

          {/* Total section */}
          <div className="hero-bill-total-section">
            <div className="hero-bill-total-row">
              <span>Subtotal</span>
              <span className="money">₹950</span>
            </div>
            <div className="hero-bill-total-row">
              <span>GST (10%)</span>
              <span className="money">₹100</span>
            </div>
            <div className="hero-bill-grand-row">
              <span>Merchant signed for</span>
              <span className="money" style={{ fontFamily: 'var(--font-head)', fontSize: '1.3rem', fontWeight: 700 }}>
                ₹{signedAmt.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Tamper comparison */}
          {tampered && (
            <motion.div
              className="hero-bill-tamper"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <div className="hero-bill-tamper-row">
                <span>QR is asking for</span>
                <span className="money" style={{ color: 'var(--status-red)', fontWeight: 700 }}>
                  ₹{qrAmt.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="hero-bill-gap-bar">
                <span />
              </div>
              <div className="hero-bill-gap-label">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
                  <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Guardian caught ₹{gap} overcharge
              </div>
            </motion.div>
          )}

          {/* Wax-seal stamp */}
          <div className={`hero-bill-seal${tampered ? ' hero-bill-seal--warn' : ''}`}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Guardian verified">
              {tampered
                ? <path d="M7 7l14 14M21 7L7 21" stroke="var(--status-red)" strokeWidth="2.5" strokeLinecap="round"/>
                : <path d="M6 14l5 5 11-11" stroke="var(--status-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              }
            </svg>
            <span>{tampered ? 'TAMPERED' : 'VERIFIED'}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
