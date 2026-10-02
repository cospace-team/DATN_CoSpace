import { defineConfig, loadEnv, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Link previews (Facebook, Zalo, X) only accept absolute image URLs, so the share-card tags are
// added at build time and only when the site's own address is known. Without one they are left
// out rather than pointing at a domain the project doesn't own.
function shareCardMeta(siteUrl: string): Plugin {
  return {
    name: 'share-card-meta',
    transformIndexHtml(html) {
      if (!siteUrl) return html;
      const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({ tag: 'meta', attrs, injectTo: 'head' });
      const image = `${siteUrl}/og-image.png`;
      return {
        html: html.replace('<meta name="twitter:card" content="summary" />', '<meta name="twitter:card" content="summary_large_image" />'),
        tags: [
          meta({ property: 'og:url', content: `${siteUrl}/` }),
          meta({ property: 'og:image', content: image }),
          meta({ property: 'og:image:width', content: '1200' }),
          meta({ property: 'og:image:height', content: '630' }),
          meta({ property: 'og:image:alt', content: 'CoSpace: Làm việc đúng chỗ, đúng lúc.' }),
          meta({ name: 'twitter:image', content: image }),
        ],
      };
    },
  };
}

export default defineConfig(({ mode }) => {
  // '' loads every variable, so Vercel's VERCEL_PROJECT_PRODUCTION_URL (a bare host name,
  // set on every Vercel build) is visible here alongside VITE_SITE_URL from .env.
  const env = loadEnv(mode, process.cwd(), '');
  const vercelHost = env.VERCEL_PROJECT_PRODUCTION_URL;
  const siteUrl = (env.VITE_SITE_URL || (vercelHost ? `https://${vercelHost}` : '')).replace(/\/+$/, '');

  return {
    plugins: [react(), shareCardMeta(siteUrl)],
    server: {
      port: 5173,
      open: true
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-icons': ['react-icons'],
            'vendor-motion': ['framer-motion'],
            'vendor-supabase': ['@supabase/supabase-js'],
          }
        }
      },
      chunkSizeWarningLimit: 600
    }
  };
});
