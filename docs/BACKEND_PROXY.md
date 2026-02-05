# Backend Proxy - Quick Reference

## 🎯 What Problem Does It Solve?

**Problem**: OpenAI, Anthropic, and Azure APIs block direct browser requests (CORS policy) for security.

**Solution**: A lightweight backend proxy that forwards your requests with proper headers.

## 🏗️ Architecture

```
┌─────────────┐        ┌──────────────────┐        ┌──────────────┐
│   Browser   │───────▶│  Backend Proxy   │───────▶│  OpenAI API  │
│ (Your Keys) │ HTTPS  │  (Zero Storage)  │ HTTPS  │              │
└─────────────┘        └──────────────────┘        └──────────────┘
```

**Key Points**:
- ✅ Your API keys stay in browser (BYOK - Bring Your Own Keys)
- ✅ Backend never stores keys
- ✅ Proxy just forwards requests + adds CORS headers
- ✅ Works for OpenAI, Anthropic, Google, Azure, Ollama

## 🚀 Setup (2 Options)

### Option 1: Local Development (Easiest)

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```
   Backend runs on: `http://localhost:3001`

2. **Configure Frontend**:
   - Open Admin Panel → Settings → Backend Proxy
   - Should auto-discover `http://localhost:3001`
   - If not, enter manually

3. **Test**:
   - Add OpenAI provider with your API key
   - Click "🔌 Test" button
   - Should connect successfully via proxy

### Option 2: Production Deployment (GitHub Pages)

When deploying to GitHub Pages, you need to host the backend separately:

#### Deploy Backend (Choose One):

**A) Render (Recommended - Free)**
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect your GitHub repo
4. Set:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Environment: Add `FRONTEND_URL=https://yourusername.github.io`
5. Deploy (takes ~2 min)
6. Copy your URL: `https://your-app.onrender.com`

**B) Railway**
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select `backend` folder
4. Deploy
5. Copy your URL

**C) Fly.io**
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run: `cd backend && fly launch`
3. Deploy: `fly deploy`

#### Configure Frontend:
1. In Admin Panel → Settings → Backend Proxy
2. Enter your backend URL: `https://your-app.onrender.com`
3. Test connection

## 🔒 Security Features

- **Rate Limiting**: 60 requests/minute (production)
- **CORS Whitelist**: Only your domains allowed
- **SSRF Protection**: Only whitelisted API domains
- **Zero Key Storage**: Keys never leave browser
- **Request Size Limit**: 10MB max
- **Security Headers**: Helmet.js protection

## 🧪 How to Test

### Test Backend Health:
```bash
curl http://localhost:3001/health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-05T03:54:08.811Z",
  "version": "1.0.0"
}
```

### Test Proxy Manually:
```bash
curl -X POST http://localhost:3001/api/proxy \
  -H "Content-Type: application/json" \
  -H "X-Target-URL: https://api.openai.com/v1/chat/completions" \
  -H "X-Provider: openai" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }'
```

## 🐛 Troubleshooting

### "Socket hang up" Error

**Cause**: Missing Content-Type header or invalid API key

**Fix**: 
1. Restart backend (fixed in latest version)
2. Check API key is correct
3. Verify endpoint URL: `https://api.openai.com/v1/chat/completions`

### "CORS policy violation"

**Cause**: Frontend URL not whitelisted

**Fix**: Add your URL to `allowedOrigins` in `backend/server.js`:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://yourusername.github.io',  // Add your domain here
];
```

### Provider Shows "Failed" Status

**Cause**: Old provider config created before backend proxy was added

**Fix**: 
1. Delete old provider
2. Add new provider with same settings
3. Test connection

## 📊 Cost Comparison

### Without Backend Proxy:
- ❌ Can't use OpenAI on GitHub Pages
- ❌ Can't use Anthropic at all
- ✅ Google Gemini works (no CORS restrictions)

### With Backend Proxy:
- ✅ All providers work everywhere
- 💰 **Cost**: $0 (free tiers available)
- ⚡ **Latency**: +10-50ms (negligible)
- 🔒 **Security**: Better (SSRF protection)

## 🎓 How It Works (Technical)

1. **Browser makes request** to OpenAI:
   ```typescript
   fetch('https://api.openai.com/v1/chat/completions', {
     method: 'POST',
     headers: { 'Authorization': 'Bearer sk-...' },
     body: JSON.stringify({ model: 'gpt-4', ... })
   })
   ```
   ❌ **Blocked by CORS**

2. **With Backend Proxy**:
   ```typescript
   fetch('http://localhost:3001/api/proxy', {
     method: 'POST',
     headers: { 
       'X-Target-URL': 'https://api.openai.com/v1/chat/completions',
       'X-Provider': 'openai',
       'Authorization': 'Bearer sk-...'
     },
     body: JSON.stringify({ model: 'gpt-4', ... })
   })
   ```
   ✅ **Works!**

3. **Backend forwards request** with proper headers:
   ```javascript
   https.request({
     hostname: 'api.openai.com',
     path: '/v1/chat/completions',
     headers: {
       'Authorization': 'Bearer sk-...',
       'Content-Type': 'application/json'
     }
   })
   ```

4. **Backend streams response** back to browser:
   ```javascript
   proxyRes.pipe(res);  // Stream response
   ```

## 📝 Environment Variables

Create `backend/.env`:
```bash
PORT=3001                              # Backend port
NODE_ENV=production                    # Environment
FRONTEND_URL=https://your-site.com     # Your frontend URL
```

## 🔧 Advanced Configuration

### Custom CORS Domains
Edit `backend/server.js`:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://yourusername.github.io',
  'https://custom-domain.com',  // Add more here
];
```

### Add New Provider
Edit `backend/server.js`:
```javascript
const PROVIDERS = {
  openai: { baseUrl: 'https://api.openai.com', ... },
  myCustomProvider: {  // Add new provider
    baseUrl: 'https://api.custom.com',
    requiredHeaders: ['authorization'],
    customHeaders: { 'X-Custom-Header': 'value' },
  },
};
```

### Increase Rate Limit
Edit `backend/server.js`:
```javascript
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,  // Change this (default: 60)
});
```

## 📚 Related Docs

- [CORS Proxy Setup](./CORS_PROXY.md)
- [Backend README](../backend/README.md)
- [Deployment Guide](./DEPLOYMENT.md)

## ❓ FAQ

**Q: Is my API key safe?**  
A: Yes! Keys stay in browser, backend never stores them.

**Q: Can I use one backend for multiple frontends?**  
A: Yes! Add all frontend URLs to `allowedOrigins`.

**Q: Does it work with custom OpenAI endpoints?**  
A: Yes! Just set the endpoint in provider config.

**Q: What's the difference from Cloudflare Worker?**  
A: Similar function, but backend proxy has rate limiting, logging, and zero config for multiple providers.

**Q: Can I run backend on same domain as frontend?**  
A: Not on GitHub Pages (static hosting). Need separate backend hosting.

---

**Need Help?** Open an issue: https://github.com/dhruvinrsoni/samvada-studio/issues
