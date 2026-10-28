import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/',
  plugins: [tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __LIVE__: JSON.stringify(process.env.VERCEL_ENV === 'production') },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
