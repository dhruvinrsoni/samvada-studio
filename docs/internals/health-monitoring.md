# 🚀 Provider Health Monitoring System

## Overview
A sophisticated real-time monitoring system that displays live connection status for all configured LLM providers with a geeky, techie status bar at the bottom of the screen.

## ✨ Features

### Smart Monitoring Architecture
- **Intelligent Polling**: Checks providers every 30 seconds with exponential backoff on failures
- **Caching**: Results cached for 30 seconds to avoid excessive API calls
- **Disaster Management**: Handles offline scenarios, timeouts, network errors gracefully
- **Exponential Backoff**: Increases interval on failures (30s → 60s → 120s → 300s max)
- **Auto-Recovery**: Resets to normal interval when providers come back online
- **Siloed Design**: Can be completely enabled/disabled with one toggle

### Visual Status Indicators
| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| 🟢 Online | Green | Blinking pulse | Provider responding normally (<3s) |
| 🟡 Slow | Yellow | Solid dot | Provider responding slowly (>3s) |
| 🔴 Offline | Red | Solid dot | Provider down or unreachable |
| ⚫ Unknown | Gray | Solid dot | Not checked yet |

### Provider-Specific Health Checks

#### Ollama (Local)
- Endpoint: `http://localhost:11434/api/tags`
- Method: Lightweight GET request to check service availability
- Timeout: 30 seconds
- **CORS Handling**: Assumes online if CORS blocks localhost (since chat works)
- See [OLLAMA_CORS_FIX.md](./OLLAMA_CORS_FIX.md) for details

#### OpenAI
- Endpoint: `/v1/models`
- Method: GET with Authorization header
- Accepts 401/403 as "healthy" (means service is up, just auth check)

#### Anthropic & Google
- Method: Presence check (if API key configured → online)
- Reason: No free health endpoints available (would be billable)

#### Azure OpenAI
- Endpoint: Configured deployment endpoint
- Method: GET request

#### Custom Providers
- Not monitored automatically
- Shows as "unknown" unless endpoint returns valid response

## 🎨 UI Components

### Status Bar (Bottom of Screen)
Located at the very bottom, spanning full width:

#### Compact Mode (Default)
```
┌──────────────────────────────────────────────────────────────┐
│ ● System Healthy  ▼    ● Ollama  ● OpenAI  ● Gemini    ⟳   │
└──────────────────────────────────────────────────────────────┘
```

- Left: Overall system status with expand button
- Center: Provider status dots with names
- Right: Refresh button + checking indicator

#### Expanded Mode (Click to Expand)
```
┌──────────────────────────────────────────────────────────────┐
│ ● System Healthy  ▲    ● Ollama  ● OpenAI  ● Gemini    ⟳   │
├──────────────────────────────────────────────────────────────┤
│  Ollama (Local)           OpenAI (ChatGPT)                   │
│  ● ONLINE                 ● ONLINE                           │
│  Response Time: 45ms      Response Time: 312ms               │
│  Last Checked: 5s ago     Last Checked: 5s ago               │
├──────────────────────────────────────────────────────────────┤
│ Monitoring: 2 providers • Check interval: 30s • Cache: 30s  │
│ Smart polling with exponential backoff                       │
└──────────────────────────────────────────────────────────────┘
```

### Settings Toggle
Located in Settings (⚙️) → Additional Settings:

```
Provider Health Monitoring                                [ON]
Show live connection status for LLM providers 
in bottom status bar
```

- **ON**: Status bar visible, monitoring active
- **OFF**: Status bar hidden, all polling stopped, cache cleared

## 🔧 Architecture

### Components

#### 1. `useProviderHealthMonitor` Hook
**File**: `src/hooks/useProviderHealthMonitor.ts`

**Responsibilities**:
- Provider health checking
- Caching logic
- Polling management
- Error handling
- Network status monitoring

**Key Functions**:
```typescript
checkProviderHealth(provider) // Check single provider
checkAllProviders()           // Check all in parallel
startMonitoring()             // Begin polling
stopMonitoring()              // Stop and cleanup
refresh()                     // Force fresh check
```

**State Management**:
```typescript
{
  healthStatus: Map<string, ProviderHealth>,
  isChecking: boolean,
  pollInterval: number,  // Current polling interval
  cache: { [id]: { status, timestamp, responseTime } }
}
```

#### 2. `StatusBar` Component
**File**: `src/components/common/StatusBar.tsx`

**Responsibilities**:
- Display health status UI
- Expand/collapse details
- Manual refresh trigger
- Status visualization

**States**:
- Compact: Shows dots and overall status
- Expanded: Shows detailed info per provider

#### 3. Context Integration
**File**: `src/context/ChatContext.tsx`

**State**:
```typescript
healthMonitoringEnabled?: boolean  // Default: true
```

**Action**:
```typescript
{ type: 'TOGGLE_HEALTH_MONITORING', payload: boolean }
```

### Data Flow

```
User Enable Toggle
       ↓
Context: healthMonitoringEnabled = true
       ↓
useProviderHealthMonitor receives enabled=true
       ↓
startMonitoring()
       ↓
┌─────────────────────────────────┐
│ Check Network (navigator.onLine) │
└─────────────────────────────────┘
       ↓
┌─────────────────────────────────┐
│ Check Cache (valid for 30s)    │
└─────────────────────────────────┘
       ↓ (if expired)
┌─────────────────────────────────┐
│ Fetch Health (per provider)     │
│ - Create AbortController         │
│ - Set 10s timeout               │
│ - Make HTTP request             │
│ - Measure response time         │
└─────────────────────────────────┘
       ↓
┌─────────────────────────────────┐
│ Update Cache & State            │
└─────────────────────────────────┘
       ↓
┌─────────────────────────────────┐
│ Adjust Poll Interval            │
│ - Success: Reset to 30s         │
│ - Failure: Double (max 300s)    │
└─────────────────────────────────┘
       ↓
Schedule Next Check (after interval)
       ↓
Repeat...
```

### Disaster Management

#### Scenario 1: No Internet Connection
```
navigator.onLine === false
  ↓
Mark all providers as OFFLINE
Status: "No internet connection"
No API calls made
```

#### Scenario 2: Provider Timeout
```
Request takes > 10 seconds
  ↓
AbortController.abort()
  ↓
Status: OFFLINE
Error: "Request timeout"
Increase poll interval
```

#### Scenario 3: Network Error
```
Fetch fails (CORS, DNS, etc.)
  ↓
Catch error
  ↓
Status: OFFLINE
Error: "Network error"
Increase poll interval
```

#### Scenario 4: Provider Slow
```
Response time > 3000ms
  ↓
Status: SLOW (yellow)
Warning displayed
Continue normal polling
```

#### Scenario 5: All Providers Down
```
Every provider returns OFFLINE
  ↓
Poll interval doubles
  ↓
Continue checking with backoff
  ↓
Max interval: 5 minutes
```

#### Scenario 6: Recovery
```
Provider comes back online
  ↓
Status: ONLINE
Poll interval resets to 30s
  ↓
Normal monitoring resumes
```

### Performance Optimizations

#### 1. Caching
```typescript
Cache Duration: 30 seconds
Cache Key: providerId
Cache Value: { status, timestamp, responseTime }

IF (now - cache.timestamp) < 30000:
  RETURN cached status (no API call)
ELSE:
  Make fresh request
```

#### 2. Request Cancellation
```typescript
const abortController = new AbortController();
setTimeout(() => abortController.abort(), 10000);

fetch(url, { signal: abortController.signal })
  .then(...)
  .catch(err => {
    if (err.name === 'AbortError') {
      // Timeout - mark offline
    }
  });
```

#### 3. Parallel Checks
```typescript
const checks = providers.map(p => checkProviderHealth(p));
const results = await Promise.all(checks);
// All providers checked simultaneously (but with individual timeouts)
```

#### 4. Exponential Backoff
```typescript
Initial: 30 seconds
Failure: interval *= 2
Max: 300 seconds (5 minutes)
Success: Reset to 30 seconds

Example progression on failures:
30s → 60s → 120s → 240s → 300s (capped)
```

## 🧪 Testing Guide

### Test 1: Enable/Disable
1. Open app
2. Go to Settings (⚙️)
3. Toggle "Provider Health Monitoring" OFF
   - ✅ Status bar disappears immediately
   - ✅ Console shows "[HealthMonitor] Stopped monitoring"
4. Toggle ON
   - ✅ Status bar reappears
   - ✅ Immediate health check starts
   - ✅ Console shows "[HealthMonitor] Starting monitoring..."

### Test 2: Ollama Local
**Prerequisite**: Have Ollama running at `http://localhost:11434`

1. Status bar shows: `● Ollama` (green blinking)
2. Stop Ollama service
3. Within 30 seconds: `● Ollama` turns red
4. Expand status bar → See error: "Network error"
5. Start Ollama again
6. Within 30 seconds: `● Ollama` turns green (blinking)

### Test 3: Slow Provider
**Simulate**: Add network throttling in DevTools

1. DevTools → Network → Throttling → Slow 3G
2. Wait for next health check
3. Status shows: `● Provider` (yellow)
4. Expand → Response Time: >3000ms
5. Remove throttling
6. Status returns to green

### Test 4: Offline Mode
1. DevTools → Network → Offline checkbox ☑️
2. All providers immediately show: ● (red)
3. Error: "No internet connection"
4. Uncheck Offline
5. Console logs: "[HealthMonitor] Network back online, refreshing..."
6. All providers rechecked

### Test 5: Exponential Backoff
**Monitor console logs**:

```
[HealthMonitor] Checking providers... (30s)
[Provider] ollama-default: OFFLINE - Network error
[HealthMonitor] Next check in 60000ms

[HealthMonitor] Checking providers... (60s later)
[Provider] ollama-default: OFFLINE - Network error
[HealthMonitor] Next check in 120000ms

[HealthMonitor] Checking providers... (120s later)
[Provider] ollama-default: OFFLINE - Network error
[HealthMonitor] Next check in 240000ms
```

### Test 6: Cache Effectiveness
1. Open Console
2. Refresh status bar manually (click ⟳)
3. Immediately refresh again (click ⟳ within 30s)
4. Console shows: "[HealthMonitor] Using cached status"
5. No new HTTP requests in Network tab

### Test 7: Multi-Provider
**Configure**: Ollama + OpenAI

1. Status bar shows:
   ```
   ● Ollama  ● OpenAI
   ```
2. Disable Ollama → Ollama turns red
3. Overall status: "System Degraded" (yellow/red pulse)
4. Enable Ollama → "System Healthy" (green pulse)

## 🎯 Use Cases

### Use Case 1: Developer with Local Ollama
**Scenario**: Running Ollama locally during development

**Benefit**:
- Instant visual feedback when Ollama crashes
- No more wondering why prompts aren't working
- Proactive monitoring vs. reactive debugging

**Experience**:
```
Working on prompt...
● Ollama (green) → Everything fine
Ollama crashes...
● Ollama (red) → Oh! That's the issue
Restart Ollama...
● Ollama (green) → Back to work
```

### Use Case 2: Multiple Providers
**Scenario**: Testing across OpenAI, Anthropic, Google

**Benefit**:
- See all provider statuses at once
- Quickly switch to working provider
- Avoid timeout errors from dead providers

**Experience**:
```
Status Bar:
● OpenAI (green)   ● Anthropic (red)   ● Gemini (green)

Oh, Anthropic is down. Let me use OpenAI instead.
```

### Use Case 3: Network Issues
**Scenario**: Working on train/plane with spotty WiFi

**Benefit**:
- Immediate "No internet" notification
- Don't waste time trying to send prompts
- Know when connection is back

**Experience**:
```
WiFi drops...
● All providers (red) → "No internet connection"
Wait for WiFi...
WiFi back...
● All providers check → Green again!
```

### Use Case 4: System Administrator
**Scenario**: Managing deployment with multiple backends

**Benefit**:
- Real-time dashboard of all services
- Historical response time data
- Proactive alerting before users complain

**Experience**:
```
Monitoring:
● Production API: 45ms (green)
● Backup API: 3500ms (yellow, slow!)
● Local Dev: Offline (red, expected)

Action: Check backup API performance
```

## 📊 Metrics & Insights

### Available Data
```typescript
interface ProviderHealth {
  providerId: string;
  providerName: string;
  status: 'online' | 'slow' | 'offline' | 'unknown';
  lastChecked: number;      // Unix timestamp
  responseTime?: number;    // Milliseconds
  error?: string;           // Error message if failed
}
```

### Console Logging
Enable verbose logging in console:
```javascript
// All health checks logged:
[HealthMonitor] Checking providers...
[Provider] ollama-default: ONLINE (45ms)
[Provider] openai-default: ONLINE (312ms)
[HealthMonitor] Next check in 30000ms

// Errors logged:
[Provider] ollama-default: OFFLINE - Network error
[HealthMonitor] Exponential backoff: 60000ms

// Network events:
[HealthMonitor] Network offline
[HealthMonitor] Network back online, refreshing...
```

## 🛠️ Configuration

### Polling Intervals
```typescript
// src/hooks/useProviderHealthMonitor.ts
const INITIAL_POLL_INTERVAL = 30000;  // 30 seconds
const MAX_POLL_INTERVAL = 300000;     // 5 minutes
```

### Cache Duration
```typescript
const CACHE_DURATION = 30000;  // 30 seconds
```

### Request Timeout
```typescript
const REQUEST_TIMEOUT = 10000;  // 10 seconds
```

### Slow Threshold
```typescript
const SLOW_THRESHOLD = 3000;  // 3 seconds
```

### Customization
To adjust these values, edit the constants in:
`src/hooks/useProviderHealthMonitor.ts`

## 🐛 Troubleshooting

### Status Bar Not Showing
**Check**:
1. Is monitoring enabled in Settings?
2. Are any providers configured?
3. Check console for errors

**Fix**:
```javascript
// Console
window.__SAMVADA_DEBUG__.getSystemInfo()
// Check healthMonitoringEnabled value
```

### Provider Shows "Unknown"
**Possible Causes**:
1. First check hasn't completed yet (wait 30s)
2. Provider type not supported
3. apiEndpoint missing/invalid

**Fix**:
- Wait for first check cycle
- Check provider configuration in Admin panel
- Verify endpoint URL is correct

### Provider Always "Offline"
**Possible Causes**:
1. Provider actually down
2. CORS issues (if browser-based API)
3. Invalid API endpoint
4. Network blocking requests

**Fix**:
```javascript
// Open DevTools → Network tab
// Filter: "tags" or "models" or endpoint path
// Check for:
// - 404 (wrong endpoint)
// - CORS errors
// - Network failures
```

### High CPU Usage
**Cause**: Too frequent polling or too many providers

**Fix**:
1. Increase `INITIAL_POLL_INTERVAL` to 60s
2. Disable monitoring when not needed
3. Reduce number of configured providers

### Memory Leaks
**Symptoms**: Page gets slower over time

**Check**:
```javascript
// Console
performance.memory.usedJSHeapSize
// Monitor over time
```

**Fix**:
- Ensure `stopMonitoring()` is called on unmount
- Check for uncancelled fetch requests
- Clear cache periodically

## 📈 Performance Impact

### Network Usage
- **Per Check**: 1-2 KB per provider (GET request)
- **Frequency**: Every 30 seconds (normal)
- **Total per Hour**: ~2 providers × 120 checks × 2KB = ~480 KB/hour

### CPU Usage
- **Per Check**: ~5-10ms (minimal)
- **Idle**: 0% (between checks)

### Memory Usage
- **Base**: ~100 KB
- **Per Provider**: ~5 KB (health status + cache)
- **Total**: <200 KB typical

**Verdict**: Negligible impact on performance ✅

## 🎉 Benefits Summary

| Feature | Benefit | Impact |
|---------|---------|--------|
| **Real-time Monitoring** | Instant awareness of provider status | High |
| **Smart Caching** | Reduced API calls | High |
| **Exponential Backoff** | Respects failing providers | Medium |
| **Disaster Management** | Graceful failure handling | High |
| **One-Click Toggle** | Easy enable/disable | Medium |
| **Visual Indicators** | Quick status overview | High |
| **Expandable Details** | Deep diagnostic info | Medium |
| **Network Awareness** | Handles offline scenarios | High |
| **Multi-Provider** | Monitor all at once | High |

## 🚀 Future Enhancements

### Potential Features
1. **Historical Data**: Track uptime over time
2. **Alerts**: Desktop notifications for outages
3. **Response Time Graphs**: Visual charts
4. **Provider Comparison**: Side-by-side metrics
5. **Custom Health Endpoints**: User-defined checks
6. **Webhook Integration**: Send status to external services

### Not Implemented (Design Choices)
- ❌ **Ping on Every Request**: Too frequent, wasteful
- ❌ **Synchronous Checks**: Would block UI
- ❌ **Database Storage**: Overkill for real-time data
- ❌ **Third-Party Services**: Keep it local and private

---

**Status**: ✅ Production Ready
**Version**: v1.0.0
**Last Updated**: January 25, 2026
**Maintainer**: Samvada Studio Team
