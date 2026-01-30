# Local CORS Proxy Server

> ⚠️ **IMPORTANT**: The proxy server is **separate** from the Samvada Studio app!
> 
> You need **TWO terminals running simultaneously**:
> - Terminal 1: `npm run proxy` (CORS proxy - this file)
> - Terminal 2: `npm run dev` (Samvada Studio app)
> 
> The proxy doesn't open the app - it's a background service that routes API calls.

## What is this?

A lightweight Node.js proxy server that solves CORS (Cross-Origin Resource Sharing) issues when using OpenAI and Anthropic APIs from the browser.

## Why do I need this?

**OpenAI and Anthropic APIs block direct browser requests** for security reasons. Their servers don't include the `Access-Control-Allow-Origin` header, causing browsers to block the response.

This proxy server:
- Runs locally on your machine
- Forwards API requests to OpenAI/Anthropic
- Adds CORS headers to responses
- Allows the browser to receive the API responses

## Quick Start

### 1. Start BOTH servers

**Terminal 1 - CORS Proxy:**
```bash
npm run proxy
```
This runs on `http://localhost:8080` (does NOT open the app)

**Terminal 2 - Samvada Studio App:**
```bash
npm run dev
```
This opens the app at `http://localhost:5173`

> 💡 **Tip**: Keep both terminals open while using Samvada Studio

To use a custom proxy port:
```bash
node cors-proxy-server.js 3001
```

### 2. Configure Samvada Studio

1. Open **Admin Settings** (⚙️ icon)
2. Select your OpenAI or Anthropic provider
3. Click **Advanced Settings** (🔧)
4. Enter: `http://localhost:8080` in **CORS Proxy URL**
5. Click **TEST** to verify it works
6. Save the provider

### 3. Use OpenAI/Anthropic normally

The proxy will automatically route all requests through `localhost:8080`.

## How it works

When you send a message:

**Without Proxy:**
```
Browser → https://api.openai.com/v1/chat/completions
         ❌ CORS Error (blocked by browser)
```

**With Proxy:**
```
Browser → http://localhost:8080/https://api.openai.com/v1/chat/completions
         → OpenAI API
         ← Response with CORS headers
         ← Browser receives response ✅
```

## Alternative: Cloudflare Worker

If you don't want to run a local server, deploy a Cloudflare Worker instead:

1. Go to [workers.cloudflare.com](https://workers.cloudflare.com)
2. Create a new Worker
3. Paste the code from **Advanced Settings** in the provider form
4. Deploy and use the Worker URL as your proxy

## Security Notes

⚠️ **This proxy is for development/personal use only**

- API keys are still sent through HTTPS to OpenAI/Anthropic
- The proxy only adds CORS headers, it doesn't store or log your data
- Never expose this proxy publicly (no authentication)
- For production apps, use a proper backend API

## Troubleshooting

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
