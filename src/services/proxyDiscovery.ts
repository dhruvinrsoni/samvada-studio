/**
 * Proxy Auto-Discovery Service for Samvada Studio
 *
 * Automatically detects available CORS proxy endpoints so that
 * OpenAI / Anthropic / Azure API calls "just work" without manual config.
 *
 * Discovery priority:
 *   1. Same-origin /api/proxy  (Vercel deployment or Vite dev server)
 *   2. Known Vercel deployment  (cross-origin, derived from package name at build time)
 *   3. Cached external proxy   (user previously configured)
 *   4. None                    (Google Gemini & Ollama don't need a proxy)
 *
 * Modeled on the Ollama auto-discovery pattern (ollamaDiscovery.ts).
 */

import { logDebug, logWarning } from '../utils/debug';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProxyInfo {
  /** Full URL of the proxy endpoint (always ends with /api/proxy for our proxies) */
  url: string;
}

export interface ProxyHealthResult {
  isHealthy: boolean;
  url: string;
  responseTime: number;
  error?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'samvada-proxy-url';
const HEALTH_TIMEOUT_MS = 4000;

/**
 * Known Vercel proxy URL — injected at build time from vite.config.ts.
 * e.g. "https://samvada-studio.vercel.app/api/proxy"
 */
const VERCEL_PROXY_URL: string = (import.meta.env['VERCEL_PROXY_URL'] as string) || '';

// ─── State ───────────────────────────────────────────────────────────────────

let discoveryPromise: Promise<void> | null = null;
let cachedProxy: ProxyInfo | null | undefined = undefined; // undefined = not yet checked

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Kick off proxy discovery. Safe to call multiple times — only runs once.
 * Call this early (e.g. in main.tsx) so the result is ready before the
 * first LLM request.
 */
export function startProxyDiscovery(): void {
  if (!discoveryPromise) {
    discoveryPromise = runDiscovery();
  }
}

/**
 * Returns the discovered proxy, waiting for discovery if it's still running.
 * Returns null when no proxy is available.
 */
export async function getAutoProxy(): Promise<ProxyInfo | null> {
  if (cachedProxy === undefined && discoveryPromise) {
    await discoveryPromise;
  }
  return cachedProxy ?? null;
}

/**
 * Synchronous getter — returns whatever we have right now (may be null if
 * discovery hasn't finished).  Prefer `getAutoProxy()` in async contexts.
 */
export function getAutoProxySync(): ProxyInfo | null {
  return cachedProxy ?? null;
}

/**
 * Force a re-discovery (e.g. after the user deploys a new proxy).
 */
export function resetProxyDiscovery(): void {
  cachedProxy = undefined;
  discoveryPromise = null;
  startProxyDiscovery();
}

/**
 * Store an external proxy URL (from one-click deploy callback or manual input).
 * Auto-normalizes the URL (e.g. bare .vercel.app → .vercel.app/api/proxy).
 */
export function setExternalProxy(url: string): void {
  const normalized = normalizeProxyUrl(url);
  localStorage.setItem(STORAGE_KEY, normalized);
  cachedProxy = { url: normalized };
  logDebug('Proxy Discovery', { message: 'External proxy set', url: normalized });
}

/**
 * Clear any stored external proxy URL.
 */
export function clearExternalProxy(): void {
  localStorage.removeItem(STORAGE_KEY);
  cachedProxy = undefined;
  discoveryPromise = null;
}

/**
 * Normalize a proxy URL:
 * - Strip trailing slashes
 * - For known platforms (.vercel.app, .netlify.app), auto-append /api/proxy
 *   e.g. "https://samvada-studio.vercel.app/" → "https://samvada-studio.vercel.app/api/proxy"
 * - For localhost with no path, leave as-is (legacy cors-proxy-server.js)
 */
export function normalizeProxyUrl(url: string): string {
  const cleaned = url.replace(/\/+$/, '');

  // Already points to /api/proxy — good to go
  if (cleaned.endsWith('/api/proxy')) {
    return cleaned;
  }

  // Known platforms where our serverless proxy lives at /api/proxy
  try {
    const parsed = new URL(cleaned);
    const isKnownPlatform =
      parsed.hostname.endsWith('.vercel.app') ||
      parsed.hostname.endsWith('.netlify.app');

    if (isKnownPlatform && (parsed.pathname === '/' || parsed.pathname === '')) {
      return `${cleaned}/api/proxy`;
    }
  } catch {
    // Not a valid URL, return as-is
  }

  return cleaned;
}

/**
 * Returns true when the URL points to an /api/proxy endpoint (header-based format).
 * False means it's a legacy path-based proxy (cors-proxy-server.js, Cloudflare Workers).
 */
export function isHeaderBasedProxy(url: string): boolean {
  return url.endsWith('/api/proxy');
}

/**
 * Health-check a proxy URL. Auto-normalizes the URL first.
 */
export async function checkProxyHealth(url: string): Promise<ProxyHealthResult> {
  const normalized = normalizeProxyUrl(url);
  const start = Date.now();
  try {
    const res = await fetch(normalized, {
      method: 'GET',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    const elapsed = Date.now() - start;

    if (res.ok) {
      // Guard against HTML responses (e.g. user entered bare domain, normalization missed)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        return { isHealthy: false, url: normalized, responseTime: elapsed, error: 'Not a proxy endpoint (returned HTML instead of JSON)' };
      }
      const data = await res.json();
      if (data.status === 'ok') {
        return { isHealthy: true, url: normalized, responseTime: elapsed };
      }
    }
    return { isHealthy: false, url: normalized, responseTime: elapsed, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      isHealthy: false,
      url: normalized,
      responseTime: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Returns true when the given provider type requires a CORS proxy for
 * browser-based API calls.
 */
export function providerNeedsProxy(type: string): boolean {
  return ['openai', 'anthropic', 'azure', 'custom'].includes(type);
}

// ─── Internal ────────────────────────────────────────────────────────────────

async function runDiscovery(): Promise<void> {
  logDebug('Proxy Discovery', { message: 'Starting discovery...' });

  // 1. Same-origin /api/proxy (Vercel or Vite dev server)
  const sameOriginUrl = `${window.location.origin}/api/proxy`;
  const sameOriginResult = await checkProxyHealth(sameOriginUrl);

  if (sameOriginResult.isHealthy) {
    cachedProxy = { url: sameOriginUrl };
    logDebug('Proxy Discovery', {
      message: 'Same-origin proxy found',
      url: sameOriginUrl,
      responseTime: sameOriginResult.responseTime,
    });
    return;
  }

  // 2. Known Vercel deployment (cross-origin auto-discovery)
  //    Only if we're NOT already on that host (already checked as same-origin above)
  if (VERCEL_PROXY_URL) {
    try {
      const vercelHost = new URL(VERCEL_PROXY_URL).hostname;
      const currentHost = window.location.hostname;

      if (vercelHost !== currentHost) {
        const vercelResult = await checkProxyHealth(VERCEL_PROXY_URL);
        if (vercelResult.isHealthy) {
          cachedProxy = { url: VERCEL_PROXY_URL };
          // Cache for faster startups next time
          localStorage.setItem(STORAGE_KEY, VERCEL_PROXY_URL);
          logDebug('Proxy Discovery', {
            message: 'Vercel proxy found (cross-origin)',
            url: VERCEL_PROXY_URL,
            responseTime: vercelResult.responseTime,
          });
          return;
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }

  // 3. Previously stored external proxy
  const storedUrl = localStorage.getItem(STORAGE_KEY);
  if (storedUrl) {
    const storedResult = await checkProxyHealth(storedUrl);
    if (storedResult.isHealthy) {
      cachedProxy = { url: storedUrl };
      logDebug('Proxy Discovery', {
        message: 'Cached external proxy healthy',
        url: storedUrl,
        responseTime: storedResult.responseTime,
      });
      return;
    }
    logWarning('Proxy Discovery', {
      message: 'Cached external proxy unreachable',
      url: storedUrl,
      error: storedResult.error,
    });
  }

  // 4. No proxy available
  cachedProxy = null;
  logDebug('Proxy Discovery', {
    message: 'No proxy found. Google Gemini and Ollama will work without one.',
  });
}
