# Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: First Message Never Works (404 Error)

**Symptoms:**
- Click "Send" on first message → Nothing happens
- Console shows: `POST http://localhost:11434/api/generate 404 Not Found`
- Need to click "Regenerate" to get a response

**Root Cause:**
Ollama is not running or not installed on your machine.

**Solution:**

#### Option A: Install and Run Ollama (Recommended for Local Development)

1. **Download Ollama**
   - Visit: https://ollama.ai/download
   - Download for your platform (Windows, Mac, Linux)
   - Install following the instructions

2. **Start Ollama Server**
   ```bash
   # In a terminal/command prompt
   ollama serve
   ```
   Keep this terminal open while using the app.

3. **Pull a Model**
   ```bash
   # In another terminal
   ollama pull llama2
   # Or try other models: llama3, mistral, codellama, etc.
   ollama list  # See all installed models
   ```

4. **Verify Connection**
   - Check the connection status indicator in bottom-right of app
   - Should show "Ollama (localhost:11434): Connected"
   - Or run in console:
   ```javascript
   await __SAMVADA_DEBUG__.checkConnectivity()
   // Should show: { ollama: true }
   ```

5. **Test in App**
   - Create a new chat
   - Send a message
   - Should get response immediately

#### Option B: Use Cloud Provider (No Local Setup Required)

If you don't want to install Ollama:

1. **Open Admin Settings** (⚙️ gear icon in sidebar)
2. **Add a Cloud Provider:**
   - Click "Add Provider"
   - Choose: OpenAI, Anthropic, or Google
   - Enter your API key
   - Set as default
   - Test connection (should show ✅ success)
3. **Start Chatting**

**Quick Fix Command:**
```bash
# Windows
Start-Process -NoNewWindow ollama serve

# Mac/Linux
ollama serve &
```

---

### Issue 2: Ollama Model Not Found (404)

**Symptoms:**
- Console: `Ollama model "llama2" not found`
- Error message: "Please ensure Ollama is running and the model is installed"

**Solution:**

1. **Check Installed Models**
   ```bash
   ollama list
   ```

2. **Pull the Required Model**
   ```bash
   ollama pull llama2
   ```

3. **Update Model in App**
   - Admin Settings → Select Ollama provider
   - Change "Model" dropdown to an installed model
   - Save

**Available Models:**
- `llama2` (7B, fast)
- `llama3` (8B, better quality)
- `mistral` (7B, fast)
- `codellama` (for code)
- `phi` (small, very fast)

---

### Issue 3: Connection Timeout

**Symptoms:**
- Message hangs forever
- No response after 30+ seconds
- Console: `TypeError: fetch failed`

**Possible Causes & Solutions:**

#### A. Ollama Not Running
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If error, start Ollama
ollama serve
```

#### B. Firewall Blocking
- Add exception for port 11434
- Windows: Windows Defender Firewall → Allow app
- Mac: System Preferences → Security → Firewall Options

#### C. Port Conflict
```bash
# Check what's using port 11434
# Windows
netstat -ano | findstr :11434

# Mac/Linux
lsof -i :11434
```

If something else is using it, either kill that process or change Ollama's port.

---

### Issue 4: API Key Not Persisting

**Symptoms:**
- Enter API key in Admin → Save → Reload → Key is gone
- Have to re-enter API key every session

**Solution:**

This should be fixed in the latest version. If still happening:

1. **Check Browser Settings**
   - Ensure localStorage is enabled
   - Not in Incognito/Private mode
   - Check browser console for storage errors

2. **Verify Storage**
   ```javascript
   // In browser console
   __SAMVADA_PERSISTENCE__.verifyEncoding()
   // Should show encoded API keys
   ```

3. **Manual Fix**
   ```javascript
   // Clear and resave
   localStorage.clear()
   location.reload()
   // Re-enter API key
   ```

---

### Issue 5: Slow Response Times

**Symptoms:**
- Takes 30+ seconds to get response
- App feels sluggish

**Solutions:**

#### For Ollama:
1. **Use Smaller Model**
   ```bash
   ollama pull phi  # Very fast, 2.7B params
   ollama pull mistral  # Good balance
   ```

2. **Check System Resources**
   - Task Manager → GPU usage should be high
   - If CPU-only, consider upgrading to GPU model

3. **Adjust Settings**
   - Admin → Provider Settings
   - Reduce "Max Tokens" to 1024 or 2048
   - Lower "Temperature" to 0.5

#### For Cloud Providers:
1. **Use Faster Models**
   - OpenAI: `gpt-3.5-turbo` (fast) instead of `gpt-4`
   - Anthropic: `claude-instant` instead of `claude-3-opus`
   - Google: `gemini-pro` (standard) or `gemini-flash` (very fast)

2. **Check Network**
   ```javascript
   __SAMVADA_DEBUG__.checkConnectivity()
   ```

---

### Issue 6: "Provider Not Configured" Error

**Symptoms:**
- Error: "LLM provider is not properly configured"
- Can't send messages

**Solution:**

1. **For Ollama:**
   - Ensure Ollama is running (`ollama serve`)
   - Check endpoint: Should be `http://localhost:11434/api/generate`
   - Model must be installed (`ollama list`)

2. **For Cloud Providers:**
   - Must have valid API key
   - Check API key is entered correctly (no spaces)
   - Verify API key hasn't expired
   - Test connection in Admin panel

3. **Debug:**
   ```javascript
   // Check provider config
   const state = __SAMVADA_DEBUG__.getSavedState()
   console.log(state.providers)
   ```

---

## Debug Console Commands

Open browser DevTools (F12) → Console tab:

### System Diagnostics
```javascript
// Full system check
__SAMVADA_DEBUG__.diagnose()

// Connectivity check
await __SAMVADA_DEBUG__.checkConnectivity()

// System info
__SAMVADA_DEBUG__.getSystemInfo()
```

### View Logs
```javascript
// Get all recent logs
__SAMVADA_DEBUG__.getLogs()

// Get only errors
__SAMVADA_DEBUG__.filterLogs({ level: 'error' })

// Error summary
__SAMVADA_DEBUG__.getErrorSummary()

// Download logs
__SAMVADA_DEBUG__.downloadLogs()
```

### Enable Debug Mode
```javascript
// Enable verbose logging
__SAMVADA_DEBUG__.enableDebug()

// Now all LLM requests will log details
// Disable when done
__SAMVADA_DEBUG__.disableDebug()
```

### Storage Management
```javascript
// Check storage
__SAMVADA_PERSISTENCE__.checkStorage()

// Check quota
__SAMVADA_PERSISTENCE__.checkQuota()

// Clear all data (⚠️ deletes everything!)
__SAMVADA_PERSISTENCE__.clearAllData()
```

---

## Error Messages Explained

### "Cannot connect to Ollama at http://localhost:11434"
**Meaning:** Ollama server is not running  
**Fix:** Run `ollama serve` in terminal

### "Ollama model 'llama2' not found"
**Meaning:** Model not installed  
**Fix:** Run `ollama pull llama2`

### "API endpoint not configured"
**Meaning:** Provider setup incomplete  
**Fix:** Admin → Edit provider → Set endpoint/API key

### "No LLM provider selected"
**Meaning:** No default provider set  
**Fix:** Admin → Select a provider → Set as Default

### "Provider is disabled"
**Meaning:** Provider exists but is turned off  
**Fix:** Admin → Provider card → Toggle switch to enable

---

## Performance Optimization

### For Better Speed:

1. **Ollama Settings:**
   ```bash
   # Use smaller models
   ollama pull phi        # 2.7B - Very fast
   ollama pull mistral    # 7B - Fast
   
   # NOT: llama2:70b (very slow)
   ```

2. **App Settings:**
   - Admin → Provider Settings
   - Temperature: 0.7 (default) or lower for faster
   - Max Tokens: 2048 (vs 4096 default)

3. **Hardware:**
   - NVIDIA GPU: 10-100x faster than CPU
   - 16GB+ RAM recommended for larger models
   - SSD for faster model loading

### For Better Quality:

1. **Use Better Models:**
   ```bash
   ollama pull llama3       # Better than llama2
   ollama pull codellama    # For code
   ollama pull mixtral      # Very capable
   ```

2. **Adjust Parameters:**
   - Temperature: 0.8-1.0 (more creative)
   - Max Tokens: 4096-8192 (longer responses)
   - Top P: 0.9-0.95 (more diverse)

---

## Getting Help

### Before Asking for Help:

1. **Run Diagnostics:**
   ```javascript
   __SAMVADA_DEBUG__.diagnose()
   ```

2. **Check Logs:**
   ```javascript
   __SAMVADA_DEBUG__.getErrorSummary()
   __SAMVADA_DEBUG__.downloadLogs()  // Attach to issue
   ```

3. **Gather Info:**
   - Browser and version
   - OS and version
   - Error messages from console
   - Steps to reproduce

### Where to Get Help:

- **GitHub Issues:** [Submit detailed bug report]
- **Discussions:** [Ask questions, share tips]
- **Documentation:** [Check all docs files]

### Include in Bug Reports:

```javascript
// System info
__SAMVADA_DEBUG__.getSystemInfo()

// Error summary
__SAMVADA_DEBUG__.getErrorSummary()

// Recent errors
__SAMVADA_DEBUG__.filterLogs({ level: 'error' })

// Connectivity
await __SAMVADA_DEBUG__.checkConnectivity()
```

---

## FAQ

**Q: Why does the first message always fail?**  
A: Ollama isn't running. Start it with `ollama serve`.

**Q: Can I use multiple providers?**  
A: Yes! Add multiple in Admin, switch per chat.

**Q: Do I need an API key for Ollama?**  
A: No, Ollama is local and free.

**Q: Which cloud provider is cheapest?**  
A: OpenAI GPT-3.5-turbo or Google Gemini Flash.

**Q: Can I use my own model?**  
A: Yes, Ollama supports custom GGUF models.

**Q: How do I update Ollama?**  
A: Download latest from ollama.ai/download and reinstall.

**Q: Can I run this on mobile?**  
A: Yes, but Ollama won't work (use cloud providers).

**Q: Is my API key secure?**  
A: It's encoded in localStorage (not encrypted). For production, use environment variables.

---

**Last Updated:** January 21, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
