import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: '0.0.0.0', port: 3000, strictPort: true, allowedHosts: ['3000-irqt6b3hyfuchqyv2uag5-29db19b0.sg2.manus.computer'] },
  preview: { host: '0.0.0.0', port: 3000, strictPort: true },
});
