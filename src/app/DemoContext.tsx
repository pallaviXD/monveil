import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppRules, Bill, GuardianResult, PaymentReceipt, Scenario } from '../domain/types';
import { clearDemoData, createSampleBill, explainResult, getRules, getStoredBill, parseBillQr, payBill, runGuardianChecks, setRules as persistRules, storeCurrentBill } from '../services/mockApi';

interface DemoContextValue {
  bill: Bill | null;
  result: GuardianResult | null;
  explanation: string;
  receipt: PaymentReceipt | null;
  rules: AppRules | null;
  toast: { message: string; tone: 'normal' | 'error' } | null;
  loading: boolean;
  setBill: (bill: Bill | null) => void;
  startScenario: (scenario: Scenario) => Promise<void>;
  scanPayload: (payload: string) => Promise<void>;
  evaluateBill: () => Promise<GuardianResult | null>;
  submitPayment: () => Promise<void>;
  loadRules: () => Promise<AppRules>;
  saveRules: (rules: AppRules) => Promise<void>;
  notify: (message: string, tone?: 'normal' | 'error') => void;
  resetDemo: () => void;
}
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [bill, setBillState] = useState<Bill | null>(() => getStoredBill());
  const [result, setResult] = useState<GuardianResult | null>(null);
  const [explanation, setExplanation] = useState('');
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [rules, setRulesState] = useState<AppRules | null>(null);
  const [toast, setToast] = useState<DemoContextValue['toast']>(null);
  const [loading, setLoading] = useState(false);

  const setBill = useCallback((next: Bill | null) => {
    setBillState(next);
    setResult(null);
    setExplanation('');
    setReceipt(null);
    storeCurrentBill(next);
  }, []);
  const notify = useCallback((message: string, tone: 'normal' | 'error' = 'normal') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  }, []);
  const startScenario = useCallback(async (scenario: Scenario) => {
    setLoading(true);
    try {
      const next = await createSampleBill(scenario);
      setBill(next);
      navigate('/bill');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'We could not prepare that demo bill.', 'error');
    } finally { setLoading(false); }
  }, [navigate, notify, setBill]);
  const scanPayload = useCallback(async (payload: string) => {
    setLoading(true);
    try {
      const next = await parseBillQr(payload);
      setBill(next);
      navigate('/bill');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'We could not read that QR code.', 'error');
    } finally { setLoading(false); }
  }, [navigate, notify, setBill]);
  const evaluateBill = useCallback(async () => {
    if (!bill) return null;
    setLoading(true);
    try {
      const nextResult = await runGuardianChecks(bill);
      setResult(nextResult);
      const words = await explainResult(nextResult);
      setExplanation(words);
      return nextResult;
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Guardian could not check this bill. Try again.', 'error');
      return null;
    } finally { setLoading(false); }
  }, [bill, notify]);
  const submitPayment = useCallback(async () => {
    if (!bill || result?.verdict === 'blocked') return;
    const paymentId = `pending-${Date.now()}`;
    setReceipt({ id: paymentId, bill, status: 'pending', submittedAt: Date.now() });
    window.setTimeout(() => setReceipt((previous) => previous?.id === paymentId ? { ...previous, status: 'submitted' } : previous), 320);
    navigate('/receipt');
    try {
      const confirmed = await payBill(bill);
      setReceipt(confirmed);
      navigate('/receipt');
    } catch (error) {
      const failed: PaymentReceipt = { id: paymentId, bill, status: 'failed', submittedAt: Date.now() };
      setReceipt(failed);
      navigate('/receipt');
      notify(error instanceof Error ? error.message : 'Payment could not be confirmed. No real money was used.', 'error');
    }
  }, [bill, navigate, result?.verdict]);
  const loadRules = useCallback(async () => {
    const next = await getRules();
    setRulesState(next);
    return next;
  }, []);
  const saveRules = useCallback(async (next: AppRules) => {
    const saved = await persistRules(next);
    setRulesState(saved);
    notify('Your rules are saved.');
  }, [notify]);
  const resetDemo = useCallback(() => {
    clearDemoData();
    setBill(null);
    setResult(null);
    setExplanation('');
    setReceipt(null);
    setRulesState(null);
    notify('Demo data reset.');
  }, [notify, setBill]);

  const value = useMemo(() => ({ bill, result, explanation, receipt, rules, toast, loading, setBill, startScenario, scanPayload, evaluateBill, submitPayment, loadRules, saveRules, notify, resetDemo }), [bill, result, explanation, receipt, rules, toast, loading, setBill, startScenario, scanPayload, evaluateBill, submitPayment, loadRules, saveRules, notify, resetDemo]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo must be used inside DemoProvider.');
  return value;
}
