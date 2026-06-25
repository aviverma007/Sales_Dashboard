import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: { port: 90, host: true, open: true, allowedHosts: ['www.swdsales.com', 'swdsales.com'] },
});
