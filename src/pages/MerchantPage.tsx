import { useMemo, useState } from 'react';
import { AlertTriangle, Copy, Plus, QrCode, ScanLine, ShieldCheck, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDemo } from '../app/DemoContext';
import { Button, EmptyState, ModeBadge, Surface } from '../components/ui';
import { asPaise, calculateTax, formatINR, parseRupeesToPaise } from '../domain/money';
import type { Bill, BillItem } from '../domain/types';
import { generateBillQr } from '../services/qr';
import { serializeBillQr, signBill } from '../services/mockApi';
import { PageHeading } from './shared';

let rowId = 0;
const initialItems = (): BillItem[] => [
  { id: 'room', name: 'Garden room · 1 night', quantity: 1, unitPricePaise: asPaise(91000) },
  { id: 'breakfast', name: 'Breakfast for two', quantity: 1, unitPricePaise: asPaise(9000) },
];
export function MerchantPage() {
  const { setBill, notify } = useDemo();
  const [items, setItems] = useState<BillItem[]>(initialItems);
  const [taxBps, setTaxBps] = useState(500);
  const [signed, setSigned] = useState<Bill | null>(null);
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const [tampered, setTampered] = useState(false);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.unitPricePaise * item.quantity, 0), [items]);
  const tax = calculateTax(subtotal, taxBps);
  const total = asPaise(subtotal + tax);
  const updateItem = (id: string, patch: Partial<BillItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const doSign = async (replay = false) => {
    setBusy(true); setTampered(false);
    try {
      const bill = await signBill(items, replay ? { id: 'MV-REPLAY-001', scenario: 'replay', taxBasisPoints: taxBps } : { taxBasisPoints: taxBps });
      const image = await generateBillQr(bill);
      setSigned(bill); setQr(image); setBill(bill); notify(replay ? 'Replay QR signed. Scan it to see the duplicate check.' : 'Bill signed and QR created.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Bill could not be signed.', 'error'); }
    finally { setBusy(false); }
  };
  const tamper = async () => {
    if (!signed) { notify('Sign a bill before creating a tampered QR.', 'error'); return; }
    setBusy(true);
    try {
      const altered: Bill = { ...signed, amountPaise: asPaise(signed.signedTotalPaise + 20000), scenario: 'tampered', signatureValid: false };
      const image = await generateBillQr(altered);
      setSigned(altered); setQr(image); setBill(altered); setTampered(true);
      notify('QR amount changed without changing the bill seal. Scan it to see the mismatch.');
    } catch { notify('The altered QR could not be created.', 'error'); }
    finally { setBusy(false); }
  };
  const addItem = () => { rowId += 1; setItems([...items, { id: `item-${rowId}`, name: '', quantity: 1, unitPricePaise: asPaise(0) }]); };
  const copyPayload = async () => {
    if (!signed) return;
    try { await navigator.clipboard.writeText(serializeBillQr(signed)); notify('Compact signed-bill JSON copied.'); }
    catch { notify('Could not copy the QR payload on this device.', 'error'); }
  };
  return <div className="content-wrap"><PageHeading eyebrow="MERCHANT CONSOLE" title="Prepare a bill to inspect." description="Create a signed demo QR, then scan it from another screen to follow the payment checks." action={<ModeBadge mode="demo" label="DEMO ONLY" />} />
    <div className="merchant-layout"><Surface className="surface--pad"><div className="surface-header"><div><h2 className="section-title">Itemized bill</h2><p className="section-subtitle">Prices and totals are stored as whole paise.</p></div><ShieldCheck size={18} className="green" /></div>
      <label className="field-label">Merchant name<input className="input" value={signed?.merchantName ?? 'The Indigo House · Jaipur'} readOnly aria-describedby="merchant-demo-note" /></label><span id="merchant-demo-note" className="field-hint">Merchant profile is demonstration data.</span>
      <div className="merchant-item merchant-item--head" aria-hidden="true"><span>ITEM</span><span>QTY</span><span>PRICE (Rs)</span><span /></div>
      {items.map((item) => <div className="merchant-item" key={item.id}><label><span className="sr-only">Item name</span><input className="input" aria-label="Item name" value={item.name} placeholder="Item name" onChange={(event) => updateItem(item.id, { name: event.target.value })} /></label><label><span className="sr-only">Quantity</span><input className="input" aria-label="Quantity" type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Math.max(1, Number.parseInt(event.target.value || '1', 10)) })} /></label><label><span className="sr-only">Price in rupees</span><input className="input" aria-label="Price in rupees" inputMode="decimal" value={formatINR(item.unitPricePaise).replace('₹', '')} onChange={(event) => updateItem(item.id, { unitPricePaise: parseRupeesToPaise(event.target.value) })} /></label><button type="button" className="icon-button" aria-label={`Remove ${item.name || 'item'}`} disabled={items.length === 1} onClick={() => setItems(items.filter((line) => line.id !== item.id))}><Trash2 size={15} /></button></div>)}
      <Button variant="ghost" className="button--small" onClick={addItem}><Plus size={15} /> Add item</Button>
      <div className="merchant-tax"><label className="field-label" htmlFor="merchant-tax">Tax rate</label><select className="select" id="merchant-tax" value={taxBps} onChange={(event) => setTaxBps(Number(event.target.value))}><option value={0}>0%</option><option value={500}>5%</option><option value={1200}>12%</option><option value={1800}>18%</option></select></div>
      <div className="merchant-total"><div className="receipt-total-row"><span>Subtotal</span><strong>{formatINR(subtotal)}</strong></div><div className="receipt-total-row"><span>Tax</span><strong>{formatINR(tax)}</strong></div><div className="receipt-total-row receipt-total-row--grand"><span>Total</span><strong>{formatINR(total)}</strong></div></div>
      <div className="merchant-buttons"><Button className="button--wide" onClick={() => void doSign(false)} disabled={busy || items.some((item) => !item.name.trim())}>{busy ? 'Signing…' : <><ShieldCheck size={16} /> Sign bill & create QR</>}</Button><div className="merchant-demo-actions"><Button variant="danger" className="button--small" onClick={() => void tamper()} disabled={busy || !signed}><AlertTriangle size={14} /> Tamper QR</Button><Button variant="secondary" className="button--small" onClick={() => void doSign(true)} disabled={busy}><Copy size={14} /> Replay bill</Button></div></div>
      {tampered && <div className="tampered-ribbon" role="status"><AlertTriangle size={13} style={{ verticalAlign: '-2px', marginRight: 5 }} />QR now asks {formatINR(signed?.amountPaise ?? total)}; the signed bill is still {formatINR(signed?.signedTotalPaise ?? total)}.</div>}
    </Surface>
    <div className="merchant-preview"><Surface className="qr-card"><div className="surface-header"><div><h2 className="section-title">Signed bill QR</h2><p className="section-subtitle">Compact bill JSON with a demo signature field.</p></div><QrCode size={18} className="muted" /></div><div className="qr-frame">{qr ? <img src={qr} alt="Scannable QR code for the signed MONVEIL bill" /> : <div className="qr-placeholder"><QrCode size={30} /><span>Sign the bill to create QR</span></div>}</div>{tampered && <div className="tampered-ribbon">Altered QR · seal no longer matches</div>}<div className="qr-actions"><Link className="button button--primary button--small" to="/scan"><ScanLine size={14} /> Open scanner</Link><Button variant="secondary" className="button--small" onClick={() => void copyPayload()} disabled={!signed}><Copy size={14} /> Copy QR JSON</Button></div><p className="field-hint" style={{ margin: '12px 0 0' }}>A demo-only HMAC value is included in this signed payload. It is not a production merchant signature.</p></Surface>
      {signed ? <article className="receipt-paper merchant-paper"><div className="receipt-brand"><div><strong>{signed.merchantName}</strong><small>DEMO MERCHANT BILL</small></div><span className="signed-stamp"><ShieldCheck size={12} /> SIGNED</span></div><div className="receipt-lines">{signed.items.map((item) => <div className="receipt-item" key={item.id}><span className="receipt-item-name">{item.name}<small>{item.quantity} × {formatINR(item.unitPricePaise)}</small></span><strong>{formatINR(item.quantity * item.unitPricePaise)}</strong></div>)}</div><div className="receipt-total"><div className="receipt-total-row"><span>Tax</span><strong>{formatINR(signed.taxPaise)}</strong></div><div className="receipt-total-row receipt-total-row--grand"><span>Signed total</span><strong>{formatINR(signed.signedTotalPaise)}</strong></div></div><div className="receipt-footer">{signed.id} · EXPIRES IN 10 MINUTES</div></article> : <Surface className="merchant-preview-empty"><EmptyState title="Paper preview appears here" body="Sign the bill to see the merchant copy and scannable QR." /></Surface>}</div></div>
  </div>;
}
