import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/',
  plugins: [tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __VERCEL__: JSON.stringify(Boolean(process.env.VERCEL)) },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
