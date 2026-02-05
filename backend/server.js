#!/usr/bin/env node
/**
 * 🔐 Samvada Studio - Secure CORS Proxy Backend
 * 
 * A minimal, provider-agnostic proxy server that enables browser-based LLM access
 * while maintaining security and user control.
 * 
 * ✨ Features:
 * - Generic provider support (OpenAI, Anthropic, Google, etc.)
 * - Zero key storage (BYOK - Bring Your Own Keys)
 * - Rate limiting and request validation
 * - Security headers and CORS protection
 * - Stateless and zero-maintenance
 * 
 * 🚀 Usage:
 *   npm start                  # Production
 *   npm run dev                # Development with hot-reload
 *   PORT=3001 npm start        # Custom port
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ═══════════════════════════════════════════════════════════════
// 🔒 SECURITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Allow frontend to embed
  crossOriginEmbedderPolicy: false,
}));

// CORS - Allow frontend domains
const allowedOrigins = [
  'http://localhost:5173',           // Vite dev
  'http://localhost:4173',           // Vite preview
  'https://dhruvinrsoni.github.io',  // GitHub Pages
  process.env.FRONTEND_URL,          // Custom domain
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else if (NODE_ENV === 'development') {
      callback(null, true); // Allow all in dev
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Rate limiting - Prevent abuse
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: NODE_ENV === 'development' ? 100 : 60, // 60 requests per minute in production
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════
// 🎯 PROVIDER CONFIGURATION (Open-Closed Principle)
// ═══════════════════════════════════════════════════════════════

/**
 * Provider adapter interface - extend without modifying existing code
 * Each provider defines:
 * - baseUrl: API endpoint
 * - requiredHeaders: Headers needed for authentication
 * - customHeaders: Provider-specific headers (e.g., Anthropic's browser access)
 * - validate: Optional validation function
 */
const PROVIDERS = {
  openai: {
    baseUrl: 'https://api.openai.com',
    requiredHeaders: ['authorization'],
    customHeaders: {},
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    requiredHeaders: ['x-api-key', 'anthropic-version'],
    customHeaders: {
      'anthropic-dangerous-direct-browser-access': 'true',
    },
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    requiredHeaders: [], // Uses query param for key
    customHeaders: {},
  },
  azure: {
    baseUrl: 'https://*.openai.azure.com', // User provides full URL
    requiredHeaders: ['api-key'],
    customHeaders: {},
  },
  ollama: {
    baseUrl: 'http://localhost:11434', // Local by default
    requiredHeaders: [],
    customHeaders: {},
  },
  // 🔌 EXTENSIBLE: Add new providers here without touching proxy logic
};

// ═══════════════════════════════════════════════════════════════
// 🛣️ ROUTES
// ═══════════════════════════════════════════════════════════════

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Samvada Studio Proxy',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Provider info endpoint - returns supported providers
app.get('/api/providers', (req, res) => {
  const providers = Object.entries(PROVIDERS).map(([id, config]) => ({
    id,
    baseUrl: config.baseUrl,
    requiredHeaders: config.requiredHeaders,
  }));
  
  res.json({ providers });
});

/**
 * 🌐 Generic Proxy Endpoint - Provider-Agnostic
 * 
 * POST /api/proxy
 * 
 * Headers:
 *   X-Target-URL: Full URL to proxy to
 *   X-Provider: Provider ID (optional, for validation)
 *   Authorization: Bearer token (if needed)
 *   [Any provider-specific headers]
 * 
 * Body: JSON payload to forward
 * 
 * This design follows SOLID principles:
 * - Single Responsibility: Only proxies requests
 * - Open-Closed: Add providers via config, not code changes
 * - Dependency Inversion: Depends on provider interface, not concrete implementations
 */
app.post('/api/proxy', async (req, res) => {
  const targetUrl = req.headers['x-target-url'];
  const providerId = req.headers['x-provider'];
  
  // Validation
  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({
      error: 'Missing required header: X-Target-URL',
      usage: 'POST /api/proxy with X-Target-URL header',
    });
  }

  // Validate URL format
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid target URL format',
      provided: targetUrl,
    });
  }

  // Security: Whitelist allowed domains (prevent SSRF attacks)
  const allowedDomains = [
    'api.openai.com',
    'api.anthropic.com',
    'generativelanguage.googleapis.com',
    'openai.azure.com',
    'localhost', // For Ollama
  ];

  const isAllowedDomain = allowedDomains.some(domain => 
    parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
  );

  if (!isAllowedDomain && NODE_ENV !== 'development') {
    return res.status(403).json({
      error: 'Target domain not allowed',
      domain: parsedUrl.hostname,
      hint: 'Only whitelisted LLM providers are supported',
    });
  }

  // Validate request body size
  const bodySize = JSON.stringify(req.body).length;
  if (bodySize > 10 * 1024 * 1024) { // 10MB limit
    return res.status(413).json({
      error: 'Request body too large',
      maxSize: '10MB',
      actualSize: `${(bodySize / 1024 / 1024).toFixed(2)}MB`,
    });
  }

  console.log(`[${new Date().toISOString()}] PROXY ${req.method} → ${targetUrl}`);

  // Prepare request body
  const requestBody = req.body && Object.keys(req.body).length > 0 
    ? JSON.stringify(req.body) 
    : '';

  // Prepare headers to forward
  const forwardHeaders = { ...req.headers };
  
  // Remove proxy-specific headers
  delete forwardHeaders['x-target-url'];
  delete forwardHeaders['x-provider'];
  delete forwardHeaders['host'];
  delete forwardHeaders['connection'];
    delete forwardHeaders['content-length']; // Recalculate based on actual body
  
  // Ensure Content-Type is set for JSON requests
  if (!forwardHeaders['content-type']) {
    forwardHeaders['content-type'] = 'application/json';
  
    // Set Content-Length if we have a body
    if (requestBody) {
      forwardHeaders['content-length'] = Buffer.byteLength(requestBody);
    }
  }

  // Add provider-specific headers if provider is specified
  if (providerId && PROVIDERS[providerId]) {
    Object.assign(forwardHeaders, PROVIDERS[providerId].customHeaders);
  }

  // Make the proxied request
  const httpModule = parsedUrl.protocol === 'https:' ? https : http;
  const requestOptions = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    method: req.method,
    headers: forwardHeaders,
  };

  const proxyReq = httpModule.request(requestOptions, (proxyRes) => {
    // Forward status code and headers
    res.status(proxyRes.statusCode);
    
    // Forward headers (except hop-by-hop)
    const responseHeaders = { ...proxyRes.headers };
    delete responseHeaders['transfer-encoding'];
    delete responseHeaders['connection'];
    delete responseHeaders['keep-alive'];
    
    Object.entries(responseHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Stream response back to client
    proxyRes.pipe(res);
  });

  // Handle errors
  proxyReq.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Proxy error:`, error.message);
    
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Proxy request failed',
        message: error.message,
        target: targetUrl,
      });
    }
  });

  // Handle client disconnect
  req.on('close', () => {
    proxyReq.destroy();
  });

  // Forward request body if present
  if (requestBody) {
    proxyReq.write(requestBody);
  }
  
  proxyReq.end();
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/providers',
      'POST /api/proxy',
    ],
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// ═══════════════════════════════════════════════════════════════
// 🚀 START SERVER
// ═══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║     🔐 Samvada Studio - Secure CORS Proxy Backend           ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  ✅ Server:        http://localhost:${PORT}`);
  console.log(`  🌍 Environment:   ${NODE_ENV}`);
  console.log(`  🔒 CORS:          ${allowedOrigins.filter(Boolean).length} allowed origins`);
  console.log(`  ⚡ Rate Limit:    ${NODE_ENV === 'development' ? 100 : 60} req/min`);
  console.log('');
  console.log('  📝 Available Endpoints:');
  console.log(`     GET  /health          → Server status`);
  console.log(`     GET  /api/providers   → Supported providers`);
  console.log(`     POST /api/proxy       → Generic proxy (requires X-Target-URL header)`);
  console.log('');
  console.log('  🎯 Supported Providers:');
  Object.keys(PROVIDERS).forEach(provider => {
    console.log(`     • ${provider}`);
  });
  console.log('');
  console.log('  🔐 Security Features:');
  console.log('     ✓ Rate limiting (60 req/min)');
  console.log('     ✓ CORS whitelist protection');
  console.log('     ✓ SSRF attack prevention');
  console.log('     ✓ Request size validation (10MB max)');
  console.log('     ✓ Security headers (helmet)');
  console.log('     ✓ Zero key storage (BYOK)');
  console.log('');
  console.log('  📚 Documentation:');
  console.log('     https://github.com/dhruvinrsoni/samvada-studio/blob/main/backend/README.md');
  console.log('');
  console.log('  🚀 Deploy for Free:');
  console.log('     • Render: https://render.com/deploy');
  console.log('     • Railway: https://railway.app/new');
  console.log('');
  console.log('  Press Ctrl+C to stop');
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down server...\n');
  process.exit(0);
});
