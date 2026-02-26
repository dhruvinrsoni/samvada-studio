import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel Serverless CORS Proxy for Samvada Studio
 *
 * Forwards API requests to OpenAI, Anthropic, etc. and adds CORS headers
 * so the browser-based SPA can call them without CORS errors.
 *
 * Usage from the app:
 *   POST /api/proxy
 *   Header: x-proxy-target: https://api.openai.com/v1/chat/completions
 *   Body: (original request body)
 *
 *   GET /api/proxy  → health check
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
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'samvada-cors-proxy',
      timestamp: new Date().toISOString(),
    });
  }

  // Target URL from header
  const targetUrl = req.headers['x-proxy-target'] as string | undefined;
  if (!targetUrl) {
    return res.status(400).json({
      error: 'Missing x-proxy-target header',
      usage: 'Set the x-proxy-target header to the target API URL',
    });
  }

  try {
    new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid target URL' });
  }

  try {
    // Build forwarded headers — drop hop-by-hop and Vercel-internal headers
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

    // Anthropic requires this header for browser-originated requests
    const parsedUrl = new URL(targetUrl);
    if (parsedUrl.hostname.includes('anthropic.com')) {
      forwardHeaders['anthropic-dangerous-direct-browser-access'] = 'true';
    }

    // Forward the request
    const proxyResponse = await fetch(targetUrl, {
      method: req.method || 'POST',
      headers: forwardHeaders,
      body: req.body
        ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
        : undefined,
    });

    // Forward selected response headers
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
