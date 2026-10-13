import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, Flashlight, FlashlightOff } from 'lucide-react';
import { Button } from './ui';

export function QrCamera({ onDecoded, onDenied }: { onDecoded: (text: string) => void; onDenied: (message: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [ready, setReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [torchMessage, setTorchMessage] = useState('');
  useEffect(() => {
    let alive = true;
    let timer = 0;
    let delivered = false;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(true);
        onDenied('Camera access is not available in this browser. Use the sample bill below.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (!alive) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        setTorchSupported(Boolean(track && 'getCapabilities' in track && (track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean }).torch));
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); setReady(true); }
        timer = window.setInterval(() => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || delivered) return;
          const width = video.videoWidth;
          const height = video.videoHeight;
          if (!width || !height) return;
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) return;
          context.drawImage(video, 0, 0, width, height);
          const image = context.getImageData(0, 0, width, height);
          const qr = jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' });
          if (qr?.data) { delivered = true; onDecoded(qr.data); }
        }, 110);
      } catch (error) {
        setCameraError(true);
        const message = error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
          ? 'Camera permission was denied. You can still load a sample bill or scan again after enabling camera access.'
          : 'We could not open the camera. Use the sample bill or check your camera connection.';
        onDenied(message);
      }
    };
    void start();
    return () => { alive = false; window.clearInterval(timer); streamRef.current?.getTracks().forEach((track) => track.stop()); };
  }, [onDecoded, onDenied]);
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !torchSupported) { setTorchMessage('Torch is not supported by this camera.'); return; }
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
      setTorchMessage('');
    } catch { setTorchMessage('Torch could not be changed on this device.'); }
  };
  return <div className="camera-stage">
    <video ref={videoRef} className="camera-video" muted playsInline aria-label="Live camera viewfinder" />
    <canvas ref={canvasRef} className="camera-canvas" aria-hidden="true" />
    {!ready && <div className="camera-loading">{cameraError ? <CameraOff size={23} /> : <Camera size={23} />}<span>{cameraError ? 'Camera unavailable' : 'Opening camera…'}</span></div>}
    <div className={`viewfinder ${cameraError ? 'viewfinder--inactive' : ''}`} aria-hidden="true"><i /><i /><i /><i />{!cameraError && <span className="scan-line" />}</div>
    <div className="camera-controls"><Button variant="secondary" className="camera-torch" onClick={() => void toggleTorch()} aria-label={torchOn ? 'Turn torch off' : 'Turn torch on'}>{torchOn ? <FlashlightOff size={17} /> : <Flashlight size={17} />}<span>{torchOn ? 'Torch on' : 'Torch'}</span></Button><span className="camera-hint">Hold the QR inside the frame</span></div>
    {torchMessage && <div className="torch-message" role="status">{torchMessage}</div>}
  </div>;
}
