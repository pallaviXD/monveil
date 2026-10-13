import type { Plugin } from 'vite';
import { generateKimiExplanationServer } from '../src/services/kimiExplanation';

export function monveilApiPlugin(): Plugin {
  return {
    name: 'monveil-backend-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

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
          return;
        }

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
            } catch (err: unknown) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: (err as Error).message }));
            }
          });
          return;
        }

        if (url.pathname === '/api/envio/status') {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              network: 'Monad Testnet (10143)',
              contractAddress: '0x8a82a7314fbf17a590420B8d7De3044ab21f633B',
              eventsIndexed: ['ReceiptRecorded', 'PaymentSettled'],
              status: 'ready',
            })
          );
          return;
        }

        next();
      });
    },
  };
}
