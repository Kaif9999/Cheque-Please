import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import tailwindcss from '@tailwindcss/vite';

/** The site's own address for link-preview tags: SITE_URL if set, else Vercel's production domain, else relative. */
const SITE_URL =
  process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');

const siteUrl = (): Plugin => ({
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', SITE_URL.replace(/\/$/, '')),
});

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), siteUrl()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
