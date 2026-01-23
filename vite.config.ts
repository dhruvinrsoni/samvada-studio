import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Use environment variable for base path (GitHub Pages needs /repo-name/)
const base = process.env.BASE_URL || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Changed back to autoUpdate for better UX
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'icon.svg',
        'icon-512.svg',
        'apple-touch-icon.svg',
        'maskable-icon.svg'
      ],
      manifest: {
        name: 'Samvada Studio',
        short_name: 'Samvada',
        description: 'A power-user workspace for designing and managing conversational AI',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'any',
        scope: base,
        start_url: base,
        lang: 'en',
        dir: 'ltr',
        categories: ['productivity', 'utilities', 'developer tools'],
        prefer_related_applications: false,
        icons: [
          {
            src: 'icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'maskable-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: 'apple-touch-icon.svg',
            sizes: '180x180',
            type: 'image/svg+xml'
          }
        ],
        shortcuts: [
          {
            name: 'New Chat',
            short_name: 'New',
            description: 'Start a new chat conversation',
            url: base + '?action=new-chat',
            icons: [{ src: 'icon.svg', sizes: '192x192', type: 'image/svg+xml' }]
          },
          {
            name: 'Command Palette',
            short_name: 'Commands',
            description: 'Open command palette',
            url: base + '?action=command-palette',
            icons: [{ src: 'icon.svg', sizes: '192x192', type: 'image/svg+xml' }]
          }
        ],
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
