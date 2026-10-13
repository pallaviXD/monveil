import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppRules, Bill, GuardianResult, PaymentReceipt, Scenario } from '../domain/types';
import type { AiExplanationResponse } from '../services/kimiExplanation';
import { clearDemoData, createSampleBill, explainResultDetailed, getRules, getStoredBill, parseBillQr, payBill, runGuardianChecks, setRules as persistRules, storeCurrentBill } from '../services/mockApi';
import { getOnChainTxStatus } from '../services/blockchain';

interface DemoContextValue {
  bill: Bill | null;
  result: GuardianResult | null;
  explanation: string;
  aiExplanationMeta: AiExplanationResponse | null;
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
  const [aiExplanationMeta, setAiExplanationMeta] = useState<AiExplanationResponse | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [rules, setRulesState] = useState<AppRules | null>(null);
  const [toast, setToast] = useState<DemoContextValue['toast']>(null);
  const [loading, setLoading] = useState(false);

  const setBill = useCallback((next: Bill | null) => {
    setBillState(next);
    setResult(null);
    setExplanation('');
    setAiExplanationMeta(null);
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
      const aiResp = await explainResultDetailed(nextResult);
      setExplanation(aiResp.explanation);
      setAiExplanationMeta(aiResp);
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

      // For real on-chain transactions (wallet was connected), poll the RPC
      // to get the canonical confirmed/rejected status rather than trusting the
      // optimistic 'submitted' status returned immediately by writeContract.
      if (!confirmed.isSimulated && confirmed.txHash) {
        const txHash = confirmed.txHash as `0x${string}`;
        // Poll up to ~15 s (5 attempts × 3 s)
        let attempts = 0;
        const poll = async () => {
          attempts++;
          const onChainStatus = await getOnChainTxStatus(txHash);
          if (onChainStatus === 'confirmed' || onChainStatus === 'rejected' || onChainStatus === 'failed') {
            setReceipt((prev) =>
              prev ? { ...prev, status: onChainStatus, confirmedAt: onChainStatus === 'confirmed' ? Date.now() : undefined } : prev
            );
          } else if (attempts < 5) {
            window.setTimeout(() => void poll(), 3000);
          }
          // After 5 attempts, leave as 'submitted' — the receipt page explains the pending state
        };
        window.setTimeout(() => void poll(), 2500);
      }
    } catch (error) {
      const failed: PaymentReceipt = { id: paymentId, bill, status: 'failed', submittedAt: Date.now(), isSimulated: true };
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
    setAiExplanationMeta(null);
    setReceipt(null);
    setRulesState(null);
    notify('Demo data reset.');
  }, [notify, setBill]);

  const value = useMemo(() => ({ bill, result, explanation, aiExplanationMeta, receipt, rules, toast, loading, setBill, startScenario, scanPayload, evaluateBill, submitPayment, loadRules, saveRules, notify, resetDemo }), [bill, result, explanation, aiExplanationMeta, receipt, rules, toast, loading, setBill, startScenario, scanPayload, evaluateBill, submitPayment, loadRules, saveRules, notify, resetDemo]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo must be used inside DemoProvider.');
  return value;
}
