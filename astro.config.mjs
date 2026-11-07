import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const isProd =
  globalThis.process?.argv?.includes('build') ||
  globalThis.process?.env?.NODE_ENV === 'production';

export default defineConfig({
  site: 'https://kantorei.net',
  server: {
    port: 4321,
  },
  output: 'server',
  // Zero-database stateless auth uses jose JWT cookies; driver: 'memory' prevents @astrojs/cloudflare from demanding a KV 'SESSION' binding
  session: {
    driver: 'memory',
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    imageService: 'passthrough',
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        'clsx',
        'tailwind-merge',
      ],
    },
    resolve: {
      alias: isProd
        ? {
            'react-dom/server': 'react-dom/server.edge',
          }
        : undefined,
    },
  },
});
