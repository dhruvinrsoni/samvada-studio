import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import type { IncomingMessage, ServerResponse } from 'http'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version?: string; name?: string }
const appVersion = pkg.version ?? '0.0.0'
const gitCommit = (() => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
})()

const gitCommitDate = (() => {
  try {
    // Get commit date in ISO format
    const commitDateISO = execSync('git log -1 --format=%cd --date=iso').toString().trim()
    const commitDate = new Date(commitDateISO)
    // Format as IST with +05:30
    return commitDate.toISOString().replace('T', ' ').slice(0, -5) + '+05:30'
  } catch {
    return 'unknown'
  }
})()

// Get build timestamp in IST (Indian Standard Time)
const buildTimestamp = (() => {
  const now = new Date()
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000 // 5.5 hours in milliseconds
  const istTime = new Date(now.getTime() + istOffset)
  return istTime.toISOString().replace('T', ' ').slice(0, -5) + '+05:30'
})()

// Determine if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_MODE === 'true'

// Detect Vercel build environment (VERCEL env var is set automatically by Vercel)
const isVercel = !!process.env.VERCEL

// Use environment variable for base path (GitHub Pages needs /repo-name/)
// Default to '/' in development and on Vercel, '/samvada-studio/' for GitHub Pages builds.
const defaultProdBase = isVercel ? '/' : '/samvada-studio/'
const base = process.env.BASE_URL ?? (isDev ? '/' : defaultProdBase)

/**
 * Vite plugin that embeds a CORS proxy into the dev server.
 * This means `npm run dev` is the ONLY command needed — no separate `npm run proxy`.
 * In production, the Vercel serverless function at /api/proxy handles this instead.
 */
function corsProxyPlugin(): Plugin {
  return {
    name: 'samvada-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req: IncomingMessage, res: ServerResponse) => {
        // CORS headers on all responses
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        // Preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Max-Age', '86400');
          res.writeHead(200);
          res.end();
          return;
        }

        // Target URL from header — check BEFORE health check so that
        // GET requests with x-proxy-target are forwarded (e.g. OpenAI /v1/models).
        const targetUrl = req.headers['x-proxy-target'] as string | undefined;

        // Health check: only when there's no target (plain GET /api/proxy)
        if (!targetUrl && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', service: 'samvada-cors-proxy-dev' }));
          return;
        }

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing x-proxy-target header' }));
          return;
        }

        let parsedTarget: URL;
        try {
          parsedTarget = new URL(targetUrl);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid target URL' }));
          return;
        }

        // Read request body
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        try {
          // Build forwarded headers
          const forwardHeaders: Record<string, string> = {};
          const skipHeaders = new Set([
            'host', 'x-proxy-target', 'connection', 'keep-alive',
            'transfer-encoding', 'content-length',
          ]);

          for (const [key, value] of Object.entries(req.headers)) {
            if (!skipHeaders.has(key.toLowerCase()) && typeof value === 'string') {
              forwardHeaders[key] = value;
            }
          }

          // Anthropic special header
          if (parsedTarget.hostname.includes('anthropic.com')) {
            forwardHeaders['anthropic-dangerous-direct-browser-access'] = 'true';
          }

          // Forward the request (GET/HEAD must not have a body)
          const method = req.method || 'POST';
          const hasBody = method !== 'GET' && method !== 'HEAD' && body;
          const proxyResponse = await fetch(targetUrl, {
            method,
            headers: forwardHeaders,
            body: hasBody ? body : undefined,
          });

          // Build response headers
          const responseHeaders: Record<string, string> = {
            'Access-Control-Allow-Origin': '*',
          };
          proxyResponse.headers.forEach((value, key) => {
            const lower = key.toLowerCase();
            if (
              !lower.startsWith('access-control-') &&
              lower !== 'content-encoding' &&
              lower !== 'transfer-encoding' &&
              lower !== 'content-length'
            ) {
              responseHeaders[key] = value;
            }
          });

          const responseBody = await proxyResponse.text();
          res.writeHead(proxyResponse.status, responseHeaders);
          res.end(responseBody);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[CORS Proxy] Error: ${message}`);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy error', message, target: targetUrl }));
        }
      });
    },
  };
}

// Derive Vercel proxy URL for cross-origin auto-discovery.
// On Vercel: use the production URL env var. Otherwise: derive from package.json name.
const vercelProxyUrl = (() => {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/api/proxy`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/proxy`
  }
  // Fallback: derive from package name (matches default Vercel project naming)
  const projectName = pkg.name || 'samvada-studio'
  return `https://${projectName}.vercel.app/api/proxy`
})()

// PWA configuration based on environment
const pwaConfig = {
  name: isDev ? 'Samvada Studio (Dev)' : 'Samvada Studio',
  short_name: isDev ? 'Samvada Dev' : 'Samvada',
  description: isDev 
    ? 'Development version - A power-user workspace for designing and managing conversational AI'
    : 'A power-user workspace for designing and managing conversational AI',
  theme_color: isDev ? '#ff6b6b' : '#1a1a2e', // Red for dev, blue for prod
  background_color: isDev ? '#2d1b69' : '#1a1a2e', // Different background for dev
  start_url: isDev ? `${base}?mode=dev` : base,
  scope: base,
  icons: [
    {
      src: isDev ? 'icon-dev.svg' : 'icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any'
    },
    {
      src: isDev ? 'icon-512-dev.svg' : 'icon-512.svg',
      sizes: '512x512',
      type: 'image/svg+xml',
      purpose: 'any'
    },
    {
      src: isDev ? 'maskable-icon-dev.svg' : 'maskable-icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'maskable'
    },
    {
      src: isDev ? 'apple-touch-icon-dev.svg' : 'apple-touch-icon.svg',
      sizes: '180x180',
      type: 'image/svg+xml'
    }
  ]
}

export default defineConfig({
  base,
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.GIT_COMMIT': JSON.stringify(gitCommit),
    'import.meta.env.GIT_COMMIT_DATE': JSON.stringify(gitCommitDate),
    'import.meta.env.BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    'import.meta.env.VERCEL_PROXY_URL': JSON.stringify(vercelProxyUrl)
  },
  plugins: [
    corsProxyPlugin(),
    react(),
    VitePWA({
      disable: false, // Explicitly enable for all modes
      registerType: 'autoUpdate', // Changed back to autoUpdate for better UX
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'icon.svg',
        'icon-512.svg',
        'apple-touch-icon.svg',
        'maskable-icon.svg',
        // Include dev icons if in dev mode
        ...(isDev ? ['icon-dev.svg', 'icon-512-dev.svg', 'maskable-icon-dev.svg', 'apple-touch-icon-dev.svg'] : [])
      ],
      manifest: {
        name: pwaConfig.name,
        short_name: pwaConfig.short_name,
        description: pwaConfig.description,
        theme_color: pwaConfig.theme_color,
        background_color: pwaConfig.background_color,
        display: 'standalone',
        orientation: 'any',
        scope: pwaConfig.scope,
        start_url: pwaConfig.start_url,
        lang: 'en',
        dir: 'ltr',
        categories: ['productivity', 'utilities', 'developer tools'],
        prefer_related_applications: false,
        icons: pwaConfig.icons,
        shortcuts: [
          {
            name: 'New Chat',
            short_name: 'New',
            description: 'Start a new chat conversation',
            url: base + '?action=new-chat',
            icons: [{ src: isDev ? 'icon-dev.svg' : 'icon.svg', sizes: 'any', type: 'image/svg+xml' }]
          },
          {
            name: 'Command Palette',
            short_name: 'Commands',
            description: 'Open command palette',
            url: base + '?action=command-palette',
            icons: [{ src: isDev ? 'icon-dev.svg' : 'icon.svg', sizes: 'any', type: 'image/svg+xml' }]
          },
          {
            name: 'Templates Library',
            short_name: 'Templates',
            description: 'Browse and use prompt templates',
            url: base + '?action=templates',
            icons: [{ src: isDev ? 'icon-dev.svg' : 'icon.svg', sizes: 'any', type: 'image/svg+xml' }]
          }
        ],
        share_target: {
          action: base + '?share',
          method: 'GET',
          enctype: 'application/x-www-form-urlencoded',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
        related_applications: [],
        handle_links: 'preferred'
      },
      workbox: {
        // Precache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        
        // Cache strategies for runtime requests
        runtimeCaching: [
          {
            // Cache API responses (LLM calls) with network-first strategy
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache font files
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache images with stale-while-revalidate
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ],
        
        // Clean old caches
        cleanupOutdatedCaches: true,
        
        // Skip waiting for faster updates
        skipWaiting: false, // Let user control updates
        
        // Don't claim clients immediately (let user refresh)
        clientsClaim: false,
        
        // Navigation fallback for SPA
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /\/sw\.js$/]
      },
      
      // Development options
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      }
    })
  ],
  resolve: {
    alias: {
      '@': __dirname + 'src'
    }
  }
})
