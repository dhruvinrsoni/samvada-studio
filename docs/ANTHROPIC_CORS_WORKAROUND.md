# Anthropic API - CORS Workaround Guide

## The Problem

When using Anthropic (Claude) API directly from a browser application like Samvada Studio, you'll encounter a **CORS (Cross-Origin Resource Sharing) error**:

```
Failed to fetch
TypeError: Failed to fetch
```

This happens because Anthropic's API doesn't allow direct requests from browsers for security reasons. This is **not a bug** in Samvada Studio or a problem with your API key - it's an intentional security feature.

## Why This Happens

1. **Browser Security**: Browsers implement CORS policies to prevent malicious websites from accessing APIs
2. **API Design**: Anthropic (like most LLM APIs) expects requests to come from backend servers, not directly from browsers
3. **API Key Protection**: Direct browser access would expose your API key in network requests

## Solutions

### Option 1: CORS Proxy Browser Extension (⚡ Quick & Easy)

**Recommended for testing and personal use only**

Install a CORS proxy browser extension to temporarily bypass CORS restrictions:

- **Chrome/Edge**: [CORS Unblock](https://chrome.google.com/webstore/detail/cors-unblock/)
- **Firefox**: [CORS Everywhere](https://addons.mozilla.org/en-US/firefox/addon/cors-everywhere/)

⚠️ **Security Warning**: These extensions disable browser security features. Only use them for development/testing with trusted sites. Your API key may be exposed in network requests.

**How to use**:
1. Install the extension
2. Enable it (usually a click on the extension icon)
3. Refresh Samvada Studio
4. Test your Anthropic provider

### Option 2: Local Proxy Server (🔧 Developer-Friendly)

Run a local proxy server to forward requests:

**Using cors-anywhere (Node.js)**:
```bash
# Install
npm install -g cors-anywhere

# Run
cors-anywhere

# Update your Anthropic endpoint in Samvada Studio to:
http://localhost:8080/https://api.anthropic.com/v1/messages
```

**Using a simple Python proxy**:
```python
# proxy.py
from flask import Flask, request, Response
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/proxy', methods=['POST'])
def proxy():
    resp = requests.post(
        'https://api.anthropic.com/v1/messages',
        headers=dict(request.headers),
        data=request.data
    )
    return Response(resp.content, resp.status_code, resp.headers.items())

app.run(port=8080)
```

### Option 3: Backend API (🏢 Production-Ready)

Build a backend API to proxy requests (recommended for production):

**Express.js example**:
```javascript
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/anthropic', async (req, res) => {
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': req.headers['x-api-key'],
          'anthropic-version': req.headers['anthropic-version']
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data);
  }
});

app.listen(3000);
```

### Option 4: Use Alternative Providers (✅ No Workaround Needed)

These providers work directly from browsers without CORS issues:

- **OpenAI** - Works with proper CORS headers
- **Google Gemini** - Browser-friendly API
- **Ollama** - Local installation, no CORS issues
- **Azure OpenAI** - Configurable CORS policies

## Best Practices

1. **For Development**: Use CORS proxy extension temporarily
2. **For Production**: Always use a backend API proxy
3. **API Key Security**: 
   - Never expose API keys in frontend code
   - Use environment variables
   - Rotate keys regularly
4. **Consider Alternatives**: If CORS is a blocker, consider providers that support browser usage

## Understanding CORS

CORS errors indicate that:
- ✅ Your API key is probably fine
- ✅ Your network connection works
- ✅ Samvada Studio is working correctly
- ❌ The browser blocks the request for security

Learn more: [MDN Web Docs - CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## Error Messages You Might See

- `Failed to fetch`
- `TypeError: Failed to fetch`
- `NetworkError when attempting to fetch resource`
- `CORS policy: No 'Access-Control-Allow-Origin' header`

All of these indicate the same CORS issue.

## FAQ

**Q: Is this a bug in Samvada Studio?**  
A: No, it's a browser security feature. Anthropic's API is designed for server-to-server communication.

**Q: Will this be fixed in future updates?**  
A: No, this is an Anthropic API design decision, not something Samvada Studio can change.

**Q: Is my API key invalid?**  
A: Probably not. CORS errors happen before the API key is validated.

**Q: Can I use Anthropic in production?**  
A: Yes, but you need a backend proxy server. Never call LLM APIs directly from production frontends.

## Support

If you continue to have issues after trying these solutions:
1. Check the browser console for specific error messages
2. Verify your API key at [console.anthropic.com](https://console.anthropic.com)
3. Try a different provider (OpenAI, Google, Ollama) to verify Samvada Studio works
4. Open an issue on GitHub with details about your setup

---

💡 **Pro Tip**: For the best experience with Samvada Studio, use Ollama for local development and OpenAI/Google for cloud providers. Both work directly from browsers without CORS workarounds.
