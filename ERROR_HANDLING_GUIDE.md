# Error Boundary & Production Error Handling Guide

This document explains how Samvada Studio handles errors gracefully so users never see a white screen.

---

## What is an Error Boundary?

An **Error Boundary** is a React component that:
- ✅ Catches JavaScript errors in child components
- ✅ Shows user-friendly error UI instead of white screen
- ✅ Prevents entire app crash
- ✅ Allows app recovery without page reload
- ✅ Logs errors for debugging

**Location:** `src/components/common/ErrorBoundary.tsx`

---

## How It Works

### Normal Flow (No Error)
```
User clicks button
  ↓
Component renders
  ↓
App works normally
```

### Error Flow (Without ErrorBoundary)
```
User clicks button
  ↓
Component throws error
  ↓
React cannot recover
  ↓
❌ WHITE SCREEN OF DEATH
  ↓
User frustrated, closes app
```

### Error Flow (With ErrorBoundary) ✅
```
User clicks button
  ↓
Component throws error
  ↓
ErrorBoundary catches it
  ↓
✅ Friendly error UI
  ↓
User can: Reload / Go Home / Clear Cache
  ↓
App remains functional
```

---

## Current Implementation

### ErrorBoundary Component Structure

**File:** `src/components/common/ErrorBoundary.tsx` (274 lines)

**Features:**
- ✅ Catches render errors
- ✅ Shows dev mode with stack trace
- ✅ Shows prod mode with friendly message
- ✅ Provides recovery options
- ✅ Logs errors for tracking

### Coverage in App.tsx

```typescript
// Main layout sections wrapped
<ErrorBoundary name="Sidebar">
  <Sidebar />
</ErrorBoundary>

<ErrorBoundary name="Chat Area">
  <ChatArea />
</ErrorBoundary>

<ErrorBoundary name="Context Panel">
  <ContextPanel />
</ErrorBoundary>

// Modals wrapped individually
<ErrorBoundary><AdminPanel /></ErrorBoundary>
<ErrorBoundary><GlobalSearch /></ErrorBoundary>
<ErrorBoundary><CommandPalette /></ErrorBoundary>
<ErrorBoundary><KeyboardShortcuts /></ErrorBoundary>
<ErrorBoundary><TemplatesLibrary /></ErrorBoundary>
<ErrorBoundary><ExportModal /></ErrorBoundary>
```

**Result:** If ANY section throws error, only that section shows error UI, rest of app still works.

---

## Error Types Handled

### 1. Render Errors (Caught by ErrorBoundary)
```typescript
// ❌ WILL BE CAUGHT
function Component() {
  const data = undefined;
  return <div>{data.property}</div>; // TypeError: Cannot read property
}

// ✅ ERROR BOUNDARY CATCHES THIS
// User sees: "Chat Area encountered an error"
```

### 2. Event Handler Errors (NOT caught - need try/catch)
```typescript
// ❌ WILL NOT BE CAUGHT by ErrorBoundary
function Component() {
  const onClick = () => {
    throw new Error('Button error');
  };
  return <button onClick={onClick}>Click</button>;
}

// ✅ NEED TO CATCH WITH TRY/CATCH
function Component() {
  const onClick = () => {
    try {
      throw new Error('Button error');
    } catch (error) {
      console.error('Button error:', error);
      showToast('Error: ' + error.message, 'error');
    }
  };
  return <button onClick={onClick}>Click</button>;
}
```

### 3. Async/Promise Errors (NOT caught - need handlers)
```typescript
// ❌ WILL NOT BE CAUGHT
async function fetchData() {
  const res = await fetch('/api/data');
  return res.json();
}

// ✅ NEED TO CATCH WITH .catch() or try/catch
async function fetchData() {
  try {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (error) {
    console.error('Fetch error:', error);
    showToast('Failed to load data', 'error');
    return null;
  }
}
```

---

## Development Mode vs Production Mode

### Development Mode (npm run dev)

```
ERROR BOUNDARY SHOWS:
┌─────────────────────────────────────┐
│ ⚠️  Chat Area                        │
├─────────────────────────────────────┤
│ Error: Cannot read property 'x'     │
│ of undefined                        │
│                                     │
│ Stack Trace:                        │
│ at MessageContent (src/components/  │
│    chat/MessageContent.tsx:123)     │
│ at ErrorBoundary...                 │
│                                     │
│ [Reload Component] [Debug Console]  │
└─────────────────────────────────────┘

✅ Full stack trace visible
✅ Exact file and line number shown
✅ Easy to debug and fix
```

### Production Mode (npm run preview / deployed)

```
ERROR BOUNDARY SHOWS:
┌─────────────────────────────────────┐
│ ⚠️  Something went wrong             │
├─────────────────────────────────────┤
│ The Chat Area encountered an        │
│ unexpected error.                   │
│                                     │
│ Try one of these:                   │
│                                     │
│ [Reload Chat] [Go to Home]          │
│ [Clear Cache & Reload]              │
│                                     │
│ If problem persists, contact        │
│ support@samvada.studio              │
└─────────────────────────────────────┘

✅ No stack traces (security)
✅ No file paths (privacy)
✅ User-friendly language
✅ Recovery options
```

---

## How to Handle Errors in Code

### Pattern 1: Component Render Error (Automatic)
```typescript
// If this throws during render, ErrorBoundary catches it automatically
function MyComponent() {
  const data = useContext(ChatContext); // Could be undefined
  
  // ❌ Risky
  return <div>{data.chatId}</div>;
  
  // ✅ Safe (ErrorBoundary catches if data is null)
  return <div>{data?.chatId}</div>;
}
```

### Pattern 2: Event Handler Error (Use try/catch)
```typescript
import { useToast } from '../context/ToastContext';

function MyComponent() {
  const { showToast } = useToast();
  
  const handleClick = async () => {
    try {
      // Do something that might fail
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      showToast('Success!', 'success');
    } catch (error) {
      // Show user-friendly error
      const message = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Error: ${message}`, 'error');
      
      // Log for debugging
      console.error('Action failed:', error);
    }
  };
  
  return <button onClick={handleClick}>Do Action</button>;
}
```

### Pattern 3: Async Data Loading (Use hook)
```typescript
function MyComponent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const json = await response.json();
        setData(json);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  return <div>{data?.name}</div>;
}
```

### Pattern 4: Conditional Rendering (Safe)
```typescript
function MyComponent() {
  const context = useContext(ChatContext);
  
  // ❌ Could crash if context is undefined
  return <div>{context.chats.map(...)}</div>;
  
  // ✅ Safe with checks
  if (!context || !context.chats) {
    return <div>No data available</div>;
  }
  
  return <div>{context.chats.map(...)}</div>;
}
```

---

## Testing Error Boundaries

### Manual Test in Dev Mode
```typescript
// Add this to any component temporarily
throw new Error('Test error for ErrorBoundary');

// Should see:
// ✅ Error message with full stack trace
// ✅ Component name from ErrorBoundary
// ✅ Reload button works
```

### Test Recovery
```typescript
// 1. Trigger error
throw new Error('Test error');

// 2. Click [Reload Component] button
// ✅ Component reloads
// ✅ App still works

// 3. Other sections still functional
// ✅ Sidebar works
// ✅ Other modals work
```

### Production Test (npm run preview)
```bash
# Build and preview production
npm run build
npm run preview

# Open browser
# 1. Trigger error (console: throw new Error('test'))
# 2. Should see user-friendly message (not stack trace)
# 3. Reload button should work
# 4. No technical details visible
```

---

## Error Logging & Tracking

### What Gets Logged

**Development:**
```javascript
// Full error logged to console
console.error('Error in [Component Name]:', error);
console.error('Stack:', error.stack);
```

**Production:**
```javascript
// Error logged for debugging (without stack trace)
console.error('Error in Chat Area (production mode)');
// Optional: Send to error tracking service
// sendToSentry(error);
```

### Integrating Error Tracking Service

To track production errors:

**1. Install Sentry (or similar):**
```bash
npm install @sentry/react
```

**2. Initialize in main.tsx:**
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**3. ErrorBoundary automatically reports:**
```typescript
// In ErrorBoundary.tsx, add:
if (process.env.NODE_ENV === 'production') {
  Sentry.captureException(error);
}
```

---

## Common Scenarios & Solutions

### Scenario 1: Chat Message Fails to Load
**What happens:**
```
User opens chat
  ↓
API fails or returns bad data
  ↓
MessageContent tries to render undefined data
  ↓
ErrorBoundary catches error
```

**User sees:**
- Dev: Full error with API response
- Prod: "Chat Area encountered an error"

**Recovery:**
- User clicks [Reload Chat]
- Retry message loading
- App stays responsive

### Scenario 2: LLM Provider Integration Error
**What happens:**
```
User clicks "Send Message"
  ↓
LLM API fails or times out
  ↓
Event handler catches error
```

**User sees:**
- Toast notification: "Error: Failed to connect to AI provider"
- Chat history preserved
- Can retry or use different provider

**Code:**
```typescript
const handleSendMessage = async () => {
  try {
    const response = await llmService.sendMessage(message);
    // Success - add to chat
  } catch (error) {
    showToast(`Failed to send: ${error.message}`, 'error');
    // Chat state unchanged - can retry
  }
};
```

### Scenario 3: Storage Quota Exceeded
**What happens:**
```
User saves many chats
  ↓
localStorage/indexedDB full
  ↓
Error when saving
```

**Code:**
```typescript
const saveChat = async (chat) => {
  try {
    await storage.save('chats', chat);
    showToast('Chat saved', 'success');
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      showToast('Storage full. Clear old chats to continue.', 'warning');
    } else {
      showToast('Failed to save chat', 'error');
    }
  }
};
```

---

## Best Practices

### DO ✅
- ✅ Add ErrorBoundary around major sections
- ✅ Use try/catch in event handlers
- ✅ Use try/catch in async functions
- ✅ Check data existence before accessing
- ✅ Show user-friendly error messages
- ✅ Log errors for debugging
- ✅ Provide recovery options
- ✅ Test error scenarios

### DON'T ❌
- ❌ Let errors bubble up unhandled
- ❌ Show technical stack traces to users
- ❌ Ignore promise rejections
- ❌ Throw errors in render without ErrorBoundary
- ❌ Log sensitive data
- ❌ Leave errors silent (always tell user)
- ❌ Make error messages too technical
- ❌ Prevent app recovery

---

## Troubleshooting

### ErrorBoundary not catching error
**Possible reasons:**
- Error in event handler (not render)
- Error in async code (Promise rejection)
- Error during server-side rendering (shouldn't happen)

**Solution:**
- Check error is during render, not in onClick
- Add try/catch to async functions
- Check console for actual error

### Users see white screen
**Possible reasons:**
- Error above root ErrorBoundary (in App.tsx layout)
- Multiple errors cascading
- ComponentDidCatch not implemented

**Solution:**
- Add ErrorBoundary at App root level
- Check if error is in CSS/build (not JS)
- Check browser console for clues
- Check NetworkError (API down?)

### Error not showing properly
**Possible reasons:**
- Error message is empty
- ErrorBoundary name not set
- Environment variable not showing in prod

**Solution:**
- Always include error message: `error.message || 'Unknown error'`
- Set ErrorBoundary name: `<ErrorBoundary name="Feature Name">`
- Check process.env.NODE_ENV is 'production'

---

## Summary

| Feature | Dev Mode | Prod Mode |
|---------|----------|-----------|
| Stack trace | ✅ Full | ❌ Hidden |
| File paths | ✅ Visible | ❌ Hidden |
| Error details | ✅ Detailed | ✅ Basic |
| Recovery UI | ✅ Tech-focused | ✅ User-friendly |
| Console log | ✅ Verbose | ✅ Safe |
| Error tracking | ✅ Console | ✅ Service optional |

**Result:** Users never see white screen, always have recovery path, developers get debug info they need.

---

## Files to Review

- `src/components/common/ErrorBoundary.tsx` - Main component
- `src/App.tsx` - ErrorBoundary usage (lines 490-518)
- `src/context/ToastContext.tsx` - User-friendly toast messages
- `.github/workflows/test.yml` - Automated error prevention
- `DEVELOPMENT_GUIDELINES.md` - Best practices
