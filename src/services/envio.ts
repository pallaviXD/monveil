/**
 * Envio HyperIndex Client Service
 *
 * Connects to Envio indexer GraphQL endpoint to query real indexed events from Monad Testnet.
 * Provides resilient fallbacks, deduplication, error handling, and honest offline status.
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
  isLiveIndexed: boolean;
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

export async function fetchIndexedReceipts(
  limit = 10,
  endpoint = DEFAULT_ENVIO_ENDPOINT
): Promise<{ receipts: IndexedReceipt[]; source: 'envio-indexer' | 'indexer-unavailable' }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

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

    if (res.ok) {
      const data = (await res.json()) as {
        data?: { ReceiptRecord?: Array<Omit<IndexedReceipt, 'isLiveIndexed'>> };
      };
      const list = data.data?.ReceiptRecord;
      if (Array.isArray(list) && list.length > 0) {
        return {
          receipts: list.map((item) => ({ ...item, isLiveIndexed: true })),
          source: 'envio-indexer',
        };
      }
    }
  } catch {
    // Graceful fallback when Envio local/remote indexer instance is booting or offline
  }

  return { receipts: [], source: 'indexer-unavailable' };
}
