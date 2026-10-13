import { useState } from 'react';
import { ArrowLeft, Fingerprint, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandLogo, Button, ModeBadge, StatusRail } from '../components/ui';
import { connectWithPasskey } from '../services/mockApi';
import { integrationConfig } from '../services/config';

export function SignInPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const handleConnect = async () => {
    setBusy(true); setError('');
    try { await connectWithPasskey(); setConnected(true); window.setTimeout(() => navigate('/home'), 500); }
    catch { setError('Passkey sign-in could not complete. You can try again.'); }
    finally { setBusy(false); }
  };
  return <div className="auth-page"><section className="auth-card" aria-labelledby="signin-heading">
    <Link to="/" className="auth-back" style={{ justifyContent: 'flex-start', marginTop: 0, marginBottom: 8 }}><ArrowLeft size={14} /> Back to MONVEIL</Link>
    <div className="auth-logo"><BrandLogo size="large" /></div>
    <div className="auth-badge-row"><ModeBadge mode={integrationConfig.passkeyMode} label={`PASSKEY · ${integrationConfig.passkeyMode.toUpperCase()}`} /></div>
    <h1 id="signin-heading">Your bill, in view.</h1><p>Continue with a passkey to try the MONVEIL demo. No seed phrase, no wallet setup.</p>
    <Button className="button--wide" onClick={() => void handleConnect()} disabled={busy || connected}><Fingerprint size={18} />{busy ? 'Checking passkey…' : connected ? 'Passkey ready' : 'Continue with passkey'}</Button>
    {error && <p className="field-error" role="alert">{error}</p>}
    {connected && <p className="success-note" role="status"><ShieldCheck size={15} /> Passkey connected for this demo. Taking you to Home…</p>}
    <p className="auth-foot"><StatusRail compact /><span style={{ display: 'block', marginTop: 11 }}>Testnet demo. Demo token. No real money.</span></p>
  </section></div>;
}
