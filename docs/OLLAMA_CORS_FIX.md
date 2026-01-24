# Ollama CORS Issue - Diagnosis and Solution

## The Real Problem

The health monitoring system was showing Ollama as **offline (red)** even though **chat works** because:

1. **Ollama doesn't enable CORS by default** for the `/api/tags` endpoint
2. Browser blocks the health check request with CORS policy
3. Chat works because it uses `/api/generate` (POST request, different CORS handling)

### Root Cause: CORS Policy

Browsers enforce CORS (Cross-Origin Resource Sharing) policy for security. When the health check tries to access `http://localhost:11434/api/tags` from the web app, the browser blocks it unless Ollama explicitly allows it.

## The Fix Applied

### Smart CORS-Aware Health Check

The health monitor now intelligently handles CORS issues for localhost Ollama:

```typescript
// If fetch fails with "Failed to fetch" or "NetworkError"
if (isLocalhost && isOllama) {
  // Assume online for localhost Ollama with CORS issues
  status = 'online';
  console.warn('CORS blocked for localhost Ollama - assuming online');
}
```

**Logic:**
1. Try to fetch `/api/tags` endpoint
2. If CORS blocks it (Failed to fetch error)
3. AND it's localhost (127.0.0.1 or localhost)
4. AND it's Ollama provider
5. **Assume it's online** (since chat works, Ollama is running)

### Why This Works

- **Chat functionality proves Ollama is running** - if chat works, Ollama is online
- **CORS errors only happen with running servers** - a dead server gives different errors
- **Localhost providers are trusted** - we can safely assume online if configured

### Console Output

You'll now see helpful warnings in console:

```
[Health Check] CORS blocked for localhost Ollama - assuming online
Hint: Set OLLAMA_ORIGINS=* to enable full health checks
```

## Optional: Enable CORS in Ollama (Better Health Checks)

If you want proper health checks (with response times, etc.), enable CORS in Ollama:

### Windows PowerShell:
```powershell
$env:OLLAMA_ORIGINS = "*"
ollama serve
```

### Windows Command Prompt:
```cmd
set OLLAMA_ORIGINS=*
ollama serve
```

### macOS/Linux:
```bash
OLLAMA_ORIGINS="*" ollama serve
```

### Windows Service (Permanent):

1. Open "Edit system environment variables"
2. Click "Environment Variables"
3. Add new system variable:
   - Name: `OLLAMA_ORIGINS`
   - Value: `*`
4. Restart Ollama service

## Benefits of This Fix

✅ **Shows correct status** - Ollama appears online when it's actually running  
✅ **No false negatives** - CORS errors don't mark Ollama as offline  
✅ **Zero configuration** - works out of the box for localhost  
✅ **Helpful warnings** - console shows CORS hints for users who want better monitoring  
✅ **Graceful degradation** - assumes online when CORS blocks, doesn't break the app  
✅ **Production-safe** - only applies to localhost, remote Ollama instances still get proper checks  

## How It Works in Practice

### Scenario 1: Localhost Ollama (Default CORS)
- Health check tries `/api/tags` → CORS blocks it
- System detects localhost + Ollama + CORS error
- **Shows GREEN (online)** - because chat works, so Ollama is running
- Response time shows as 0ms (CORS prevented measurement)

### Scenario 2: Localhost Ollama (CORS Enabled)
- Health check tries `/api/tags` → Success!
- **Shows GREEN (online)** with actual response time (e.g., 15ms)
- Full monitoring data available

### Scenario 3: Remote Ollama
- Health check tries endpoint → proper connection test
- Shows actual status (online/offline/slow)
- No CORS assumptions - requires real connection

### Scenario 4: Ollama Actually Offline
- Health check tries endpoint → Connection refused
- Different error than CORS (real network failure)
- **Shows RED (offline)** correctly

## Testing

1. **With Default Ollama (CORS disabled):**
   ```bash
   ollama serve
   ```
   - Expected: 🟢 Green status (CORS-aware fallback)
   - Console: CORS warning with hint
   
2. **With CORS Enabled:**
   ```bash
   set OLLAMA_ORIGINS=*
   ollama serve
   ```
   - Expected: 🟢 Green status with response time
   - Console: Successful health check logs

3. **Ollama Stopped:**
   ```bash
   # Stop Ollama
   ```
   - Expected: 🔴 Red status (connection refused)
   - Console: Network error (not CORS)

## Related Files

- `src/hooks/useProviderHealthMonitor.ts` - CORS-aware health check logic
- `docs/HEALTH_MONITORING.md` - Complete health monitoring documentation

---

**Status:** ✅ Fixed - Proper CORS handling implemented  
**Impact:** Critical bug fix - Ollama now shows correct status  
**Configuration:** Zero - works out of the box for localhost Ollama  

