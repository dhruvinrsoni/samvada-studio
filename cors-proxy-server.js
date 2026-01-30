#!/usr/bin/env node
/**
 * Simple CORS Proxy Server for Samvada Studio
 * 
 * This server allows OpenAI and Anthropic API calls from the browser
 * by adding CORS headers to API responses.
 * 
 * Usage:
 *   node cors-proxy-server.js [port] [--insecure]
 * 
 * Flags:
 *   --insecure    Disable SSL certificate verification (for corporate networks)
 * 
 * Environment Variables:
 *   PORT                        Port number (default: 8080)
 *   NODE_TLS_REJECT_UNAUTHORIZED  Set to '0' to disable SSL verification
 * 
 * Default port: 8080
 * 
 * Then configure your provider with:
 *   CORS Proxy URL: http://localhost:8080
 */

import http from 'http';
import https from 'https';
import url from 'url';
import os from 'os';

// Check for --insecure flag or environment variable
const args = process.argv.slice(2);
const insecureFlag = args.includes('--insecure');
const insecureEnv = process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';
const isInsecure = insecureFlag || insecureEnv;

// Disable SSL verification if requested (for corporate networks with SSL inspection)
if (isInsecure) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Parse port from arguments (excluding --insecure flag)
const portArg = args.find(arg => !arg.startsWith('--') && !isNaN(parseInt(arg)));
const PORT = process.env.PORT || (portArg ? parseInt(portArg) : 8080);

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400', // 24 hours
    });
    res.end();
    return;
  }

  // Extract target URL from path (everything after the first /)
  const requestPath = req.url.slice(1); // Remove leading /
  
  if (!requestPath || !requestPath.startsWith('http')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Usage: http://localhost:' + PORT + '/{target-url}\n\nExample: http://localhost:' + PORT + '/https://api.openai.com/v1/chat/completions');
    return;
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${requestPath}`);

  // Parse target URL
  const targetUrl = url.parse(requestPath);
  const isHttps = targetUrl.protocol === 'https:';
  const httpModule = isHttps ? https : http;

  // Forward request options
  const proxyOptions = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path: targetUrl.path,
    method: req.method,
    headers: { ...req.headers },
  };

  // Remove host header (it should be for target, not proxy)
  delete proxyOptions.headers.host;

  // Make the proxied request
  const proxyReq = httpModule.request(proxyOptions, (proxyRes) => {
    // Add CORS headers to response
    const headers = { ...proxyRes.headers };
    
    // Remove existing CORS headers to avoid duplicates
    delete headers['access-control-allow-origin'];
    delete headers['access-control-allow-methods'];
    delete headers['access-control-allow-headers'];
    delete headers['access-control-allow-credentials'];
    delete headers['access-control-max-age'];
    
    // Add our CORS headers
    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = '*';

    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  // Handle proxy errors
  proxyReq.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] Proxy error:`, error.message);
    res.writeHead(502, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({
      error: 'Proxy error',
      message: error.message,
      target: requestPath,
    }));
  });

  // Forward request body
  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     🌐 Samvada Studio - CORS Proxy Server Running         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  ✅ Proxy Server:  http://localhost:${PORT}`);
  console.log(`  🌍 Network:       http://${getLocalIP()}:${PORT}`);
  
  if (isInsecure) {
    console.log('');
    console.log('  ⚠️  SSL VERIFICATION DISABLED');
    console.log('     This mode is for corporate networks with SSL inspection');
    console.log('     (Zscaler, Palo Alto, etc.)');
    console.log('     ⚡ Recommended for development only');
  }
  
  console.log('');
  console.log('  ⚠️  IMPORTANT: This is the PROXY, not the app!');
  console.log('     Open a NEW terminal and run: npm run dev');
  console.log('     Then visit: http://localhost:5173');
  console.log('');
  console.log('  📝 Configure in Samvada Studio:');
  console.log('     Admin Settings → Provider → Advanced Settings');
  console.log(`     CORS Proxy URL: http://localhost:${PORT}`);
  console.log('');
  console.log('  🔍 Request format:');
  console.log(`     http://localhost:${PORT}/{target-url}`);
  console.log('');
  console.log('  Example:');
  console.log(`     http://localhost:${PORT}/https://api.openai.com/v1/chat/completions`);
  console.log('');
  
  if (!isInsecure) {
    console.log('  💡 Corporate network issues?');
    console.log('     Run with: node cors-proxy-server.js --insecure');
    console.log('');
  }
  
  console.log('  Press Ctrl+C to stop');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Get local IP for network access
function getLocalIP() {
  const nets = os.networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down CORS proxy server...\n');
  server.close(() => {
    console.log('✓ Server stopped\n');
    process.exit(0);
  });
});
