import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Standalone CORS Proxy for Samvada Studio
 *
 * Deploy this as a separate Vercel project to proxy API calls
 * when the main app is hosted on GitHub Pages (or any static host).
 *
 * Supports two modes:
 *   Header-based: POST with x-proxy-target header (used by auto-discovery)
 *   Path-based:   POST /{targetUrl}  (backward compatible with cors-proxy-server.js)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers on all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  // Health check
  if (req.method === 'GET' && (!req.url || req.url === '/' || req.url === '/api/proxy')) {
    return res.status(200).json({
      status: 'ok',
      service: 'samvada-cors-proxy',
      timestamp: new Date().toISOString(),
    });
  }

  // Resolve target URL — prefer header, fall back to path
  let targetUrl = req.headers['x-proxy-target'] as string | undefined;

  if (!targetUrl) {
    // Path-based: /https://api.openai.com/v1/...
    const pathUrl = (req.url || '').replace(/^\/api\/proxy\/?/, '/').slice(1);
    if (pathUrl.startsWith('http://') || pathUrl.startsWith('https://')) {
      targetUrl = pathUrl;
    }
  }

  if (!targetUrl) {
    return res.status(400).json({
      error: 'Missing target URL',
      usage: 'Set x-proxy-target header or use path: /https://api.example.com/...',
    });
  }

  try {
    new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid target URL' });
  }

  try {
    const forwardHeaders: Record<string, string> = {};
    const skipHeaders = new Set([
      'host', 'x-proxy-target', 'connection', 'keep-alive',
      'transfer-encoding', 'content-length',
      'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto',
      'x-vercel-id', 'x-vercel-forwarded-for', 'x-vercel-deployment-url',
      'x-real-ip', 'x-vercel-proxy-signature', 'x-vercel-proxy-signature-ts',
    ]);

    for (const [key, value] of Object.entries(req.headers)) {
      if (!skipHeaders.has(key.toLowerCase()) && typeof value === 'string') {
        forwardHeaders[key] = value;
      }
    }

    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.hostname.includes('anthropic.com')) {
      forwardHeaders['anthropic-dangerous-direct-browser-access'] = 'true';
    }

    const proxyResponse = await fetch(targetUrl, {
      method: req.method || 'POST',
      headers: forwardHeaders,
      body: req.body
        ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
        : undefined,
    });

    proxyResponse.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (
        !lower.startsWith('access-control-') &&
        lower !== 'content-encoding' &&
        lower !== 'transfer-encoding' &&
        lower !== 'content-length'
      ) {
        res.setHeader(key, value);
      }
    });

    const body = await proxyResponse.text();
    return res.status(proxyResponse.status).send(body);
  } catch (error) {
    console.error('[Proxy Error]', error);
    return res.status(502).json({
      error: 'Proxy error',
      message: error instanceof Error ? error.message : 'Unknown error',
      target: targetUrl,
    });
  }
}
