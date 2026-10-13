import { useCallback, useState } from 'react';
import { ArrowLeft, CameraOff, CircleHelp, QrCode, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCamera } from '../components/QrCamera';
import { Button, ModeBadge } from '../components/ui';
import { useDemo } from '../app/DemoContext';
import { createSampleBill } from '../services/mockApi';
import type { Bill } from '../domain/types';

export function ScanPage() {
  const navigate = useNavigate();
  const { scanPayload, setBill, notify, loading } = useDemo();
  const [cameraMessage, setCameraMessage] = useState('');

  const onDecoded = useCallback((text: string) => {
    void scanPayload(text);
  }, [scanPayload]);

  const onDenied = useCallback((message: string) => {
    setCameraMessage(message);
  }, []);

  const loadSample = async () => {
    try {
      const bill: Bill = await createSampleBill('honest');
      setBill(bill);
      navigate('/bill');
    } catch {
      notify('The sample bill could not load. Try again.', 'error');
    }
  };

  return (
    <motion.div
      className="scan-page"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <header className="scan-top">
        <Link to="/home" aria-label="Back to Home" className="icon-button">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <strong>Scan a bill</strong>
          <small>Check what the merchant signed.</small>
        </div>
        <ModeBadge mode="demo" label="DEMO SCAN" />
      </header>

      <div className="scan-content">
        <div className="scan-intro">
          <div className="scan-pill-row">
            <span className="eyebrow">BILL CHECK · OPTICAL VERIFIER</span>
            <span className="scan-live-tag">
              <Sparkles size={11} /> Ready
            </span>
          </div>
          <h1>
            Hold steady.<br />
            <em>We’ll check the details.</em>
          </h1>
          <p>Point your camera at a MONVEIL signed-bill QR. Payload is inspected entirely on-device.</p>
        </div>

        <div className="scan-view-shell">
          <QrCamera onDecoded={onDecoded} onDenied={onDenied} />
        </div>

        {cameraMessage && (
          <div className="camera-fallback" role="status">
            <CameraOff size={17} />
            <span>{cameraMessage}</span>
          </div>
        )}

        <div className="scan-fallback-row">
          <Button
            variant="secondary"
            className="button--wide"
            onClick={() => void loadSample()}
            disabled={loading}
          >
            <QrCode size={17} />
            {loading ? 'Loading sample…' : 'Load sample bill (₹1,050 Honest)'}
          </Button>
          <p>No camera available? The sample bill runs without camera access.</p>
        </div>

        <div className="scan-trust">
          <ShieldCheck size={16} />
          <span>
            Guardian checks the bill before payment decisions. <Link to="/merchant">Open Merchant console</Link> to generate custom QRs.
          </span>
          <CircleHelp size={14} />
        </div>
      </div>
    </motion.div>
  );
}
