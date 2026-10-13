import { useEffect, useMemo, useState } from 'react';
import { Activity, Ban, CalendarDays, CheckCircle2, ChevronRight, Search, ShieldCheck, X, Database, ExternalLink, AlertCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ActivityItem } from '../domain/types';
import { formatINR } from '../domain/money';
import { getActivity } from '../services/mockApi';
import { fetchIndexedReceipts, type IndexedReceipt, type EnvioSource } from '../services/envio';
import { EmptyState, Skeleton, Surface, StatusIcon } from '../components/ui';
import { ActivityStatus, PageHeading, ScenarioLabel } from './shared';
import { useDemo } from '../app/DemoContext';
import { getExplorerTxUrl } from '../services/blockchain';

type Filter = 'All' | 'Paid' | 'Blocked' | 'Review';
function dayGroup(date: number) {
  const day = new Date(date); const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (day.toDateString() === today.toDateString()) return 'Today';
  if (day.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return day.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function ActivityPage() {
  const { notify } = useDemo();
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [selected, setSelected] = useState<ActivityItem | null>(null);
  const [envioRecords, setEnvioRecords] = useState<IndexedReceipt[]>([]);
  const [envioStatus, setEnvioStatus] = useState<'checking' | EnvioSource>('checking');
  const [envioReason, setEnvioReason] = useState<string | undefined>();

  useEffect(() => {
    let alive = true;
    getActivity().then((rows) => {
      if (alive) setItems(rows);
    }).catch(() => {
      if (alive) notify('Activity could not load. Please try again.', 'error');
    });

    fetchIndexedReceipts(5).then((res) => {
      if (alive) {
        setEnvioRecords(res.receipts);
        setEnvioStatus(res.source);
        setEnvioReason(res.reason);
      }
    });

    return () => { alive = false; };
  }, [notify]);

  const visible = useMemo(() => (items ?? []).filter((item) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || item.merchantName.toLowerCase().includes(q) || item.billId.toLowerCase().includes(q) || item.reason.toLowerCase().includes(q);
    const matchesFilter = filter === 'All' || (filter === 'Paid' && item.paymentStatus === 'confirmed') || (filter === 'Blocked' && item.verdict === 'blocked') || (filter === 'Review' && item.verdict === 'review');
    return matchesQuery && matchesFilter;
  }), [items, query, filter]);

  const groups = useMemo(() => visible.reduce<Record<string, ActivityItem[]>>((acc, item) => {
    const label = dayGroup(item.date);
    (acc[label] ??= []).push(item);
    return acc;
  }, {}), [visible]);

  const blocked = items?.filter((item) => item.verdict === 'blocked').length ?? 0;
  const confirmed = items?.filter((item) => item.paymentStatus === 'confirmed') ?? [];
  const spend = confirmed.reduce((sum, item) => sum + item.amountPaise, 0);

  const chartData = useMemo(() => Object.values(confirmed.reduce<Record<string, { merchant: string; amount: number }>>((acc, item) => {
    const name = item.merchantName.split('·')[0].trim();
    acc[name] ??= { merchant: name, amount: 0 };
    acc[name].amount += item.amountPaise;
    return acc;
  }, {})).sort((a, b) => b.amount - a.amount).slice(0, 5), [confirmed]);

  const filters: Filter[] = ['All', 'Paid', 'Blocked', 'Review'];

  return (
    <div className="content-wrap">
      <PageHeading eyebrow="YOUR ACTIVITY" title="A record you can read." description="Every bill, grouped by day, with its reason in plain words." />
      
      <div className="activity-overview">
        <Surface className="stat-card"><small>Activity records</small><strong>{items ? items.length : '-'}</strong></Surface>
        <Surface className="stat-card"><small>Blocked for you</small><strong className="red">{items ? blocked : '-'}</strong></Surface>
        <Surface className="stat-card"><small>Confirmed total</small><strong>{items ? formatINR(spend) : '-'}</strong></Surface>
      </div>

      <Surface className="chart-card">
        <div className="chart-heading">
          <div>
            <h2>Spending by merchant</h2>
            <p>Confirmed payments · audited records</p>
          </div>
          <span className="pill"><Activity size={13} /> MONAD</span>
        </div>
        {!items ? (
          <Skeleton className="skeleton-block" />
        ) : chartData.length ? (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 3, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(230,225,255,.07)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="merchant" width={125} tick={{ fill: '#B9B3C8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(196,175,255,.07)' }} contentStyle={{ background: '#1A1833', border: '1px solid rgba(222,218,255,.14)', borderRadius: 10, color: '#F4F0FC', fontSize: 11 }} formatter={(value: number) => [formatINR(value), 'Spend']} />
                <Bar dataKey="amount" fill="#9D83E8" radius={[0, 5, 5, 0]} maxBarSize={23} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="chart-empty">Confirmed payments will appear here.</div>
        )}
      </Surface>

      {/* Envio HyperIndex Live Blockchain Indexing Card */}
      <Surface className="timeline-card" style={{ marginBottom: 18 }}>
        <div className="surface-header">
          <div>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Database size={16} /> Envio HyperIndex · On-Chain Event Stream
            </h2>
            <p className="section-subtitle">
              Real-time indexer monitoring ReceiptRecorded & PaymentSettled events on Monad Testnet (Chain ID 10143)
            </p>
          </div>
          <span
            className={`pill ${envioStatus === 'envio-live' ? 'green' : envioStatus === 'envio-live-empty' ? 'amber' : 'muted'}`}
            style={{ fontSize: '0.75rem' }}
            title={
              envioStatus === 'envio-live'
                ? 'Envio HyperIndex returned real indexed events from Monad Testnet'
                : envioStatus === 'envio-live-empty'
                ? 'The Envio indexer is reachable but no on-chain events have been indexed yet'
                : envioStatus === 'checking'
                ? 'Checking Envio HyperIndex endpoint…'
                : envioStatus === 'indexer-unavailable'
                ? 'Envio hosted indexer is offline or unreachable'
                : 'A GraphQL error was returned by the Envio indexer'
            }
          >
            {envioStatus === 'envio-live' && 'ENVIO · LIVE'}
            {envioStatus === 'envio-live-empty' && 'ENVIO · LIVE (NO EVENTS)'}
            {envioStatus === 'checking' && 'ENVIO · CHECKING…'}
            {envioStatus === 'indexer-unavailable' && 'ENVIO · OFFLINE'}
            {envioStatus === 'graphql-error' && 'ENVIO · ERROR'}
          </span>
        </div>

        {envioRecords.length > 0 ? (
          <div className="activity-list">
            {envioRecords.map((rec) => (
              <div key={rec.id} className="timeline-row" style={{ cursor: 'default' }}>
                <span className="activity-symbol">
                  <CheckCircle2 size={16} />
                </span>
                <span className="activity-detail">
                  <strong className="font-mono">{rec.billIdHash.slice(0, 14)}…</strong>
                  <small>Block #{rec.blockNumber} · Payer: {rec.payer.slice(0, 6)}…{rec.payer.slice(-4)}</small>
                </span>
                <a
                  href={getExplorerTxUrl(rec.transactionHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--ghost button--small"
                >
                  <ExternalLink size={12} /> View Tx
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="field-hint" style={{ margin: '8px 0 0' }}>
            {envioStatus === 'checking' && 'Connecting to Envio HyperIndex…'}
            {envioStatus === 'envio-live-empty' && 'The Envio indexer is reachable but no on-chain events have been indexed yet. Events will appear here once real on-chain receipts are mined.'}
            {envioStatus === 'indexer-unavailable' && (envioReason ?? 'The Envio indexer is offline or unreachable. Check back shortly.')}
            {envioStatus === 'graphql-error' && (envioReason ?? 'A GraphQL error was returned by the Envio indexer. Check back shortly.')}
          </p>
        )}
      </Surface>

      <Surface className="timeline-card">
        <div className="activity-toolbar">
          <label className="search-wrap">
            <Search size={16} />
            <input className="input" type="search" aria-label="Search activity" placeholder="Search merchant, bill or reason" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="filter-tabs" role="group" aria-label="Filter activity">
            {filters.map((tab) => (
              <button key={tab} type="button" className="filter-tab" aria-pressed={filter === tab} onClick={() => setFilter(tab)}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        {!items ? (
          <div className="activity-list"><Skeleton className="skeleton-block" /></div>
        ) : Object.keys(groups).length ? (
          Object.entries(groups).map(([day, dayItems]) => (
            <div key={day}>
              <div className="day-label"><CalendarDays size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />{day}</div>
              {dayItems.map((item) => (
                <button type="button" className="timeline-row" key={item.id} onClick={() => setSelected(item)}>
                  <span className={`activity-symbol ${item.verdict === 'blocked' ? 'activity-symbol--blocked' : ''}`}>
                    {item.verdict === 'blocked' ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                  </span>
                  <span className="activity-detail">
                    <strong>{item.merchantName}</strong>
                    <small><ActivityStatus verdict={item.verdict} /> · {item.billId}</small>
                  </span>
                  <span className="timeline-amount">{formatINR(item.amountPaise)}</span>
                  <ChevronRight size={15} className="muted" />
                </button>
              ))}
            </div>
          ))
        ) : (
          <EmptyState title="No activity matches" body={query ? 'Try another merchant name or clear the search.' : 'There are no entries in this filter yet.'} />
        )}
      </Surface>

      {selected && (
        <>
          <button type="button" className="drawer-backdrop" onClick={() => setSelected(null)} aria-label="Close activity details" />
          <aside className="detail-drawer" role="dialog" aria-modal="true" aria-labelledby="activity-detail-title">
            <div className="drawer-top">
              <h2 id="activity-detail-title">Bill details</h2>
              <button className="icon-button" onClick={() => setSelected(null)} aria-label="Close"><X size={17} /></button>
            </div>
            <span className="eyebrow">{new Date(selected.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <h3 style={{ margin: '14px 0 6px', fontSize: 16 }}>{selected.merchantName}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 18px' }}>
              <StatusIcon verdict={selected.verdict} />
              <span className="mono-id">{selected.billId}</span>
            </div>
            <div className="drawer-amount">{formatINR(selected.amountPaise)}</div>
            <div className="divider" />
            <div className="tiny">WHY THIS RESULT</div>
            <p className="drawer-reason">{selected.reason}</p>
            <ScenarioLabel scenario={selected.scenario} />
            <div className="drawer-note">
              <ShieldCheck size={16} /> AI explains the result. Guardian applies the bill checks and your saved rules.
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
