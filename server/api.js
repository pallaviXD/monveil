import http from 'node:http';
import { generateKimiExplanationServer } from '../src/services/kimiExplanation.js';
import { signBillEip712 } from '../src/services/merchantRegistry.js';

export function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  // Health check
  if (url.pathname === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'monveil-backend',
        network: 'Monad Testnet (10143)',
        timestamp: Date.now(),
      })
    );
    return true;
  }

  // Kimi AI explanation endpoint
  if (url.pathname === '/api/ai/explain' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const result = await generateKimiExplanationServer(payload);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      } catch (err) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return true;
  }

  // Envio indexer status endpoint
  if (url.pathname === '/api/envio/status') {
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        network: 'Monad Testnet (10143)',
        contractAddress: '0x4a6b58611F36928e18FDAb821cEa7fE195F483c7',
        eventsIndexed: ['ReceiptRecorded', 'PaymentSettled'],
        status: 'ready',
      })
    );
    return true;
  }

  return false;
}

export function createStandaloneServer(port = 3001) {
  const server = http.createServer((req, res) => {
    if (!handleApiRequest(req, res)) {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`Monveil Backend API running at http://localhost:${port}`);
  });

  return server;
}
