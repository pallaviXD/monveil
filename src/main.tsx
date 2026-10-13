import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Activity, ChevronRight, CircleHelp, CreditCard, Home, Settings, ShieldCheck, SlidersHorizontal, Store, WalletCards } from 'lucide-react';
import { DemoProvider, useDemo } from './app/DemoContext';
import { BrandLogo, StatusRail } from './components/ui';
import { GrainOverlay } from './components/primitives/GrainOverlay';
import './styles/global.css';
import './styles/components.css';
import './styles/pay-receipt.css';
import './styles/extra.css';

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const SignInPage = lazy(() => import('./pages/SignInPage').then((module) => ({ default: module.SignInPage })));
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const ScanPage = lazy(() => import('./pages/ScanPage').then((module) => ({ default: module.ScanPage })));
const BillPage = lazy(() => import('./pages/BillPage').then((module) => ({ default: module.BillPage })));
const VerdictPage = lazy(() => import('./pages/VerdictPage').then((module) => ({ default: module.VerdictPage })));
const PayPage = lazy(() => import('./pages/PayPage').then((module) => ({ default: module.PayPage })));
const ReceiptPage = lazy(() => import('./pages/ReceiptPage').then((module) => ({ default: module.ReceiptPage })));
const ActivityPage = lazy(() => import('./pages/ActivityPage').then((module) => ({ default: module.ActivityPage })));
const RulesPage = lazy(() => import('./pages/RulesPage').then((module) => ({ default: module.RulesPage })));
const MerchantPage = lazy(() => import('./pages/MerchantPage').then((module) => ({ default: module.MerchantPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

const navItems = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/scan', label: 'Scan & pay', icon: CreditCard },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/rules', label: 'Your rules', icon: SlidersHorizontal },
];
const moreItems = [
  { to: '/merchant', label: 'Merchant console', icon: Store },
  { to: '/settings', label: 'Settings', icon: Settings },
];
function PageFallback() {
  return <div className="content-wrap page-fallback" aria-label="Loading page"><div className="skeleton skeleton-line" /><div className="surface surface--pad"><div className="skeleton skeleton-block" /></div></div>;
}
function DashboardShell() {
  const { toast } = useDemo();
  const location = useLocation();
  const isScan = location.pathname === '/scan';
  return <div className={`app-shell ${isScan ? 'app-shell--scan' : ''}`}>
    {!isScan && <aside className="sidebar">
      <Link to="/home" className="sidebar-logo" aria-label="MONVEIL home">
        <BrandLogo size="compact" variant="mark" />
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">MONVEIL</span>
          <span className="sidebar-brand-tag">Safe Pay</span>
        </div>
      </Link>
      <p className="nav-kicker">YOUR SPACE</p>
      <nav aria-label="Main navigation" className="side-nav">{navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}><Icon size={18} /><span>{label}</span>{to === '/scan' && <ChevronRight className="nav-chevron" size={16} />}</NavLink>)}</nav>
      <p className="nav-kicker nav-kicker--second">MORE</p>
      <nav aria-label="More navigation" className="side-nav">{moreItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-guardian"><span className="sidebar-guardian-icon"><ShieldCheck size={16} /></span><div><strong>Guardian</strong><small>Watching every bill</small></div><span className="live-dot" /></div><div className="sidebar-help"><CircleHelp size={15} /><span>Testnet demo. Demo token.<br />No real money.</span></div></div>
    </aside>}
    <div className="main-column">
      {!isScan && <header className="topbar"><div className="topbar-breadcrumb"><WalletCards size={16} /><span>MONVEIL</span><span className="breadcrumb-sep">/</span><strong>{pageTitle(location.pathname)}</strong></div><div className="topbar-right"><StatusRail compact /><Link to="/settings" className="avatar-link" aria-label="Settings"><Settings size={17} /></Link></div></header>}
      <main className={`main-content ${isScan ? 'main-content--scan' : ''}`}><Suspense fallback={<PageFallback />}><Outlet /></Suspense></main>
    </div>
    <nav className="mobile-tabbar" aria-label="Mobile navigation">{navItems.slice(0, 1).concat([{ to: '/pay', label: 'Pay', icon: CreditCard }, navItems[2], navItems[3]]).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `mobile-tab ${isActive || (to === '/pay' && location.pathname === '/scan') ? 'is-active' : ''}`}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
    {toast && <div className={`toast toast--${toast.tone}`} role="status">{toast.message}</div>}
  </div>;
}
function pageTitle(path: string) {
  return ({ '/home': 'Home', '/scan': 'Scan & pay', '/bill': 'Your bill', '/verdict': 'Guardian check', '/pay': 'Pay', '/receipt': 'Receipt', '/activity': 'Activity', '/rules': 'Your rules', '/merchant': 'Merchant console', '/settings': 'Settings' } as Record<string, string>)[path] ?? 'Home';
}
function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Suspense fallback={<PageFallback />}><LandingPage /></Suspense>} />
    <Route path="/signin" element={<Suspense fallback={<PageFallback />}><SignInPage /></Suspense>} />
    <Route element={<DashboardShell />}>
      <Route path="/home" element={<HomePage />} />
      <Route path="/scan" element={<ScanPage />} />
      <Route path="/bill" element={<BillPage />} />
      <Route path="/verdict" element={<VerdictPage />} />
      <Route path="/pay" element={<PayPage />} />
      <Route path="/receipt" element={<ReceiptPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/rules" element={<RulesPage />} />
      <Route path="/merchant" element={<MerchantPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Suspense fallback={<PageFallback />}><LandingPage /></Suspense>} />
  </Routes>;
}
function App() {
  return (
    <BrowserRouter>
      <DemoProvider>
        <GrainOverlay />
        <AppRoutes />
      </DemoProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
