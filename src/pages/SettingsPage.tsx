import { useEffect, useState } from 'react';
import { LockKeyhole, RotateCcw, ShieldCheck, WifiOff } from 'lucide-react';
import { useDemo } from '../app/DemoContext';
import { Button, ModeBadge, Surface, StatusRail } from '../components/ui';
import { integrationConfig } from '../services/config';
import { getDisplayCurrency, setDisplayCurrency } from '../services/mockApi';
import { PageHeading } from './shared';

export function SettingsPage() {
  const { resetDemo, notify } = useDemo();
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  useEffect(() => { let alive = true; getDisplayCurrency().then((value) => { if (alive) setCurrency(value); }).catch(() => { if (alive) notify('Display preference could not load. INR remains selected.', 'error'); }); return () => { alive = false; }; }, [notify]);
  const changeCurrency = async (value: 'INR' | 'USD') => { try { const saved = await setDisplayCurrency(value); setCurrency(saved); } catch { notify('Display preference could not be saved in this browser.', 'error'); } };
  return <div className="content-wrap"><PageHeading eyebrow="PREFERENCES" title="A little context." description="Demo settings are stored in this browser. No payment account is connected." />
    <div className="settings-grid"><Surface className="settings-card"><h2>Display</h2><p>Change how sample amounts are shown. The USD conversion is for display only.</p><div className="setting-row"><span>Display currency</span><select className="select" aria-label="Display currency" value={currency} onChange={(event) => changeCurrency(event.target.value as 'INR' | 'USD')}><option value="INR">INR · Indian rupee</option><option value="USD">USD · US dollar</option></select></div><div className="setting-row"><span>Demo exchange rate</span><strong>1 USD = Rs 83.00</strong></div></Surface>
      <Surface className="settings-card"><h2>Network status</h2><p>Only the DEMO mode is available. TESTNET and LIVE are not connected.</p><div className="setting-row"><span>Passkey</span><ModeBadge mode={integrationConfig.passkeyMode} /></div><div className="setting-row"><span>Payment</span><ModeBadge mode={integrationConfig.chainMode} /></div><div className="setting-row"><span>AI explanation</span><ModeBadge mode={integrationConfig.aiMode} /></div><StatusRail /></Surface>
      <Surface className="settings-card"><h2>Privacy notes</h2><p>This frontend uses mock services and sample data. Demo preferences and activity can be stored locally in your browser. No real payment network, passkey provider or AI service is called.</p><div className="privacy-note"><LockKeyhole size={15} /><span>Do not enter real payment credentials, personal details or private bills into this demo.</span></div><div className="setting-row"><span>Live account</span><strong><WifiOff size={14} style={{ verticalAlign: '-2px', marginRight: 5 }} />Not connected</strong></div></Surface>
      <Surface className="settings-card"><h2>Demo data</h2><p>Reset sample activity, bill, paid-bill references and saved rules in this browser. This does not affect any external account.</p><Button variant="danger" onClick={resetDemo}><RotateCcw size={15} /> Reset demo data</Button><div className="setting-row" style={{ marginTop: 13 }}><span>Demo guard</span><strong><ShieldCheck size={14} className="green" style={{ verticalAlign: '-2px', marginRight: 5 }} />Enabled for sample flow</strong></div></Surface>
    </div>
  </div>;
}
