# Health Monitoring Fix - Ollama Endpoint Issue

## Problem Summary
The health monitoring system was showing Ollama as offline (red status) even though chat functionality worked perfectly. This was due to an endpoint mismatch issue.

## Root Cause
The Ollama provider was configured with:
```typescript
apiEndpoint: 'http://localhost:11434/api/generate'
```

The health check was incorrectly appending `/api/tags` to this endpoint, resulting in:
```
http://localhost:11434/api/generate/api/tags  ❌ WRONG
```

When it should have been:
```
http://localhost:11434/api/tags  ✅ CORRECT
```

## Fix Applied

### 1. **Endpoint Extraction Logic** (useProviderHealthMonitor.ts)
```typescript
// OLD (broken)
if (provider.type === 'ollama' && provider.apiEndpoint) {
  healthCheckUrl = `${provider.apiEndpoint}/api/tags`;
}

// NEW (fixed)
if (provider.type === 'ollama' && provider.apiEndpoint) {
  // Extract base URL and check /api/tags endpoint
  // Handles both: http://localhost:11434 and http://localhost:11434/api/generate
  const baseUrl = provider.apiEndpoint.replace(/\/api\/.*$/, '');
  healthCheckUrl = `${baseUrl}/api/tags`;
}
```

This fix:
- Strips any `/api/*` path from the endpoint
- Uses the base URL to construct the correct health check endpoint
- Works for both formats: `http://localhost:11434` and `http://localhost:11434/api/generate`

### 2. **Increased Timeout** (useProviderHealthMonitor.ts)
```typescript
// OLD
const REQUEST_TIMEOUT = 10000; // 10 seconds

// NEW
const REQUEST_TIMEOUT = 30000; // 30 seconds (increased for slow networks/local services)
```

**Rationale:**
- Prevents false negatives on slow networks
- Gives local services (like Ollama) more time to respond
- Especially important during cold starts or high load

### 3. **Slow Threshold Adjustment**
```typescript
// OLD
const SLOW_THRESHOLD = 3000; // 3 seconds

// NEW
const SLOW_THRESHOLD = 5000; // 5 seconds
```

More forgiving threshold to avoid marking healthy providers as "slow".

### 4. **Graceful Degradation System**

Added automatic failure detection with user-friendly warning:

```typescript
const MAX_CONSECUTIVE_FAILURES = 3; // Show warning after 3 failures
```

**Features:**
- Tracks consecutive failures per provider
- Shows warning banner when all providers fail persistently (3+ times)
- Offers one-click disable button in the warning
- **Never affects chat functionality** - monitoring is purely informational

**Warning UI:**
```
⚠️ Health Monitoring Issues Detected
Multiple consecutive failures detected. This won't affect chat functionality.
[Disable Monitoring] button
```

### 5. **Smart Reset Logic**

```typescript
// Track consecutive failures
if (result.status === 'offline') {
  consecutiveFailuresRef.current.set(result.providerId, failures + 1);
} else {
  consecutiveFailuresRef.current.set(result.providerId, 0); // Reset on success
}
```

Failures reset to 0 on first successful check, preventing false warnings.

## Testing Verification

### Expected Behavior After Fix:

1. **Ollama Health Check:**
   - ✅ Status should show green (online) when Ollama is running
   - ✅ Response time should be < 100ms for local instance
   - ✅ Status bar should blink green indicating healthy system

2. **Timeout Handling:**
   - ✅ 30 seconds timeout prevents false negatives
   - ✅ Slow providers (3-30s) show yellow status
   - ✅ Offline providers (>30s or error) show red status

3. **Graceful Degradation:**
   - ✅ 3 consecutive failures trigger warning banner
   - ✅ Warning doesn't block UI or chat functionality
   - ✅ One-click disable button in warning
   - ✅ Failures reset on first success

### Testing Steps:

1. **Test Ollama Online:**
   ```bash
   # Ensure Ollama is running
   curl http://localhost:11434/api/tags
   ```
   - Expected: Green dot 🟢, "System Healthy"

2. **Test Ollama Offline:**
   ```bash
   # Stop Ollama service
   ```
   - Expected: Red dot 🔴, "System Degraded"
   - After 3 checks (~90s): Warning banner appears

3. **Test Recovery:**
   ```bash
   # Start Ollama again
   ```
   - Expected: Green dot 🟢, warning banner disappears
   - Failures counter resets

4. **Test Slow Response:**
   - Simulate slow network or high Ollama load
   - Expected: Yellow dot 🟡, "System Slow" if 5-30s response

## Configuration

### Constants (useProviderHealthMonitor.ts):
```typescript
const CACHE_DURATION = 30000;             // 30s - How long to cache results
const INITIAL_POLL_INTERVAL = 30000;      // 30s - Initial check interval
const MAX_POLL_INTERVAL = 300000;         // 5m  - Max interval (with backoff)
const REQUEST_TIMEOUT = 30000;            // 30s - Request timeout
const SLOW_THRESHOLD = 5000;              // 5s  - Slow vs online threshold
const MAX_CONSECUTIVE_FAILURES = 3;       // 3   - Failures before warning
```

### Polling Strategy:
- **Normal:** Check every 30 seconds
- **Failures Detected:** Exponential backoff
  - After 1st failure: 60s
  - After 2nd failure: 120s
  - After 3rd+ failure: 300s (5 minutes max)
- **Success:** Reset to 30s immediately

## Benefits of This Fix

✅ **Accurate Status:** Ollama now correctly shows online when running  
✅ **No False Negatives:** 30s timeout handles slow responses  
✅ **Graceful Degradation:** Never impacts chat functionality  
✅ **User-Friendly:** One-click disable if issues persist  
✅ **Smart Polling:** Exponential backoff reduces API load  
✅ **Low Overhead:** 30s caching minimizes redundant checks  
✅ **Network Awareness:** Auto-refreshes on connection restore  

## Performance Impact

- **Normal Operation:** ~1 health check / 30 seconds per provider
- **With Failures:** Automatic backoff reduces frequency
- **Network Cost:** Minimal - single HTTP request per check
- **CPU/Memory:** Negligible - simple fetch with timeout
- **User Experience:** Zero impact on chat or UI responsiveness

## Future Improvements

1. **Configurable Timeouts:** Allow users to adjust timeout values in settings
2. **Provider-Specific Timeouts:** Different timeouts for local vs cloud providers
3. **Health Check Endpoints:** Allow custom health check URLs per provider
4. **Advanced Warnings:** Show different warnings for network vs provider issues
5. **Retry Logic:** Automatic retry with backoff before marking as failed

## Related Files

- `src/hooks/useProviderHealthMonitor.ts` - Core health monitoring logic
- `src/components/common/StatusBar.tsx` - Status bar UI with warning banner
- `src/context/ChatContext.tsx` - State management for monitoring toggle
- `src/types/index.ts` - Type definitions
- `docs/HEALTH_MONITORING.md` - Complete feature documentation

---

**Status:** ✅ Fixed and Tested  
**Date:** December 2024  
**Impact:** Critical bug fix - Ollama health check now works correctly  
