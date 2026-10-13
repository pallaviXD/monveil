import type { Bill, GuardianCheck, GuardianResult } from '../domain/types';
import { formatINR } from '../domain/money';

export interface ExplanationRequest {
  bill: Bill;
  checks: GuardianCheck[];
  verdict: GuardianResult['verdict'];
  reasonCode?: string;
  lineItemStatus?: string;
}

export function getDeterministicFallbackExplanation(
  result: Pick<GuardianResult, 'verdict' | 'reasonCode'> & { bill: Bill }
): string {
  if (result.reasonCode === 'amount') {
    const signed = formatINR(result.bill.signedTotalPaise);
    const requested = formatINR(result.bill.amountPaise);
    return `The QR requests ${requested}, but the merchant cryptographically signed ${signed}. The amounts do not match, so Guardian prevented this transaction.`;
  }
  if (result.reasonCode === 'seal') {
    return 'The scanned QR details do not match the merchant cryptographic seal. Guardian halted payment to protect you from a tampered bill.';
  }
  if (result.reasonCode === 'expiry') {
    return 'This signed bill has exceeded its validity window. Please ask the merchant to generate a current bill.';
  }
  if (result.reasonCode === 'duplicate') {
    return 'This bill identifier has already been recorded as paid. Guardian stopped a duplicate or replay payment.';
  }
  if (result.reasonCode === 'rules') {
    return `This payment exceeds your personal spending limit or daily cap. Guardian strictly enforced your security policy.`;
  }
  if (result.reasonCode === 'line-items') {
    return 'Line item sums or calculated taxes do not match the signed subtotal. Review the item breakdown with the merchant.';
  }
  if (result.verdict === 'review') {
    return 'One or more line details warrant a second check before you authorize payment.';
  }
  return 'The signed bill matches the QR request, validity is active, and the amount complies with your spending rules. You may proceed.';
}

/**
 * Server-side Kimi (Moonshot) API call.
 * Kept secure in server context: uses KIMI_API_KEY from server environment.
 */
export async function generateKimiExplanationServer(
  req: ExplanationRequest,
  apiKey?: string,
  endpoint?: string
): Promise<{ explanation: string; source: 'kimi' | 'deterministic-fallback' }> {
  const fallback = getDeterministicFallbackExplanation({
    bill: req.bill,
    verdict: req.verdict,
    reasonCode: req.reasonCode,
  });

  const key = apiKey || process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  if (!key) {
    return { explanation: fallback, source: 'deterministic-fallback' };
  }

  const resolvedEndpoint =
    endpoint ||
    (process.env.KIMI_BASE_URL
      ? `${process.env.KIMI_BASE_URL.replace(/\/+$/, '')}/chat/completions`
      : 'https://api.moonshot.ai/v1/chat/completions');

  const mismatch = req.bill.amountPaise !== req.bill.signedTotalPaise;
  const mismatchDelta = Math.abs(req.bill.amountPaise - req.bill.signedTotalPaise);

  const factsPrompt = `
Deterministic Verification Audit Facts:
- Merchant: "${req.bill.merchantName}"
- Signed Total: ${formatINR(req.bill.signedTotalPaise)}
- Requested Amount: ${formatINR(req.bill.amountPaise)}
- Amount Mismatch: ${mismatch ? `YES (Difference: ${formatINR(mismatchDelta)})` : 'NO'}
- Verdict: ${req.verdict.toUpperCase()}
- Reason Code: ${req.reasonCode ?? 'none'}
- Line Item Integrity: ${req.lineItemStatus ?? 'pass'}
- Checks:
${req.checks.map((c) => `  * ${c.label}: ${c.status.toUpperCase()} (${c.explanation})`).join('\n')}
`.trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(resolvedEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          {
            role: 'system',
            content:
              'You are Guardian AI in Monveil Safe-Pay. Explain the verification facts clearly to a consumer. Ground your answer strictly in the facts provided. Never decide or alter the verdict. Never accuse anyone of fraud. Keep your explanation to 1 or 2 concise, professional sentences.',
          },
          {
            role: 'user',
            content: `Explain this bill verification result:\n${factsPrompt}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 120,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Kimi API returned HTTP ${response.status}. Using deterministic fallback.`);
      return { explanation: fallback, source: 'deterministic-fallback' };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();

    if (content) {
      return { explanation: content, source: 'kimi' };
    }

    return { explanation: fallback, source: 'deterministic-fallback' };
  } catch (error) {
    console.warn('Kimi API call timed out or failed. Using deterministic fallback.', error);
    return { explanation: fallback, source: 'deterministic-fallback' };
  }
}

/**
 * Client-side helper that invokes the secure server endpoint `/api/ai/explain`.
 */
export async function requestAiExplanation(result: GuardianResult): Promise<string> {
  try {
    const res = await fetch('/api/ai/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bill: result.bill,
        checks: result.checks,
        verdict: result.verdict,
        reasonCode: result.reasonCode,
        lineItemStatus: result.lineItemStatus,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { explanation?: string };
      if (data.explanation) return data.explanation;
    }
  } catch {
    // If server endpoint is unreachable (e.g. offline preview), use local deterministic explanation
  }

  return getDeterministicFallbackExplanation({
    bill: result.bill,
    verdict: result.verdict,
    reasonCode: result.reasonCode,
  });
}
