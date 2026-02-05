# 🚀 Quick Start: Enable Anthropic & OpenAI on GitHub Pages

This guide shows you how to enable Anthropic (Claude) and OpenAI (ChatGPT) on the hosted version of Samvada Studio using the new backend proxy.

## What You'll Need

- **5 minutes** of your time
- **Node.js 18+** installed (for local backend)
- **OR** a free account on [Render](https://render.com) or [Railway](https://railway.app) (for hosted backend)

---

## Option 1: Local Backend (Fastest)

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/dhruvinrsoni/samvada-studio.git
cd samvada-studio

# Install backend dependencies
cd backend
npm install
```

### Step 2: Start Backend

```bash
# Start the backend server
npm start

# You should see:
# ✅ Server: http://localhost:3001
```

### Step 3: Connect Frontend

1. Open [Samvada Studio](https://dhruvinrsoni.github.io/samvada-studio/)
2. Click **⚙️ Admin Settings** (top right)
3. Go to **Settings** tab
4. Scroll to **🔐 Backend Proxy** section
5. Click **Recheck** (it should auto-discover `localhost:3001`)
6. You should see: ✅ **Backend Connected**

### Step 4: Add Provider

1. In Admin Settings, go to **Providers** tab
2. Click **➕ Add Provider**
3. Select **Anthropic** (or OpenAI)
4. Enter your API key
5. Click **Save**

### Step 5: Test

1. Close Admin Settings
2. Click **New Chat**
3. Select your Anthropic/OpenAI provider
4. Send a message: "Hello!"
5. 🎉 It works!

---

## Option 2: Hosted Backend (Recommended for Production)

### Deploy to Render (Free)

#### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub

#### Step 2: Deploy Backend

1. Click **New +** → **Web Service**
2. Connect your GitHub account
3. Select `samvada-studio` repository
4. Configure:
   - **Name**: `samvada-backend-proxy`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variable:
   - **Key**: `NODE_ENV`
   - **Value**: `production`
6. Click **Create Web Service**
7. Wait 2-3 minutes for deployment
8. Copy your URL (e.g., `https://samvada-backend-proxy.onrender.com`)

#### Step 3: Connect Frontend

1. Open [Samvada Studio](https://dhruvinrsoni.github.io/samvada-studio/)
2. Click **⚙️ Admin Settings**
3. Go to **Settings** tab
4. Scroll to **🔐 Backend Proxy**
5. Paste your Render URL in "Custom Backend URL"
6. Click **Save**
7. Click **Recheck**
8. You should see: ✅ **Backend Connected**

#### Step 4: Add Provider & Test

Same as Option 1, Steps 4-5.

---

## Troubleshooting

### Backend Not Available

**Local Backend:**
```bash
# Make sure backend is running
cd backend
npm start

# Check health
curl http://localhost:3001/health
```

**Hosted Backend:**
- Check Render/Railway dashboard for errors
- Make sure service is running (not sleeping)
- Verify URL is correct (no trailing slash)

### Anthropic Still Not Working

1. **Check API key** - Make sure it's correct
2. **Check backend status** - Should show green ✅ in Admin Settings
3. **Check backend logs** - Look for errors in Render/Railway dashboard
4. **Test manually**:
   ```bash
   curl -X POST https://your-backend.onrender.com/api/proxy \
     -H "X-Target-URL: https://api.anthropic.com/v1/messages" \
     -H "X-Provider: anthropic" \
     -H "x-api-key: YOUR_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "Content-Type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":100,"messages":[{"role":"user","content":"Hi"}]}'
   ```

### "Too Many Requests" Error

- Backend has rate limiting (60 requests/minute)
- Wait 1 minute and try again
- For higher limits, deploy your own backend

---

## FAQ

### Do you store my API keys?

**No!** The backend never stores keys. Keys are:
1. Stored in your browser (localStorage)
2. Sent through backend to LLM provider
3. Never logged or saved

This is BYOK (Bring Your Own Keys) - you have full control.

### Is this secure?

Yes! The backend has multiple security layers:
- ✅ Rate limiting (prevents abuse)
- ✅ CORS protection (only your frontend can use it)
- ✅ SSRF prevention (only whitelisted domains)
- ✅ Request validation (size limits, format checks)
- ✅ Security headers (XSS protection)

### How much does it cost?

**Free options:**
- **Local**: $0 (runs on your computer)
- **Render**: $0 (750 hours/month free tier)
- **Railway**: $0-5/month ($5 free credit)

**API costs**: You pay only for LLM usage (OpenAI, Anthropic charges)

### Can I use my own domain?

Yes! After deploying to Render/Railway:
1. Get backend URL from dashboard
2. Configure custom domain in hosting settings
3. Update CORS in `backend/server.js`:
   ```javascript
   const allowedOrigins = [
     'http://localhost:5173',
     'https://dhruvinrsoni.github.io',
     'https://your-custom-domain.com',  // Add this
   ];
   ```

### What if Render free tier sleeps?

Render's free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

**Solutions:**
- Upgrade to paid tier ($7/month) - no sleep
- Use Railway ($5 credit/month) - no sleep
- Accept the 30-second cold start

### Can I self-host?

Yes! The backend is just a Node.js app. Deploy to:
- DigitalOcean droplet
- AWS EC2
- Your own server
- Docker container
- Anywhere Node.js runs

See [Backend Deployment Guide](BACKEND_DEPLOYMENT.md) for details.

---

## What's Next?

- 📖 Read [Backend API Documentation](../backend/README.md)
- 🚀 See [Full Deployment Guide](BACKEND_DEPLOYMENT.md)
- 🔐 Review [Security Policy](../SECURITY.md)
- 🐛 Report issues on [GitHub](https://github.com/dhruvinrsoni/samvada-studio/issues)

---

## Support

Need help? Open an issue on GitHub:
- [github.com/dhruvinrsoni/samvada-studio/issues](https://github.com/dhruvinrsoni/samvada-studio/issues)

Happy chatting! 🎉
