/**
 * Envio HyperIndex Client Service
 *
 * Connects to the Envio hosted indexer GraphQL endpoint to query real indexed events
 * from Monad Testnet. Provides four distinct source states so the UI can be honest
 * about what data is actually being shown:
 *
 *  'envio-live'         — indexer responded AND returned at least one record.
 *  'envio-live-empty'   — indexer responded successfully but no records exist yet.
 *                         The indexer IS live; the contract just has no events mined yet.
 *  'indexer-unavailable'— the request failed (timeout, network error, non-2xx HTTP).
 *  'graphql-error'      — the server replied but the GraphQL response contains errors.
 *
 * Never conflate 'no records' with 'indexer is down'. These are different states.
 */

export interface IndexedReceipt {
  id: string;
  billIdHash: string;
  reportHash: string;
  payer: string;
  merchant: string;
  resultCode: number;
  amountPaise: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  /** true only when this record came from a live indexer response (not from a local cache). */
  isLiveIndexed: boolean;
}

export type EnvioSource =
  | 'envio-live'         // Indexer up + records returned
  | 'envio-live-empty'   // Indexer up + no records yet (contract may have no events)
  | 'indexer-unavailable' // Network failure, timeout, or non-2xx
  | 'graphql-error';     // Server replied but GraphQL errors field was set

export interface EnvioResult {
  receipts: IndexedReceipt[];
  source: EnvioSource;
  /** Human-readable reason when source is not 'envio-live'. */
  reason?: string;
}

const DEFAULT_ENVIO_ENDPOINT =
  typeof process !== 'undefined' && process.env?.ENVIO_GRAPHQL_ENDPOINT
    ? process.env.ENVIO_GRAPHQL_ENDPOINT
    : 'https://indexer.bigdevenergy.link/monveil-indexer/v1/graphql';

const RECENT_RECEIPTS_QUERY = `
  query GetRecentReceipts($limit: Int!) {
    ReceiptRecord(limit: $limit, order_by: { timestamp: desc }) {
      id
      billIdHash
      reportHash
      payer
      merchant
      resultCode
      amountPaise
      timestamp
      blockNumber
      transactionHash
    }
  }
`;

/**
 * Fetches indexed receipt records from the Envio HyperIndex hosted endpoint.
 *
 * Returns an explicit source so the caller can show an honest status label:
 * - 'envio-live'          → show "ENVIO · LIVE"
 * - 'envio-live-empty'    → show "ENVIO · LIVE (no events yet)"
 * - 'indexer-unavailable' → show "ENVIO · OFFLINE"
 * - 'graphql-error'       → show "ENVIO · ERROR"
 */
export async function fetchIndexedReceipts(
  limit = 10,
  endpoint = DEFAULT_ENVIO_ENDPOINT
): Promise<EnvioResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        query: RECENT_RECEIPTS_QUERY,
        variables: { limit },
      }),
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        receipts: [],
        source: 'indexer-unavailable',
        reason: `Envio endpoint returned HTTP ${res.status}. The indexer may be down or the URL has changed.`,
      };
    }

    const data = (await res.json()) as {
      data?: { ReceiptRecord?: Array<Omit<IndexedReceipt, 'isLiveIndexed'>> };
      errors?: Array<{ message: string }>;
    };

    // GraphQL-level errors (schema mismatch, auth issues, etc.)
    if (data.errors && data.errors.length > 0) {
      return {
        receipts: [],
        source: 'graphql-error',
        reason: `GraphQL error: ${data.errors.map((e) => e.message).join('; ')}`,
      };
    }

    const list = data.data?.ReceiptRecord;

    if (!Array.isArray(list)) {
      // Response came back but schema didn't match — treat as indexer error
      return {
        receipts: [],
        source: 'graphql-error',
        reason: 'Unexpected response shape — ReceiptRecord field missing. Schema may have changed.',
      };
    }

    if (list.length === 0) {
      // Indexer IS live but the contract has not emitted any indexed events yet
      return {
        receipts: [],
        source: 'envio-live-empty',
        reason: 'The Envio indexer is reachable but has not indexed any ReceiptRecord events yet. This is expected before any real on-chain receipts are mined.',
      };
    }

    return {
      receipts: list.map((item) => ({ ...item, isLiveIndexed: true })),
      source: 'envio-live',
    };
  } catch (err: unknown) {
    const isAbort = (err as { name?: string })?.name === 'AbortError';
    return {
      receipts: [],
      source: 'indexer-unavailable',
      reason: isAbort
        ? 'Envio request timed out after 4 s. The indexer may be starting up or the network is slow.'
        : 'Envio request failed — network error or the indexer is unreachable.',
    };
  }
}
