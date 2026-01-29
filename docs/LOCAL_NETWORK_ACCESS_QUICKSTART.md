# Local Network Access - Quick Start Guide

## 🎯 What You'll Learn

In 5 minutes, you'll have full control over local network permissions for connecting to Ollama and other local LLM servers.

---

## 📍 Where to Find It

**Admin Settings → General Tab → Top Section**

```
⚙️ Admin Settings
├── 🤖 LLM Providers
├── 🔧 General ← YOU ARE HERE
│   └── 🌐 Local Network Access ← THE FEATURE
└── 🛠️ Developer
```

---

## 🚀 Quick Start (30 seconds)

### Step 1: Open Admin Settings
Click the ⚙️ gear icon in the sidebar (bottom-left)

### Step 2: Go to General Tab
Click "🔧 General" tab at the top

### Step 3: Look at Top Section
You'll see "🌐 Local Network Access" as the first card

### Step 4: Grant Permission
Click the blue **"🔓 Grant Local Network Access"** button

### Step 5: Done!
Status changes to **"✓ Granted"** — You're all set!

---

## 🎨 Visual Guide

### State 1: Not Set (Fresh Install)

```
┌─────────────────────────────────────────────────────────────┐
│ 🌐 Local Network Access                    ⚠ Not Set        │
│                                                             │
│ Required for connecting to local LLM servers like Ollama   │
│                                                             │
│ ℹ️  Why this is needed: Browsers restrict access to local  │
│    network resources (localhost, 192.168.x.x) for security.│
│    This feature allows Samvada Studio to connect to        │
│    locally running LLM servers like Ollama...              │
│                                                             │
│ [ 🔓 Grant Local Network Access ]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Action**: Click the button!

---

### State 2: Granted (Active)

```
┌─────────────────────────────────────────────────────────────┐
│ 🌐 Local Network Access                    ✓ Granted         │
│                                                             │
│ Required for connecting to local LLM servers like Ollama   │
│                                                             │
│ ✅ Successfully connected to local network!                 │
│    Ollama server detected.                                 │
│                                                             │
│ [ 🔍 Test Connection ]  [ 🚫 Revoke ]                       │
│ [ 🔄 Reset to Default ]                                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Actions Available**:
- **🔍 Test Connection**: Verify Ollama is running
- **🚫 Revoke**: Disable access (e.g., when not using local LLMs)
- **🔄 Reset**: Clear permission state (browser will prompt again)

---

### State 3: Denied (Blocked)

```
┌─────────────────────────────────────────────────────────────┐
│ 🌐 Local Network Access                    ✕ Denied          │
│                                                             │
│ Required for connecting to local LLM servers like Ollama   │
│                                                             │
│ ⚠️  Local network access is currently denied.              │
│    Local LLM providers like Ollama won't work.             │
│                                                             │
│ [ 🔓 Grant Access ]  [ 🔄 Reset ]                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**How to Fix**: Click "🔓 Grant Access"

---

## 🎬 Complete Walkthrough

### Scenario: Setting up Ollama for the first time

#### 1️⃣ Install Ollama
```bash
# Download from https://ollama.ai
# Or use package manager:
brew install ollama      # macOS
winget install ollama    # Windows
```

#### 2️⃣ Start Ollama Server
```bash
ollama serve
# Output: Listening on http://localhost:11434
```

#### 3️⃣ Open Samvada Studio
Navigate to: http://localhost:5174 (or your deployed URL)

#### 4️⃣ Add Ollama Provider
1. Click ⚙️ (Admin Settings)
2. Go to "🤖 LLM Providers" tab
3. Click "+ Add Provider"
4. Select **Ollama (Local)**
5. Fill in:
   - Name: `My Local Ollama`
   - Endpoint: `http://localhost:11434/api/generate`
   - Model: `llama2` (or any installed model)
6. Click "Save"

#### 5️⃣ First-Time Permission Prompt (Automatic)

**Pop-up appears:**
```
┌─────────────────────────────────────────────────────┐
│ 🌐 Local Network Access Required                   │
│                                                     │
│ Samvada Studio detected an Ollama provider in      │
│ your configuration.                                 │
│                                                     │
│ To connect to locally running LLM servers (like    │
│ Ollama on localhost:11434), this app needs access  │
│ to your local network.                             │
│                                                     │
│ ✅ Grant access now?                                │
│ (You can change this later in Admin Settings)      │
│                                                     │
│ [ OK ]  [ Cancel ]                                  │
└─────────────────────────────────────────────────────┘
```

**Click OK** → Permission granted!

#### 6️⃣ Verify in Admin Settings
1. Click ⚙️ again
2. Go to "🔧 General" tab
3. See "🌐 Local Network Access" showing **✓ Granted**

#### 7️⃣ Test Connection
1. In the Local Network Access card
2. Click "🔍 Test Connection"
3. Should show: `✅ Connected to Ollama [version]`

#### 8️⃣ Start Chatting!
1. Close Admin Settings
2. Create a new chat
3. Select Ollama provider
4. Start chatting locally! 🎉

---

## 🔧 Advanced Usage

### Testing Without Ollama

You can grant permission even if Ollama isn't running:

```
1. Click "🔓 Grant Local Network Access"
2. Test will attempt connection
3. Even if it fails (no Ollama), permission is granted
4. Result: "✅ Local network access granted! 
           (No response from localhost, but permission is active)"
```

**Why?** Permission and service availability are separate concerns.

---

### Revoking for Security

If you're not using local LLMs and want to revoke access:

```
1. Go to Admin Settings → General
2. Find "🌐 Local Network Access"
3. Click "🚫 Revoke"
4. Status changes to "✕ Denied"
```

**Effect**: All local network requests will be blocked with a clear error message.

---

### Resetting to Prompt Again

Want the browser to ask you again on next connection?

```
1. Go to Admin Settings → General
2. Find "🌐 Local Network Access"
3. Click "🔄 Reset to Default"
4. Reload the page
5. Next connection will show the prompt again
```

**Use case**: Testing the first-time user experience.

---

## 🐛 Troubleshooting

### Issue: Permission granted but connection fails

**Symptoms**: Status shows "✓ Granted" but Ollama requests fail

**Solutions**:

1. **Check if Ollama is running:**
   ```bash
   # Should return version info
   curl http://localhost:11434/api/version
   ```

2. **Check the port:**
   - Ollama default: `11434`
   - Your config in Admin → LLM Providers should match

3. **Test connection:**
   - Click "🔍 Test Connection" in the Local Network Access card
   - Read the error message

4. **Check firewall:**
   ```bash
   # macOS
   sudo lsof -i :11434
   
   # Windows (PowerShell as Admin)
   netstat -ano | findstr :11434
   ```

5. **Check CORS (if needed):**
   ```bash
   # Run Ollama with CORS enabled
   OLLAMA_ORIGINS=* ollama serve
   ```

---

### Issue: "CORS error" in browser console

**Solution**: Ollama needs CORS headers for browser requests

```bash
# Set environment variable
export OLLAMA_ORIGINS="*"
ollama serve

# Or for specific origin
export OLLAMA_ORIGINS="http://localhost:5174"
ollama serve
```

---

### Issue: First-time prompt doesn't appear

**Solutions**:

1. **Manually grant permission:**
   - Admin Settings → General → Local Network Access
   - Click "🔓 Grant Local Network Access"

2. **Reset the prompt flag:**
   - Open browser DevTools (F12)
   - Go to Application → Local Storage
   - Delete key: `samvada-network-prompt-shown`
   - Reload page

3. **Ensure Ollama provider exists:**
   - Prompt only appears if Ollama provider is configured
   - Add one in Admin Settings → LLM Providers

---

### Issue: Permission keeps resetting

**Symptoms**: Have to grant permission every session

**Solutions**:

1. **Check browser mode:**
   - NOT in Private/Incognito? (localStorage won't persist)

2. **Check localStorage:**
   - F12 → Application → Local Storage
   - Look for: `samvada-local-network-permission`
   - Should be: `"granted"`

3. **Check browser settings:**
   - Ensure localStorage isn't being auto-cleared

4. **Try different browser:**
   - Test in Chrome/Edge/Firefox to isolate issue

---

## 📖 More Information

### Technical Details

**localStorage Keys:**
- `samvada-local-network-permission`: `"granted"` | `"denied"`
- `samvada-network-prompt-shown`: `"true"` (prevents re-prompting)

**Detected Local Endpoints:**
- `localhost`, `127.0.0.1`
- `192.168.x.x` (Private Class C)
- `10.x.x.x` (Private Class A)
- `172.16.x.x - 172.31.x.x` (Private Class B)

**Permission Check:**
- Runs before each local network request
- Non-local endpoints skip the check
- Clear error messages if denied

---

### Security Considerations

**What's Protected:**
- ✅ User explicitly grants access
- ✅ Permission stored locally (never transmitted)
- ✅ Only local addresses are affected
- ✅ Can be revoked anytime

**What's NOT Protected:**
- ⚠️ If malicious local service exists, granting access could expose it
- ⚠️ The app could theoretically probe your local network
- ⚠️ Local LLM responses are unencrypted (but stay local)

**Best Practices:**
1. Only grant if you're using local LLMs
2. Revoke when not actively using local features
3. Use firewall to limit what runs on your machine
4. Regularly audit running services

---

## 🎓 Learn More

**Full Documentation**: [docs/LOCAL_NETWORK_ACCESS.md](LOCAL_NETWORK_ACCESS.md)

**Topics Covered:**
- Complete architecture and flow diagrams
- Browser compatibility details
- Development guide for contributors
- Future enhancement plans
- Security deep dive
- Troubleshooting encyclopedia

---

## 💡 Pro Tips

### Tip 1: Test Before Chatting

Always test the connection before starting a conversation:
```
Admin Settings → General → Local Network Access → 🔍 Test Connection
```

This ensures everything is working and saves you from mid-conversation errors.

---

### Tip 2: Multiple Local LLMs

You can run multiple local LLM servers on different ports:
```
- Ollama: localhost:11434
- LM Studio: localhost:1234
- Text Generation WebUI: localhost:5000
```

Grant permission once, all local endpoints work!

---

### Tip 3: Temporary Disable

Don't want to fully revoke? Just disable the Ollama provider:
```
Admin Settings → LLM Providers → [Your Ollama] → Toggle Off
```

Permission stays granted, but provider won't be used.

---

## ✅ Quick Checklist

Before asking for help, verify:

- [ ] Ollama is installed and running (`ollama serve`)
- [ ] Permission is granted (Admin → General → status = ✓ Granted)
- [ ] Provider is configured (Admin → LLM Providers → Ollama exists)
- [ ] Port is correct (default: 11434)
- [ ] Firewall allows localhost connections
- [ ] CORS is enabled if needed (`OLLAMA_ORIGINS=*`)
- [ ] Not in private/incognito mode
- [ ] localStorage is not being cleared

---

## 🎉 Success!

You now have full control over local network permissions!

**Next Steps:**
- 💬 Start chatting with your local LLM
- 📋 Try different models (`ollama pull llama2`, `ollama pull codellama`)
- 🔧 Explore other Admin Settings
- 📖 Read the full [docs](LOCAL_NETWORK_ACCESS.md)

**Questions?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or open an issue on GitHub!

---

**Samvada Studio** — *Conversations, your way* 🗣️
