# Local Network Access Feature

## Overview

The Local Network Access feature allows Samvada Studio to connect to locally running LLM servers (like Ollama) without requiring external cloud APIs. This gives you complete control over your data and enables fully offline AI capabilities.

## Why This Feature?

Modern browsers restrict access to local network resources for security reasons. While this is generally good, it prevents web applications from connecting to locally hosted services. This feature provides:

- ✅ **Full Control**: Manage permissions directly from the app
- ✅ **Privacy**: No external dependencies for browser permission management
- ✅ **Transparency**: Clear explanations of what permissions are needed and why
- ✅ **Flexibility**: Grant, revoke, or reset permissions anytime
- ✅ **User-Friendly**: One-time setup with persistent storage

## How It Works

### Architecture

```
┌─────────────────────────────────────────┐
│         Samvada Studio                  │
│  ┌───────────────────────────────────┐  │
│  │  useLocalNetworkPermission Hook  │  │
│  │  • Checks on app startup         │  │
│  │  • Prompts if Ollama detected    │  │
│  │  • Stores in localStorage        │  │
│  └───────────────────────────────────┘  │
│                  │                       │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │  LocalNetworkAccess Component    │  │
│  │  • Admin Settings UI             │  │
│  │  • Test connections              │  │
│  │  • Grant/Revoke/Reset            │  │
│  └───────────────────────────────────┘  │
│                  │                       │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │  llmService Permission Check     │  │
│  │  • Validates before requests     │  │
│  │  • Blocks if denied              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Browser Permission API          │
│  • Silent check (no prompt)            │
│  • Follows browser security policies   │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Local Network (localhost)          │
│  • Ollama (port 11434)                 │
│  • Other LLM servers                   │
│  • Private network services            │
└─────────────────────────────────────────┘
```

### Flow

1. **App Startup**
   - `useLocalNetworkPermission` hook runs
   - Checks if permission already set
   - Checks if Ollama provider exists
   - Shows prompt if needed (one-time)

2. **User Grants Permission**
   - Test connection to localhost:11434
   - Triggers browser's internal permission check
   - Stores state in localStorage
   - Permission persists across sessions

3. **Making Requests**
   - `llmService` checks permission before each request
   - Blocks local network requests if denied
   - Shows helpful error with instructions

4. **Admin Settings UI**
   - Full control panel in Admin → General
   - Test connections anytime
   - Revoke or reset permissions
   - View technical details

## User Interface

### Location
Admin Settings → General Tab → Top Section

### States

#### 1. Not Set (Prompt)
```
🌐 Local Network Access                    ⚠ Not Set

Required for connecting to local LLM servers like Ollama

[🔓 Grant Local Network Access]
```

#### 2. Granted
```
🌐 Local Network Access                    ✓ Granted

Required for connecting to local LLM servers like Ollama

[🔍 Test Connection]  [🚫 Revoke]
[🔄 Reset to Default]
```

#### 3. Denied
```
🌐 Local Network Access                    ✕ Denied

⚠️ Local network access is currently denied.
   Local LLM providers like Ollama won't work.

[🔓 Grant Access]  [🔄 Reset]
```

### Test Results

Success:
```
✅ Successfully connected to local network!
   Ollama server detected.
```

Error:
```
❌ Cannot connect. Check if Ollama is running.
```

## Technical Details

### Storage

Permission state is stored in localStorage:
```javascript
localStorage.setItem('samvada-local-network-permission', 'granted' | 'denied');
localStorage.setItem('samvada-network-prompt-shown', 'true');
```

### Supported Endpoints

The feature detects local network addresses:
- `localhost`
- `127.0.0.1`
- `192.168.x.x` (Private Class C)
- `10.x.x.x` (Private Class A)
- `172.16.x.x - 172.31.x.x` (Private Class B)

### Permission Check Logic

```typescript
const checkLocalNetworkPermission = (endpoint: string): boolean => {
  const isLocal = /* check if endpoint is local */;
  
  if (!isLocal) return true; // Not local, no check needed
  
  const permission = localStorage.getItem('samvada-local-network-permission');
  
  if (permission === 'denied') return false;
  
  return true; // Allow if granted or not set
};
```

### First-Time Prompt

When app detects Ollama provider:
```
🌐 Local Network Access Required

Samvada Studio detected an Ollama provider in your configuration.

To connect to locally running LLM servers (like Ollama on 
localhost:11434), this app needs access to your local network.

✅ Grant access now?
(You can change this later in Admin Settings → General)

[OK]  [Cancel]
```

## Browser Compatibility

### How Browsers Handle Local Network Access

Different browsers have different policies:

#### Chrome/Edge (Chromium)
- Uses Private Network Access (PNA) specification
- May show permission prompt for first request
- Respects CORS preflight requests
- Requires HTTPS for some scenarios (or localhost exception)

#### Firefox
- Follows same-origin policy strictly
- localhost is treated specially
- May require about:config changes for some scenarios
- Generally permissive for localhost

#### Safari
- Stricter security policies
- May require user gesture
- localhost usually works without issues
- Private network addresses may be blocked

### Our Approach

Since browser APIs for local network permission are limited, we use a **hybrid approach**:

1. **Test Connection**: Attempt fetch() to trigger browser's permission system
2. **Store State**: Save user's choice in localStorage
3. **Pre-check**: Validate before making actual requests
4. **User Control**: Full UI for managing permissions

This works around browser limitations while giving users complete control.

## Security Considerations

### What's Protected

✅ **User Privacy**: Permission stored locally, never transmitted
✅ **Network Isolation**: Only local addresses are checked
✅ **Clear Intent**: User explicitly grants access
✅ **Revocable**: Can be disabled anytime

### What's NOT Protected Against

⚠️ **Malicious Local Services**: If you have a compromised local service, granting access could expose it
⚠️ **Local Network Scanning**: The app could theoretically probe your local network
⚠️ **Data Leaks**: Local LLM responses are not encrypted (but stay local)

### Best Practices

1. **Only Enable If Needed**: Don't grant access unless using local LLMs
2. **Verify Local Services**: Ensure only trusted services run on target ports
3. **Use Firewall**: Configure OS firewall to limit what can run locally
4. **Regular Audits**: Check what services are running on your machine
5. **Revoke When Done**: If you stop using local LLMs, revoke access

## Troubleshooting

### Permission Granted But Can't Connect

**Symptoms**: Status shows "Granted" but Ollama requests fail

**Solutions**:
1. Check if Ollama is actually running: `ollama serve`
2. Verify port: Ollama default is 11434
3. Check firewall: Allow localhost connections
4. Test directly: `curl http://localhost:11434/api/version`
5. Try Reset: Reset permission and grant again

### Browser Blocks Request Despite Permission

**Symptoms**: Console shows CORS or network error

**Solutions**:
1. **CORS Issue**: Ollama may need CORS headers. Run with:
   ```bash
   OLLAMA_ORIGINS=* ollama serve
   ```

2. **Mixed Content**: Ensure app is on http:// or localhost, not https://

3. **Browser Policy**: Some browsers block by default. Check:
   - Chrome: chrome://flags/#block-insecure-private-network-requests
   - Firefox: about:config → network.dns.blockDotOnion

4. **Extension Blocking**: Disable privacy extensions temporarily

### First-Time Prompt Doesn't Show

**Symptoms**: Added Ollama provider but no prompt

**Solutions**:
1. Manually trigger: Admin Settings → Local Network Access → Grant
2. Clear prompt flag: Delete `samvada-network-prompt-shown` from localStorage
3. Reload page after adding Ollama provider

### Permission Keeps Resetting

**Symptoms**: Have to grant permission every session

**Solutions**:
1. Check localStorage isn't being cleared
2. Ensure not in private/incognito mode
3. Check browser settings for localStorage exceptions
4. Verify the key exists: `localStorage.getItem('samvada-local-network-permission')`

## Development

### Files

```
src/
├── components/admin/
│   └── LocalNetworkAccess.tsx      # Main UI component
├── hooks/
│   └── useLocalNetworkPermission.ts # Auto-prompt hook
└── utils/
    └── llmService.ts                # Permission validation
```

### Testing

#### Manual Test Sequence

1. **Fresh State**: Clear localStorage
2. **Add Ollama Provider**: Admin → Providers → Add Ollama
3. **Reload**: Should see prompt
4. **Grant**: Click OK
5. **Verify**: Check Admin → General → Local Network Access shows "Granted"
6. **Test**: Click "Test Connection" (requires Ollama running)
7. **Revoke**: Click "Revoke"
8. **Try Request**: Should fail with permission error
9. **Reset**: Click "Reset to Default"
10. **Reload**: Should prompt again

#### Automated Tests (Future)

```typescript
describe('LocalNetworkAccess', () => {
  it('should detect local endpoints', () => {
    expect(isLocalEndpoint('http://localhost:11434')).toBe(true);
    expect(isLocalEndpoint('https://api.openai.com')).toBe(false);
  });

  it('should block denied permissions', () => {
    localStorage.setItem('samvada-local-network-permission', 'denied');
    expect(() => callLLMProvider(ollamaProvider)).toThrow('permission denied');
  });

  it('should allow granted permissions', async () => {
    localStorage.setItem('samvada-local-network-permission', 'granted');
    const response = await callLLMProvider(ollamaProvider);
    expect(response).toBeDefined();
  });
});
```

## User Documentation

### Quick Start

1. **Install Ollama**: Download from [ollama.ai](https://ollama.ai)
2. **Start Server**: Run `ollama serve` in terminal
3. **Open Samvada Studio**: Navigate to the app
4. **Add Provider**: Admin → LLM Providers → Add → Ollama
5. **Grant Access**: Pop-up will ask for permission → Click OK
6. **Test**: Admin → General → Local Network Access → Test Connection
7. **Chat**: Start chatting with local AI!

### FAQ

**Q: Is my data sent to the internet?**
A: No! When using local providers like Ollama, all data stays on your machine.

**Q: Why does the browser block local network?**
A: Security. Malicious websites could probe your local network without this protection.

**Q: Can I use both cloud and local LLMs?**
A: Yes! You can have OpenAI, Claude, and Ollama configured simultaneously.

**Q: Does this work offline?**
A: Yes, if you're using local LLM providers. Cloud providers require internet.

**Q: What if I deny permission by accident?**
A: Go to Admin → General → Local Network Access → Grant Access

**Q: Is this feature required?**
A: Only if you want to use local LLM providers. Cloud providers work without it.

## Future Enhancements

### Planned Features

- [ ] **Auto-Discovery**: Scan local network for LLM servers
- [ ] **Port Configuration**: Custom ports beyond 11434
- [ ] **Multiple Endpoints**: Support for multiple local servers
- [ ] **Connection Pooling**: Reuse connections for better performance
- [ ] **Health Monitoring**: Continuous health checks for local services
- [ ] **Proxy Support**: SOCKS/HTTP proxy for local connections

### Potential Improvements

- Use Web Workers for connection tests (non-blocking)
- Add connection timeout configuration
- Support WebSocket connections for streaming
- Implement connection retry logic with backoff
- Add detailed connection logs to Developer Tools
- Create permission migration for existing users

## Credits

Feature designed and implemented for Samvada Studio to provide best-in-class local LLM support with transparent, user-controlled permissions.

**Philosophy**: Out-of-the-box functionality without relying on external browser settings or opaque permission systems.
