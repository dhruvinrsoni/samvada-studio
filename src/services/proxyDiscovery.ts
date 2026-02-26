/**
 * Proxy Auto-Discovery Service for Samvada Studio
 *
 * Automatically detects available CORS proxy endpoints so that
 * OpenAI / Anthropic / Azure API calls "just work" without manual config.
 *
 * Discovery priority:
 *   1. Same-origin /api/proxy  (Vercel deployment or Vite dev server)
 *   2. Cached external proxy   (user previously configured via one-click deploy)
 *   3. None                    (Google Gemini & Ollama don't need a proxy)
 *
 * Modeled on the Ollama auto-discovery pattern (ollamaDiscovery.ts).
 */

import { logDebug, logWarning } from '../utils/debug';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProxyInfo {
  /** 'same-origin' uses header-based proxy; 'external' uses path-based proxy */
  type: 'same-origin' | 'external';
  /** Full URL of the proxy endpoint */
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
 */
export function setExternalProxy(url: string): void {
  const cleaned = url.replace(/\/+$/, '');
  localStorage.setItem(STORAGE_KEY, cleaned);
  cachedProxy = { type: 'external', url: cleaned };
  logDebug('Proxy Discovery', { message: 'External proxy set', url: cleaned });
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
 * Health-check a proxy URL.
 */
export async function checkProxyHealth(url: string): Promise<ProxyHealthResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    const elapsed = Date.now() - start;

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok') {
        return { isHealthy: true, url, responseTime: elapsed };
      }
    }
    return { isHealthy: false, url, responseTime: elapsed, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      isHealthy: false,
      url,
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
    cachedProxy = { type: 'same-origin', url: sameOriginUrl };
    logDebug('Proxy Discovery', {
      message: 'Same-origin proxy found',
      url: sameOriginUrl,
      responseTime: sameOriginResult.responseTime,
    });
    return;
  }

  // 2. Previously stored external proxy
  const storedUrl = localStorage.getItem(STORAGE_KEY);
  if (storedUrl) {
    const storedResult = await checkProxyHealth(storedUrl);
    if (storedResult.isHealthy) {
      cachedProxy = { type: 'external', url: storedUrl };
      logDebug('Proxy Discovery', {
        message: 'Cached external proxy healthy',
        url: storedUrl,
        responseTime: storedResult.responseTime,
      });
      return;
    }
    // Proxy is dead — keep the URL but warn
    logWarning('Proxy Discovery', {
      message: 'Cached external proxy unreachable',
      url: storedUrl,
      error: storedResult.error,
    });
  }

  // 3. No proxy available
  cachedProxy = null;
  logDebug('Proxy Discovery', {
    message: 'No proxy found. Google Gemini and Ollama will work without one.',
  });
}
