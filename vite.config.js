import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this app at /dashboard-web/. Local dev (npm run dev) stays at /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/dashboard-web/' : '/',
  plugins: [react()],
}));
