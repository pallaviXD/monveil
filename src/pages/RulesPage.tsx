import { useEffect, useState, type FormEvent } from 'react';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useDemo } from '../app/DemoContext';
import { Button, EmptyState, Skeleton, Surface } from '../components/ui';
import { asPaise, formatINR } from '../domain/money';
import type { AppRules } from '../domain/types';
import { PageHeading } from './shared';

export function RulesPage() {
  const { rules, loadRules, saveRules, notify } = useDemo();
  const [draft, setDraft] = useState<AppRules | null>(rules);
  const [merchant, setMerchant] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => { if (!rules) loadRules().then(setDraft).catch(() => setLoadError(true)); else setDraft(rules); }, [rules, loadRules]);
  const addMerchant = (event: FormEvent) => {
    event.preventDefault();
    const value = merchant.trim();
    if (!value || !draft) return;
    if (draft.blockedMerchants.some((item) => item.toLowerCase() === value.toLowerCase())) { notify('That merchant is already on your blocked list.'); return; }
    setDraft({ ...draft, blockedMerchants: [...draft.blockedMerchants, value] }); setMerchant('');
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try { await saveRules({ ...draft, perPaymentLimitPaise: asPaise(draft.perPaymentLimitPaise), dailyCapPaise: asPaise(draft.dailyCapPaise) }); }
    catch (error) { notify(error instanceof Error ? error.message : 'Your rules could not be saved. Try again.', 'error'); }
    finally { setBusy(false); }
  };
  if (loadError) return <div className="content-wrap"><EmptyState icon="error" title="Rules did not load" body="Your saved demo rules are still unchanged. Try again." action={<Button onClick={() => { setLoadError(false); void loadRules().then(setDraft).catch(() => setLoadError(true)); }}>Try again</Button>} /></div>;
  return <div className="content-wrap"><PageHeading eyebrow="YOUR RULES" title="Your line. Your call." description="Guardian checks each bill against limits you set here." action={<Button onClick={() => void save()} disabled={!draft || busy}>{busy ? 'Saving…' : 'Save rules'}</Button>} />
    {!draft ? <Surface className="surface--pad"><Skeleton className="skeleton-block" /></Surface> : <div className="rules-layout"><Surface className="surface--pad"><div className="surface-header"><div><h2 className="section-title">Payment limits</h2><p className="section-subtitle">A bill above these limits is stopped before you decide to pay.</p></div><ShieldCheck size={18} className="green" /></div>
      <div className="rule-control"><div className="rule-control-head"><div><strong>Per-payment limit</strong><div className="field-hint">Default demo limit: Rs 2,000</div></div><output>{formatINR(draft.perPaymentLimitPaise)}</output></div><input className="range-input" type="range" min="50000" max="1000000" step="5000" value={draft.perPaymentLimitPaise} aria-label="Per-payment limit" onChange={(event) => setDraft({ ...draft, perPaymentLimitPaise: asPaise(Number(event.target.value)) })} /><div className="range-labels"><span>Rs 500</span><span>Rs 10,000</span></div></div>
      <div className="rule-control"><div className="rule-control-head"><div><strong>Daily cap</strong><div className="field-hint">Total confirmed demo payments in one day.</div></div><output>{formatINR(draft.dailyCapPaise)}</output></div><input className="range-input" type="range" min="200000" max="5000000" step="100000" value={draft.dailyCapPaise} aria-label="Daily cap" onChange={(event) => setDraft({ ...draft, dailyCapPaise: asPaise(Number(event.target.value)) })} /><div className="range-labels"><span>Rs 2,000</span><span>Rs 50,000</span></div></div>
      <div className="rule-control"><div className="rule-control-head"><div><strong>Blocked merchants</strong><div className="field-hint">Guardian stops bills from these merchants.</div></div><span className="pill">{draft.blockedMerchants.length} blocked</span></div><form className="inline-form" onSubmit={addMerchant}><label className="sr-only" htmlFor="block-merchant">Merchant name to block</label><input id="block-merchant" className="input" placeholder="Merchant name" value={merchant} onChange={(event) => setMerchant(event.target.value)} /><Button type="submit" variant="secondary" aria-label="Add blocked merchant"><Plus size={16} /> Add</Button></form><div className="blocked-list">{draft.blockedMerchants.map((name) => <div className="blocked-merchant" key={name}><span>{name}</span><button type="button" onClick={() => setDraft({ ...draft, blockedMerchants: draft.blockedMerchants.filter((item) => item !== name) })} aria-label={`Remove ${name} from blocked merchants`}><Trash2 size={15} /></button></div>)}{draft.blockedMerchants.length === 0 && <span className="field-hint">No merchants blocked. Add one above if you choose.</span>}</div></div>
      </Surface><Surface className="rules-side"><div className="rule-illustration"><ShieldCheck size={28} /></div><div><h3>Checks stay in your hands.</h3><p>These are your demo preferences. Changing a limit affects only future sample checks in this browser. Nothing here connects to a bank or live payment.</p><span className="pill">TESTNET DEMO · LOCAL RULES</span></div></Surface></div>}
  </div>;
}
