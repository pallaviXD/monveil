import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { monveilApiPlugin } from './server/plugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.KIMI_API_KEY) process.env.KIMI_API_KEY = env.KIMI_API_KEY;
  if (env.KIMI_BASE_URL) process.env.KIMI_BASE_URL = env.KIMI_BASE_URL;
  if (env.DEPLOYER_PRIVATE_KEY) process.env.DEPLOYER_PRIVATE_KEY = env.DEPLOYER_PRIVATE_KEY;
  if (env.ENVIO_GRAPHQL_ENDPOINT) process.env.ENVIO_GRAPHQL_ENDPOINT = env.ENVIO_GRAPHQL_ENDPOINT;

  return {
    plugins: [react(), tailwindcss(), monveilApiPlugin()],
    server: {
      host: '0.0.0.0',
      port: 3000,
    },
    preview: { host: '0.0.0.0', port: 3000 },
  };
});

