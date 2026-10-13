import { useState } from 'react';
import { ArrowLeft, Fingerprint, ShieldCheck, Sparkles, KeyRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo, Button, ModeBadge, StatusRail } from '../components/ui';
import { connectWithPasskey } from '../services/mockApi';
import { integrationConfig } from '../services/config';

export function SignInPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setBusy(true);
    setError('');
    try {
      await connectWithPasskey();
      setConnected(true);
      window.setTimeout(() => navigate('/home'), 600);
    } catch {
      setError('Passkey sign-in could not complete. You can try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-ambient-glow" aria-hidden="true" />
      <motion.section
        className="auth-card"
        aria-labelledby="signin-heading"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <Link
          to="/"
          className="auth-back"
          style={{ justifyContent: 'flex-start', marginTop: 0, marginBottom: 14 }}
        >
          <motion.span
            whileHover={{ x: -3 }}
            transition={{ type: 'spring', stiffness: 400 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={14} /> Back to MONVEIL
          </motion.span>
        </Link>

        <div className="auth-logo">
          <BrandLogo size="large" />
        </div>

        <div className="auth-badge-row">
          <ModeBadge
            mode={integrationConfig.passkeyMode}
            label={`PASSKEY · ${integrationConfig.passkeyMode.toUpperCase()}`}
          />
        </div>

        <h1 id="signin-heading">Your bill, in view.</h1>
        <p>Continue with a passkey to try the MONVEIL demo. No seed phrase, no wallet setup.</p>

        <div className="auth-features-preview">
          <div className="auth-feature-pill">
            <KeyRound size={13} className="auth-feature-icon" />
            <span>Biometric Passkey</span>
          </div>
          <div className="auth-feature-pill">
            <Sparkles size={13} className="auth-feature-icon" />
            <span>Instant Demo Session</span>
          </div>
        </div>

        <motion.div whileTap={{ scale: 0.99 }}>
          <Button
            className="button--wide button--auth"
            onClick={() => void handleConnect()}
            disabled={busy || connected}
          >
            <motion.span
              animate={busy ? { rotate: [0, 10, -10, 0] } : {}}
              transition={{ repeat: Infinity, duration: 0.8 }}
              style={{ display: 'inline-flex' }}
            >
              <Fingerprint size={19} />
            </motion.span>
            {busy ? 'Authenticating passkey…' : connected ? 'Passkey Verified ✓' : 'Continue with passkey'}
          </Button>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.p
              className="field-error"
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {error}
            </motion.p>
          )}

          {connected && (
            <motion.p
              className="success-note"
              role="status"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <ShieldCheck size={16} /> Passkey connected for this demo. Redirecting to Home…
            </motion.p>
          )}
        </AnimatePresence>

        <div className="auth-foot">
          <StatusRail compact />
          <span style={{ display: 'block', marginTop: 12, opacity: 0.75 }}>
            Monad Testnet · Demo token · No real money
          </span>
        </div>
      </motion.section>
    </div>
  );
}
