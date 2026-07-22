import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'logo.png',
          'icon-192.png',
          'icon-512.png',
          'maskable-icon-512x512.png',
          'code-assets/annex-iii-map-september-2024.png',
        ],
        workbox: {
          navigateFallbackDenylist: [/^\/admin/],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          globIgnores: [
            '**/TPPTContent-*.js',
            '**/tppt-*.js',
            '**/pdf.worker*.mjs',
          ],
        },
        manifest: {
          name: 'MedTech Europe: The Code App',
          short_name: 'TheCodeApp',
          description: 'The MedTech Europe Code of Ethical Business Practice',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '^/admin/?$': {
          target: 'http://localhost:3000',
          rewrite: () => '/admin/index.html'
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('pdfmake')) return 'tppt-pdfmake';
            if (id.includes('pdfjs-dist')) return 'tppt-pdfjs';
            if (
              id.includes('mammoth') ||
              id.includes('jszip') ||
              id.includes('pako') ||
              id.includes('sax') ||
              id.includes('underscore')
            ) {
              return 'tppt-docx';
            }
            return undefined;
          },
        },
      },
    },
  };
});
