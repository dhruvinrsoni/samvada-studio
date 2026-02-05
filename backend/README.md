# 🔐 Samvada Studio - Secure Backend Proxy

A **minimal, provider-agnostic CORS proxy** that enables browser-based access to LLM providers (OpenAI, Anthropic, Google) while maintaining security and user control.

## ✨ Key Features

- **🔌 Generic & Extensible** - Provider-agnostic design following SOLID principles
- **🔐 Zero Key Storage** - BYOK (Bring Your Own Keys) - users control their API keys
- **⚡ Secure by Default** - Rate limiting, CORS protection, SSRF prevention
- **🚀 Deploy Anywhere** - Render, Railway, or run locally
- **📦 Zero Maintenance** - Stateless, no database, no auth complexity

## 🏗️ Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │  HTTPS  │                  │  HTTPS  │                 │
│  Frontend (GH   │────────▶│  Backend Proxy   │────────▶│  LLM Providers  │
│  Pages/Local)   │         │  (This Service)  │         │  (OpenAI, etc)  │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
     User's Keys ────────────────────▶ Forwarded in Headers
```

**Key Principles:**
- **Open-Closed Principle**: Add new providers via config, not code changes
- **Single Responsibility**: Only proxies requests, nothing more
- **Zero Trust**: Never stores keys, validates all requests

## 🚀 Quick Start

### Local Development

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Start the server
npm start

# Server runs at http://localhost:3001
```

### Test the Server

```bash
# Health check
curl http://localhost:3001/health

# Get supported providers
curl http://localhost:3001/api/providers
```

## 📡 API Reference

### `GET /health`
Health check endpoint

**Response:**
```json
{
  "status": "ok",
  "service": "Samvada Studio Proxy",
  "version": "1.0.0",
  "uptime": 123.45,
  "timestamp": "2026-02-04T10:30:00.000Z"
}
```

### `GET /api/providers`
List supported LLM providers

**Response:**
```json
{
  "providers": [
    {
      "id": "openai",
      "baseUrl": "https://api.openai.com",
      "requiredHeaders": ["authorization"]
    },
    {
      "id": "anthropic",
      "baseUrl": "https://api.anthropic.com",
      "requiredHeaders": ["x-api-key", "anthropic-version"]
    }
  ]
}
```

### `POST /api/proxy`
Generic proxy endpoint for all providers

**Headers:**
- `X-Target-URL` (required): Full URL to proxy to
- `X-Provider` (optional): Provider ID for validation
- `Authorization`: API key (format varies by provider)
- Any provider-specific headers

**Example: OpenAI Request**
```bash
curl -X POST http://localhost:3001/api/proxy \
  -H "X-Target-URL: https://api.openai.com/v1/chat/completions" \
  -H "X-Provider: openai" \
  -H "Authorization: Bearer sk-..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

**Example: Anthropic Request**
```bash
curl -X POST http://localhost:3001/api/proxy \
  -H "X-Target-URL: https://api.anthropic.com/v1/messages" \
  -H "X-Provider: anthropic" \
  -H "x-api-key: sk-ant-..." \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 🔐 Security Features

### 1. **Rate Limiting**
- 60 requests/minute per IP in production
- 100 requests/minute in development
- Prevents abuse and DoS attacks

### 2. **CORS Protection**
Whitelisted origins:
- `http://localhost:5173` (Vite dev)
- `http://localhost:4173` (Vite preview)
- `https://dhruvinrsoni.github.io` (GitHub Pages)
- Custom domain via `FRONTEND_URL` env var

### 3. **SSRF Prevention**
Only allows requests to whitelisted domains:
- `api.openai.com`
- `api.anthropic.com`
- `generativelanguage.googleapis.com`
- `*.openai.azure.com`
- `localhost` (for Ollama)

### 4. **Request Validation**
- Max body size: 10MB
- URL format validation
- Domain whitelist enforcement

### 5. **Security Headers**
Uses `helmet` middleware for:
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security

## 🚀 Deployment

### Option 1: Render (Recommended)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

**Manual Setup:**
1. Create account at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment**: `NODE_ENV=production`
5. Click "Create Web Service"
6. Copy your service URL (e.g., `https://samvada-proxy.onrender.com`)

**Free Tier:**
- 750 hours/month
- Auto-sleep after 15min inactivity
- HTTPS included

### Option 2: Railway

**Manual Setup:**
1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repo
4. Railway auto-detects Node.js
5. Add environment variable: `NODE_ENV=production`
6. Get your URL from dashboard

**Free Tier:**
- $5 free credit/month (~500 hours)
- No auto-sleep
- HTTPS included

### Option 3: Self-Hosted (VPS/Docker)

**Docker Deployment:**
```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server.js ./
EXPOSE 3001
CMD ["node", "server.js"]
```

```bash
# Build and run
docker build -t samvada-proxy ./backend
docker run -p 3001:3001 -e NODE_ENV=production samvada-proxy
```

## 🔧 Adding New Providers

To add support for a new LLM provider, simply update the `PROVIDERS` config in `server.js`:

```javascript
const PROVIDERS = {
  // ... existing providers ...
  
  newprovider: {
    baseUrl: 'https://api.newprovider.com',
    requiredHeaders: ['authorization'],
    customHeaders: {
      'X-Custom-Header': 'value',
    },
  },
};
```

**That's it!** No code changes needed. This follows the **Open-Closed Principle**.

## 🧪 Testing

```bash
# Health check
npm start &
curl http://localhost:3001/health

# Test proxy (requires valid API key)
curl -X POST http://localhost:3001/api/proxy \
  -H "X-Target-URL: https://api.openai.com/v1/models" \
  -H "Authorization: Bearer YOUR_KEY"
```

## 📊 Monitoring

The server logs all requests:
```
[2026-02-04T10:30:00.000Z] PROXY POST → https://api.openai.com/v1/chat/completions
```

For production, consider adding:
- Log aggregation (Datadog, Logtail)
- Uptime monitoring (UptimeRobot, Better Uptime)
- Error tracking (Sentry)

## ⚠️ Important Notes

### API Key Security
- **Keys are NEVER stored** by this proxy
- Keys are forwarded from user's browser to LLM provider
- Users manage their own keys in the frontend
- This proxy is stateless - no database, no persistence

### Rate Limits
- This proxy has its own rate limits (60 req/min)
- Provider rate limits still apply (OpenAI, Anthropic tiers)
- Users are responsible for managing provider quotas

### Legal & Terms of Service
- Review each provider's TOS before use
- Some providers restrict proxy/resale usage
- Users are responsible for their API usage
- This proxy does not enable reselling API access

## 🐛 Troubleshooting

### CORS Errors
Make sure your frontend URL is in the `allowedOrigins` array. Add custom domains via `FRONTEND_URL` env var.

### Rate Limit Errors
Reduce request frequency or adjust `max` in the rate limiter config.

### SSRF Errors
Only whitelisted domains are allowed. Add new domains to `allowedDomains` array for legitimate use cases.

### Connection Errors
Check that the target provider URL is correct and the service is reachable.

## 📄 License

MIT - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:
1. Keep the codebase minimal and focused
2. Maintain SOLID principles
3. Add security tests for new features
4. Update documentation

## 📚 Related Documentation

- [Frontend Integration Guide](../docs/BACKEND_PROXY.md)
- [Security Best Practices](../SECURITY.md)
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md)
