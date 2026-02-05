# 🚀 Backend Proxy Deployment Guide

This guide explains how to deploy the Samvada Studio backend proxy to enable Anthropic and other providers that block direct browser access.

## 📋 Table of Contents

- [Quick Start (Local)](#quick-start-local)
- [Deploy to Render (Recommended)](#deploy-to-render-recommended)
- [Deploy to Railway](#deploy-to-railway)
- [Deploy to Fly.io](#deploy-to-flyio)
- [Connect Frontend](#connect-frontend)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+ installed
- Git installed

### Steps

```bash
# 1. Clone the repository (if not already)
git clone https://github.com/dhruvinrsoni/samvada-studio.git
cd samvada-studio

# 2. Install backend dependencies
cd backend
npm install

# 3. Start the backend server
npm start

# Backend runs at http://localhost:3001
```

### Test the Backend

```bash
# Health check
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","service":"Samvada Studio Proxy","version":"1.0.0",...}
```

### Start Frontend

Open a **new terminal**:

```bash
# Navigate to root directory
cd samvada-studio

# Start frontend
npm run dev

# Frontend runs at http://localhost:5173
```

The frontend will auto-discover the backend at `http://localhost:3001`.

---

## Deploy to Render (Recommended)

### Why Render?
- ✅ **750 hours/month free tier**
- ✅ **Zero config** - automatic HTTPS
- ✅ **GitHub integration** - auto-deploy on push
- ✅ **No credit card** required for free tier

### Steps

#### 1. Create Render Account
- Go to [render.com](https://render.com)
- Sign up with GitHub

#### 2. Create New Web Service
- Click **"New +"** → **"Web Service"**
- Connect your GitHub account
- Select `samvada-studio` repository

#### 3. Configure Service

**Basic Settings:**
- **Name**: `samvada-backend-proxy` (or your choice)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `backend`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Advanced Settings:**
- **Instance Type**: Free
- **Auto-Deploy**: Yes (recommended)

**Environment Variables:**
```
NODE_ENV=production
FRONTEND_URL=https://dhruvinrsoni.github.io
```

#### 4. Deploy
- Click **"Create Web Service"**
- Wait 2-3 minutes for deployment
- Copy your service URL (e.g., `https://samvada-backend-proxy.onrender.com`)

#### 5. Connect Frontend
- Open Samvada Studio frontend
- Go to **Admin Settings** → **Settings tab**
- Paste backend URL in "Custom Backend URL"
- Click **Save**
- Click **Recheck** to verify connection

### Auto-Deploy on GitHub Push

Render automatically deploys when you push to the `main` branch:

```bash
git add backend/
git commit -m "Update backend"
git push origin main
# Render auto-deploys in ~2 minutes
```

---

## Deploy to Railway

### Why Railway?
- ✅ **$5 free credit/month** (~500 hours)
- ✅ **No auto-sleep** (unlike Render free tier)
- ✅ **Simpler dashboard**

### Steps

#### 1. Create Railway Account
- Go to [railway.app](https://railway.app)
- Sign up with GitHub

#### 2. Create New Project
- Click **"New Project"**
- Select **"Deploy from GitHub repo"**
- Choose `samvada-studio` repository

#### 3. Configure

Railway auto-detects Node.js. Add these settings:

**Environment Variables:**
```
NODE_ENV=production
FRONTEND_URL=https://dhruvinrsoni.github.io
```

**Root Directory** (if Railway doesn't auto-detect):
- Go to **Settings** → **Service**
- Set **Root Directory**: `backend`

**Start Command:**
```
npm start
```

#### 4. Get Your URL
- Go to **Settings** → **Networking**
- Click **Generate Domain**
- Copy your URL (e.g., `https://samvada-backend-proxy.up.railway.app`)

#### 5. Connect Frontend
- Open Samvada Studio
- Admin Settings → Settings → Backend Proxy
- Enter Railway URL and click **Save**

---

## Deploy to Fly.io

### Why Fly.io?
- ✅ **3 free shared-CPU VMs**
- ✅ **Global edge network**
- ✅ **CLI-based deployment**

### Prerequisites
```bash
# Install Fly CLI
# Windows (PowerShell)
irm https://fly.io/install.ps1 | iex

# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Login
fly auth login
```

### Steps

#### 1. Create `fly.toml` in backend folder

```toml
# backend/fly.toml
app = "samvada-backend-proxy"
primary_region = "iad"

[build]
  [build.args]
    NODE_VERSION = "18"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[[services]]
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[[services.tcp_checks]]
  interval = "15s"
  timeout = "2s"
  grace_period = "5s"
  restart_limit = 0
```

#### 2. Deploy

```bash
cd backend
fly launch --copy-config --yes
fly deploy
```

#### 3. Get URL

```bash
fly info
# Look for "Hostname" in output
```

---

## Connect Frontend

### Auto-Discovery (Local Only)

When running locally, the frontend automatically tries to discover the backend at:
- `http://localhost:3001`
- `http://127.0.0.1:3001`
- `http://localhost:3000`

### Manual Configuration

1. Open Samvada Studio
2. Click **⚙️ Admin Settings**
3. Go to **Settings** tab
4. Find **🔐 Backend Proxy** section
5. Enter your backend URL:
   - Local: `http://localhost:3001`
   - Render: `https://your-app.onrender.com`
   - Railway: `https://your-app.up.railway.app`
   - Fly: `https://your-app.fly.dev`
6. Click **Save**
7. Verify green ✅ status

### Test Connection

The UI will show:
- ✅ **Backend Connected** - Working correctly
- 🔍 **Checking Backend...** - Testing connection
- ❌ **Backend Not Available** - Connection failed

---

## Troubleshooting

### Issue: "Backend Not Available"

**Check 1: Backend is Running**
```bash
# For local backend
curl http://localhost:3001/health

# For deployed backend
curl https://your-app.onrender.com/health
```

Expected response:
```json
{"status":"ok","service":"Samvada Studio Proxy","version":"1.0.0",...}
```

**Check 2: Correct URL**
- Ensure no trailing slash: ✅ `https://app.com` ❌ `https://app.com/`
- Include protocol: ✅ `https://` ❌ `app.com`

**Check 3: CORS Settings**
The backend allows these origins by default:
- `http://localhost:5173` (Vite dev)
- `http://localhost:4173` (Vite preview)
- `https://dhruvinrsoni.github.io` (GitHub Pages)

If using a custom domain, add to backend's `server.js`:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://dhruvinrsoni.github.io',
  'https://your-custom-domain.com',  // Add your domain
  process.env.FRONTEND_URL,
].filter(Boolean);
```

### Issue: "Too Many Requests"

The backend has rate limiting (60 requests/minute). If you hit this:
- Wait 1 minute
- For development, edit `backend/server.js`:
  ```javascript
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: NODE_ENV === 'development' ? 100 : 60,  // Increase this
  });
  ```

### Issue: Anthropic Still Not Working

1. **Verify backend proxy is active** (check green ✅ in Admin Settings)
2. **Check Anthropic API key** is correct
3. **Test manually**:
   ```bash
   curl -X POST https://your-backend.onrender.com/api/proxy \
     -H "X-Target-URL: https://api.anthropic.com/v1/messages" \
     -H "X-Provider: anthropic" \
     -H "x-api-key: YOUR_ANTHROPIC_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "Content-Type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
   ```

### Issue: Render Free Tier Sleeps

Render's free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

**Solutions:**
1. **Upgrade to paid tier** ($7/month) - no sleep
2. **Use Railway** ($5 credit/month) - no sleep
3. **Keep-alive ping** - Add to your app:
   ```javascript
   // Ping backend every 10 minutes to prevent sleep
   setInterval(async () => {
     try {
       await fetch('https://your-backend.onrender.com/health');
     } catch {}
   }, 10 * 60 * 1000);
   ```

### Issue: Backend Logs Show Errors

**View Logs:**

**Render:**
- Dashboard → Your Service → Logs tab

**Railway:**
- Dashboard → Your Service → Deployments → View Logs

**Fly:**
```bash
fly logs
```

**Local:**
Backend logs appear in your terminal where you ran `npm start`.

---

## Security Best Practices

### 1. API Keys
- **Never commit API keys** to git
- **Backend does NOT store keys** - they're passed through from browser
- **Users control their own keys** (BYOK - Bring Your Own Keys)

### 2. Rate Limiting
The backend enforces:
- 60 requests/minute per IP (production)
- 100 requests/minute (development)

### 3. Domain Whitelist
Only allows proxying to:
- `api.openai.com`
- `api.anthropic.com`
- `generativelanguage.googleapis.com`
- `*.openai.azure.com`
- `localhost` (for Ollama)

### 4. Request Size Limits
- Maximum body size: 10MB
- Prevents memory exhaustion attacks

### 5. CORS Protection
- Only whitelisted frontend origins allowed
- Custom domains must be added to backend config

---

## Monitoring & Maintenance

### Health Checks

**Render:**
- Automatically monitors `/health` endpoint
- Restarts on 3 consecutive failures

**Railway:**
- Add health check in Settings → Health Check
- Path: `/health`

**Fly:**
- Configured in `fly.toml` (see tcp_checks section)

### Uptime Monitoring (Optional)

Use external services to monitor your backend:
- [UptimeRobot](https://uptimerobot.com) - Free, 5-minute checks
- [Better Uptime](https://betteruptime.com) - Free tier, 3-minute checks
- [Pingdom](https://pingdom.com) - Paid

Example:
- Monitor URL: `https://your-backend.onrender.com/health`
- Expected keyword: `"status":"ok"`
- Check interval: 5 minutes

---

## Cost Breakdown

### Render
- **Free Tier**: 750 hours/month (31.25 days) - enough for 1 instance
- **Paid Tier**: $7/month - no sleep, faster, more instances

### Railway
- **Free**: $5 credit/month (~500 hours)
- **Pay-as-you-go**: ~$0.01/hour after credit

### Fly.io
- **Free**: 3 shared-CPU VMs (256MB RAM each)
- **Paid**: From $1.94/month (dedicated CPU)

**Recommendation:**
- **Development**: Local (`npm start`) - $0
- **Production (low traffic)**: Render free tier - $0
- **Production (always-on)**: Railway - $0-5/month or Render paid - $7/month

---

## Need Help?

- **GitHub Issues**: [github.com/dhruvinrsoni/samvada-studio/issues](https://github.com/dhruvinrsoni/samvada-studio/issues)
- **Documentation**: [github.com/dhruvinrsoni/samvada-studio#readme](https://github.com/dhruvinrsoni/samvada-studio#readme)

---

## Next Steps

After deploying:

1. ✅ **Test with Anthropic** - Verify Claude models work
2. ✅ **Test with OpenAI** - Ensure GPT models work through proxy
3. ✅ **Monitor logs** - Check for errors or abuse
4. ✅ **Set up alerts** - Use UptimeRobot or similar
5. ✅ **Share with users** - Provide backend URL for self-hosting

Happy deploying! 🚀
