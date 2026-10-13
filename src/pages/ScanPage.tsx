import { useCallback, useState } from 'react';
import { ArrowLeft, CameraOff, CircleHelp, QrCode, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCamera } from '../components/QrCamera';
import { Button, ModeBadge } from '../components/ui';
import { useDemo } from '../app/DemoContext';
import { createSampleBill } from '../services/mockApi';
import type { Bill } from '../domain/types';

export function ScanPage() {
  const navigate = useNavigate();
  const { scanPayload, setBill, notify, loading } = useDemo();
  const [cameraMessage, setCameraMessage] = useState('');
  const onDecoded = useCallback((text: string) => { void scanPayload(text); }, [scanPayload]);
  const onDenied = useCallback((message: string) => { setCameraMessage(message); }, []);
  const loadSample = async () => {
    try { const bill: Bill = await createSampleBill('honest'); setBill(bill); navigate('/bill'); }
    catch { notify('The sample bill could not load. Try again.', 'error'); }
  };
  return <div className="scan-page">
    <header className="scan-top"><Link to="/home" aria-label="Back to Home" className="icon-button"><ArrowLeft size={18} /></Link><div><strong>Scan a bill</strong><small>Check what the merchant signed.</small></div><ModeBadge mode="demo" label="DEMO" /></header>
    <div className="scan-content"><div className="scan-intro"><span className="eyebrow">BILL CHECK · CAMERA SCAN</span><h1>Hold steady.<br /><em>We’ll check the details.</em></h1><p>Point your camera at a MONVEIL signed-bill QR. Your camera stays on this device in the demo.</p></div>
      <div className="scan-view-shell"><QrCamera onDecoded={onDecoded} onDenied={onDenied} /></div>
      {cameraMessage && <div className="camera-fallback" role="status"><CameraOff size={17} /><span>{cameraMessage}</span></div>}
      <div className="scan-fallback-row"><Button variant="secondary" className="button--wide" onClick={() => void loadSample()} disabled={loading}><QrCode size={17} />{loading ? 'Loading…' : 'Load sample bill'}</Button><p>Camera denied? The sample bill works without camera access.</p></div>
      <div className="scan-trust"><ShieldCheck size={15} /><span>Guardian checks the bill before a payment decision. <Link to="/merchant">Open the DEMO merchant console</Link> to create a scannable QR.</span><CircleHelp size={14} /></div>
    </div>
  </div>;
}
