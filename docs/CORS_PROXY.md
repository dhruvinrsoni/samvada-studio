# CORS Proxy Guide - OpenAI & Anthropic Support

> 📖 **TL;DR**: OpenAI and Anthropic APIs don't work directly in browsers due to CORS restrictions. You need a proxy server to use them.

## 🚨 The Problem: Why This Exists

**Browser Security Policy Blocks Direct API Calls**

When you try to call OpenAI or Anthropic APIs directly from a browser-based app like Samvada Studio, the browser blocks the request with a CORS error:

```
Access to fetch at 'https://api.openai.com/v1/chat/completions' from origin 'http://localhost:5173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present.
```

**Why does this happen?**

1. **Browser Security**: Browsers enforce [CORS (Cross-Origin Resource Sharing)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) to protect users
2. **API Server Restrictions**: OpenAI and Anthropic intentionally don't include CORS headers to prevent browser-based apps from exposing API keys
3. **Server-Side Only**: These APIs are designed to be called from backend servers, not frontend JavaScript

**Which providers are affected?**

| Provider | Direct Browser Support | Proxy Required |
|----------|----------------------|----------------|
| 🤖 OpenAI | ❌ No | ✅ Yes |
| 🧠 Anthropic | ❌ No | ✅ Yes |
| ✨ Google Gemini | ✅ Yes | ❌ No |
| 🦙 Ollama (Local) | ✅ Yes* | ❌ No |
| ☁️ Azure OpenAI | ❌ No | ✅ Yes |

*Ollama requires [Local Network Access](LOCAL_NETWORK_ACCESS.md) permission but no CORS proxy.

---

## 📍 Hosted vs Local Deployment

### 🌐 Using the Hosted Version (GitHub Pages)

**URL**: [https://dhruvinrsoni.github.io/samvada-studio/](https://dhruvinrsoni.github.io/samvada-studio/)

**Limitations**:
- ❌ **Cannot use local CORS proxy** (browser blocks localhost access from remote origins)
- ❌ **Cannot use Ollama** (local servers not accessible)
- ✅ **Can use Google Gemini** (works directly in browser)
- ⚠️ **OpenAI/Anthropic require cloud proxy** (Cloudflare Worker, etc.)

**Recommended Approach for Hosted Version**:
1. Use **Google Gemini** (no proxy needed)
2. OR deploy a **Cloudflare Worker** (free tier available)
3. OR run the app **locally** for full feature access

### 💻 Running Locally

**Setup**: Clone repo and run `npm run dev`

**Advantages**:
- ✅ Full access to all providers
- ✅ Can use local CORS proxy
- ✅ Can use Ollama and local LLMs
- ✅ No cloud services required

**This guide focuses on local deployment.**

---

## 🚀 Quick Start (Local Deployment)

---

## 🚀 Quick Start (Local Deployment)

> ⚠️ **IMPORTANT**: The proxy server is **separate** from the Samvada Studio app!
> 
> You need **TWO terminals running simultaneously**:
> - Terminal 1: `npm run proxy` (CORS proxy)
> - Terminal 2: `npm run dev` (Samvada Studio app)
> 
> The proxy is a background service that routes API calls. It does NOT open the app.

### Step 1: Start BOTH Servers

**Terminal 1 - CORS Proxy:**
```bash
npm run proxy
```
✅ Runs on `http://localhost:8080` (background service)

**For corporate networks with SSL inspection (Zscaler, Palo Alto, etc.):**
```bash
npm run proxy:insecure
```
⚠️ Disables SSL certificate verification (development only)

**Terminal 2 - Samvada Studio App:**
```bash
npm run dev
```
✅ Opens the app at `http://localhost:5173`

> 💡 **Tip**: Keep both terminals open while using Samvada Studio

**Custom Proxy Port:**
```bash
node cors-proxy-server.js 3001
node cors-proxy-server.js 3001 --insecure
```

### Step 2: Configure Provider in Samvada Studio

1. Open **Admin Settings** (⚙️ icon in bottom-right)
2. Go to **Providers** tab
3. Select or add your **OpenAI** or **Anthropic** provider
4. You'll see a yellow warning: **⚡ Proxy Required**
5. Click **🔧 Advanced Settings** to expand
6. Enter proxy URL: `http://localhost:8080`
7. Click **Test Connection** to verify
8. Click **Save Provider**

### Step 3: Start Chatting! 🎉

The proxy will automatically route all OpenAI/Anthropic requests through `localhost:8080`.

---

## 🔍 How It Works (Technical Details)

### The CORS Problem

**Without Proxy (❌ Blocked):**
```
Browser (http://localhost:5173)
  |
  ├─→ https://api.openai.com/v1/chat/completions
  |
  ❌ CORS Error: "No 'Access-Control-Allow-Origin' header"
  |
  Browser blocks response
```

**With Proxy (✅ Works):**
```
Browser (http://localhost:5173)
  |
  ├─→ http://localhost:8080/https://api.openai.com/v1/chat/completions
  |     |
  |     └─→ https://api.openai.com/v1/chat/completions (forwarded)
  |          |
  |          ← Response from OpenAI API
  |     |
  |     ← Proxy adds CORS headers
  |
  ✅ Browser receives response
```

### What the Proxy Does

1. **Receives Request**: Browser sends request to `http://localhost:8080/TARGET_URL`
2. **Extracts Target**: Proxy extracts the target URL (OpenAI/Anthropic endpoint)
3. **Forwards Request**: Proxy makes the actual API call with your API key
4. **Adds CORS Headers**: Proxy injects `Access-Control-Allow-Origin: *` and other CORS headers
5. **Returns Response**: Browser receives the response (CORS headers satisfy browser security)

### Code Example (Proxy Server)

```javascript
// cors-proxy-server.js (simplified)
const http = require('http');
const https = require('https');

const server = http.createServer((req, res) => {
  // Extract target URL from request path
  const targetUrl = req.url.substring(1); // Remove leading '/'
  
  // Forward request to target API
  https.get(targetUrl, { headers: req.headers }, (apiRes) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    // Forward response back to browser
    apiRes.pipe(res);
  });
});

server.listen(8080);
```

---

## 🏢 Corporate Networks & SSL Inspection

### The SSL Certificate Problem

Many corporate networks use **SSL inspection** (also called SSL interception or MITM - Man-in-the-Middle):

**How it works:**
1. Corporate firewall (Zscaler, Palo Alto, etc.) intercepts HTTPS requests
2. Replaces the original SSL certificate with a corporate certificate
3. This breaks Node.js certificate validation

**Error you'll see:**
```
Error: unable to verify the first certificate
Code: UNABLE_TO_VERIFY_LEAF_SIGNATURE
```

### Solution: Use `--insecure` Flag

```bash
npm run proxy:insecure
```

This runs: `node cors-proxy-server.js --insecure`

**What it does:**
- Sets `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Disables SSL certificate verification
- Allows proxy to work with corporate certificates

**⚠️ Security Note:**
- Only use this in development environments
- Never use in production
- Only necessary if you're behind corporate SSL inspection

---

## ☁️ Alternative: Cloudflare Workers (Production/Hosted)

## ☁️ Alternative: Cloudflare Workers (Production/Hosted)

If you're using the hosted version or don't want to run a local server, deploy a Cloudflare Worker:

### Why Cloudflare Workers?

- ✅ **Free Tier**: 100,000 requests/day on free plan
- ✅ **Global CDN**: Fast response times worldwide
- ✅ **No Server Maintenance**: Serverless, fully managed
- ✅ **HTTPS Built-in**: Secure by default
- ✅ **Works with Hosted Apps**: Perfect for GitHub Pages deployment

### Setup Instructions

1. **Sign up**: [workers.cloudflare.com](https://workers.cloudflare.com)
2. **Create Worker**: Click "Create a Service"
3. **Paste Code**: Copy the worker code below
4. **Deploy**: Click "Save and Deploy"
5. **Get URL**: Copy your worker URL (e.g., `https://my-proxy.username.workers.dev`)
6. **Configure in Samvada**: Use this URL as your CORS Proxy URL

### Cloudflare Worker Code

```javascript
// CORS Proxy Worker for Samvada Studio
// Supports OpenAI and Anthropic APIs

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    })
  }

  // Extract target URL from path
  const url = new URL(request.url)
  const targetUrl = url.pathname.substring(1) // Remove leading '/'

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return new Response('Invalid target URL', { status: 400 })
  }

  // Forward request to target API
  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body
  })

  try {
    const response = await fetch(modifiedRequest)
    const modifiedResponse = new Response(response.body, response)

    // Add CORS headers
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*')
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    modifiedResponse.headers.set('Access-Control-Allow-Headers', '*')

    return modifiedResponse
  } catch (error) {
    return new Response(`Proxy error: ${error.message}`, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}
```

### Usage in Samvada Studio

1. Configure your OpenAI/Anthropic provider
2. In **Advanced Settings**, enter: `https://my-proxy.username.workers.dev`
3. Test and save

---

## 🔒 Security Considerations

### Local Proxy Security

**✅ Safe for Development:**
- Proxy runs on localhost only
- Not accessible from internet
- API keys transmitted over HTTPS to actual APIs
- Proxy doesn't log or store data

**⚠️ Never Expose Publicly:**
- Don't open port 8080 to internet
- Don't deploy this proxy to public servers
- No authentication mechanism built-in

### Cloudflare Worker Security

**✅ Production-Ready:**
- HTTPS only
- Global CDN with DDoS protection
- No API key storage (keys in headers)
- Cloudflare's security infrastructure

**⚠️ Rate Limiting:**
- Free tier: 100,000 requests/day
- Consider rate limiting for production use
- Monitor usage in Cloudflare dashboard

### API Key Safety

**Your API keys are safe:**
1. Stored locally in browser (localStorage)
2. Transmitted over HTTPS to proxy
3. Proxy forwards over HTTPS to API
4. Proxy doesn't log or store keys

**Best practices:**
- Use environment variables for API keys (if building your own)
- Rotate keys periodically
- Monitor API usage in provider dashboards
- Use separate keys for dev/prod

---

## 🐛 Troubleshooting

### Issue: "EADDRINUSE: Port 8080 already in use"

**Solution 1: Kill existing process**
```bash
# Windows
netstat -ano | findstr :8080
taskkill /F /PID <PID>

# macOS/Linux
lsof -ti :8080 | xargs kill -9
```

**Solution 2: Use different port**
```bash
node cors-proxy-server.js 8081
```

### Issue: "unable to verify the first certificate"

**Cause**: Corporate SSL inspection

**Solution**: Use insecure mode
```bash
npm run proxy:insecure
```

### Issue: "CORS error" even with proxy

**Check:**
1. Is proxy server running? Check terminal output
2. Is proxy URL correct in provider settings? Should be `http://localhost:8080`
3. Is the app using the proxy? Check browser DevTools → Network tab
4. Try restarting both proxy and app

### Issue: Requests timing out

**Possible causes:**
1. Firewall blocking proxy connections
2. Corporate network restrictions
3. API endpoint unreachable

**Debug steps:**
```bash
# Test proxy directly with curl
curl -v http://localhost:8080/https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Issue: Cloudflare Worker not working

**Check:**
1. Worker deployed and running? Check Cloudflare dashboard
2. Correct worker URL in Samvada settings?
3. Check worker logs for errors
4. Test worker directly:
   ```bash
   curl https://your-worker.workers.dev/https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

---

## 📚 Additional Resources

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Anthropic API Reference](https://docs.anthropic.com/claude/reference)

---

## ❓ FAQ

### Q: Why not use a browser extension?

Browser extensions can modify CORS headers, but they:
- Require installation and permissions
- Don't work on all browsers
- Can be blocked by enterprise policies
- Are less reliable than proxy solutions

### Q: Can I use this proxy for other APIs?

Yes! The proxy works with any API that has CORS restrictions. Just change the target URL.

### Q: Does this work with OpenAI's new models?

Yes! The proxy is model-agnostic. It forwards all requests/responses without modification.

### Q: What about Azure OpenAI?

Azure OpenAI also requires CORS proxy. Use the same setup with your Azure endpoint.

### Q: Can I self-host a proxy on my own server?

Yes! Deploy `cors-proxy-server.js` to any Node.js hosting (Heroku, Railway, etc.). Add authentication for security.

### Q: Why not use a reverse proxy like Nginx?

You can! Nginx is great for production. This proxy is simpler for local development.

---

## 🎯 Summary

| Scenario | Best Solution |
|----------|--------------|
| **Local Development** | Use `npm run proxy:insecure` |
| **Hosted App (GitHub Pages)** | Deploy Cloudflare Worker |
| **Corporate Network** | Use `--insecure` flag |
| **Production App** | Cloudflare Worker + rate limiting |
| **No Proxy Needed** | Use Google Gemini or Ollama |

---

**Need help?** Open an issue on [GitHub](https://github.com/dhruvinrsoni/samvada-studio/issues)
- For production apps, use a proper backend API

## Troubleshooting

### "unable to get local issuer certificate"

**Problem:** Your company uses SSL inspection (Zscaler, Palo Alto, etc.) which replaces SSL certificates.

**Solution:** Use the insecure mode:
```bash
npm run proxy:insecure
```

Or manually:
```bash
node cors-proxy-server.js --insecure
```

This disables SSL certificate verification. ⚠️ **Use only on trusted corporate networks.**

### Port already in use
```bash
node cors-proxy-server.js 3001  # Use different port
```

### Can't connect from browser
- Ensure the proxy is running (check terminal output)
- Verify the proxy URL in Samvada Studio matches the server
- Check firewall isn't blocking port 8080

### Still getting CORS errors
- Click TEST in Samvada Studio to verify configuration
- Check browser console for error details
- Ensure proxy URL doesn't have trailing slash

## Advanced Usage

### Environment variable for port
```bash
PORT=3001 npm run proxy
```

### Run proxy and app together (Required!)

**You MUST run both commands in separate terminals:**

**Terminal 1 - CORS Proxy Server:**
```bash
npm run proxy
```
✓ Proxy running at http://localhost:8080

**Terminal 2 - Samvada Studio:**
```bash
npm run dev
```
✓ App running at http://localhost:5173

Now open http://localhost:5173 in your browser!

### Network access (other devices)

The server prints your local IP on startup. Use it from other devices:
```
http://192.168.1.100:8080
```

Then configure the provider with your computer's local IP instead of `localhost`.

## Comparison: Local vs Cloud Proxy

| Feature | Local Proxy | Cloudflare Worker |
|---------|-------------|-------------------|
| Setup | Run `npm run proxy` | Deploy to Cloudflare |
| Cost | Free | Free (generous limits) |
| Speed | Instant | ~50-100ms latency |
| Availability | Only when server running | Always available |
| Network | Localhost only* | Accessible anywhere |
| Best for | Development | Production/public apps |

*Can be accessed on local network using your computer's IP

## Need Help?

- **CORS Proxy not working?** Check the TEST button output in provider settings
- **502 Bad Gateway?** Verify your API endpoint is correct
- **Connection refused?** Ensure the proxy server is running

---

**Made with ❤️ for Samvada Studio**
