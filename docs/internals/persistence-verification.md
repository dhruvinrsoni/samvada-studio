# Persistence Verification Guide

This guide helps you verify that persistence is working correctly in Samvada Studio.

## Quick Test (2 minutes)

### Step 1: Create Some Data
1. Open the app at http://localhost:5173
2. Click "New Chat" in the sidebar
3. Type a message and send it (e.g., "Hello, this is a test")
4. Click the Admin button (⚙️ gear icon)
5. Add a new provider (any provider, with or without API key)
6. Click Save

### Step 2: Reload
1. Press `F5` or `Ctrl+R` to reload the page
2. Wait 2-3 seconds for the app to load

### Step 3: Verify
✅ **SUCCESS if you see:**
- Your chat with the test message is still there
- Your provider configuration is still there (in Admin panel)
- If you added an API key, it should still work

❌ **FAILURE if:**
- Chats are gone (sidebar is empty)
- Provider is gone (back to default Ollama only)
- API key is missing (but provider config is there)

## Console Tests (Advanced)

Open DevTools (`F12`) → Console tab and run these commands:

### Check Current Storage
```javascript
__SAMVADA_PERSISTENCE__.checkStorage()
```

**Expected Output:**
```
✅ Persistence Status:
   State size: 2.45 KB
   Sensitive size: 0.12 KB
   Chats: 1
   Providers: 2
   Templates: 0
   Folders: 0
```

### Check Storage Quota
```javascript
__SAMVADA_PERSISTENCE__.checkQuota()
```

**Expected Output:**
```
📊 Storage Quota:
   Used: 2.57 KB
   Estimated Limit: 5 MB
   Usage: 0.05%
```

### List All Keys
```javascript
__SAMVADA_PERSISTENCE__.listKeys()
```

**Expected Output:**
```
🔑 LocalStorage Keys:
   samvada-studio-state: 2.45 KB
   samvada-studio-sensitive: 0.12 KB
```

### Verify API Key Encoding
```javascript
__SAMVADA_PERSISTENCE__.verifyEncoding()
```

**Expected Output:**
```
🔐 Encoded API Keys:
   Providers with keys: 1
   openai-abc123: dmFsdWVzYXJlZW5jb2...
   ✅ Keys are encoded (not plaintext)
```

## Common Issues

### Issue 1: Data Not Persisting

**Symptoms:**
- Chats disappear on reload
- Provider configs reset

**Possible Causes:**
1. Browser in Incognito/Private mode (localStorage disabled)
2. Browser settings blocking localStorage
3. Storage quota exceeded (rare with normal use)

**Solutions:**
```javascript
// Check if localStorage is available
if (typeof localStorage !== 'undefined') {
  console.log('✅ localStorage is available');
} else {
  console.error('❌ localStorage is NOT available');
}

// Check quota
__SAMVADA_PERSISTENCE__.checkQuota()

// Try manual save
localStorage.setItem('test', 'value')
console.log(localStorage.getItem('test')) // Should show 'value'
localStorage.removeItem('test')
```

### Issue 2: API Keys Not Persisting

**Symptoms:**
- Provider config saves but API key is empty after reload
- Have to re-enter API key every time

**Diagnosis:**
```javascript
// Check if sensitive storage exists
const sensitive = localStorage.getItem('samvada-studio-sensitive')
if (sensitive) {
  console.log('✅ Sensitive storage exists:', sensitive.length, 'bytes')
  console.log('   Content:', sensitive.substring(0, 50) + '...')
} else {
  console.error('❌ Sensitive storage is empty')
}
```

**If this shows the key is saved but still missing:**
1. Check browser console for errors during load
2. Clear all data and try again
3. Report bug with console errors

### Issue 3: Storage Quota Exceeded

**Symptoms:**
- Console shows error: "QuotaExceededError"
- New chats don't save

**Solution:**
```javascript
// Check current usage
__SAMVADA_PERSISTENCE__.checkQuota()

// Export and backup important chats
__SAMVADA_PERSISTENCE__.exportBackup()

// Clear old data
__SAMVADA_PERSISTENCE__.clearAllData() // ⚠️ Deletes everything!
```

## Browser Compatibility

| Browser | LocalStorage | Notes |
|---------|--------------|-------|
| Chrome 90+ | ✅ Full support | Recommended |
| Edge 90+ | ✅ Full support | Recommended |
| Firefox 88+ | ✅ Full support | Works great |
| Safari 14+ | ✅ Full support | May have stricter limits |
| Opera 76+ | ✅ Full support | Works fine |
| Brave | ✅ Full support | Check shield settings |

### Private/Incognito Mode
❌ **Will NOT persist** - localStorage is disabled in private browsing

### Mobile Browsers
⚠️ **Limited support** - May have lower quota limits (2MB instead of 5MB)

## Manual Backup/Restore

### Create Backup
```javascript
__SAMVADA_PERSISTENCE__.exportBackup()
// Downloads: samvada-backup-1234567890.json
```

### Restore from Backup
1. Open DevTools Console
2. Run:
```javascript
// Create file input
const input = document.createElement('input')
input.type = 'file'
input.accept = 'application/json'
input.onchange = (e) => {
  __SAMVADA_PERSISTENCE__.importBackup(e.target.files[0])
}
input.click()
```
3. Select your backup file
4. Reload page

## Development Mode Tests

### Test Persistence Cycle
```javascript
// 1. Check current state
const before = __SAMVADA_PERSISTENCE__.checkStorage()

// 2. Modify something in UI (create chat, add provider)

// 3. Check state again
const after = __SAMVADA_PERSISTENCE__.checkStorage()

// 4. Compare
console.log('Chats before:', before.chats, 'after:', after.chats)
console.log('Providers before:', before.providers, 'after:', after.providers)

// 5. Reload page and verify data persists
```

### Simulate Data Growth
```javascript
// Project size with 50 chats
__SAMVADA_PERSISTENCE__.testGrowth(50)

// Output shows estimated storage needed
```

### Force Clear and Reset
```javascript
// Nuclear option: delete everything
__SAMVADA_PERSISTENCE__.clearAllData()
// Then reload page
location.reload()
```

## Success Criteria

Your persistence implementation is working correctly if:

- [x] New chats persist across page reloads
- [x] Provider configurations persist (including API keys)
- [x] Templates persist
- [x] Folders persist
- [x] Theme settings persist
- [x] Voice settings persist
- [x] UI preferences persist
- [x] Storage usage is reasonable (<100KB for typical use)
- [x] No console errors related to localStorage
- [x] Works in all major browsers (Chrome, Firefox, Edge, Safari)

## Getting Help

If persistence is not working after following this guide:

1. **Check Browser Console** (`F12` → Console)
   - Look for red error messages
   - Copy any errors mentioning "localStorage" or "storage"

2. **Check Browser Settings**
   - Ensure cookies/storage are enabled
   - Check if ad blockers are interfering

3. **Run Diagnostics**
   ```javascript
   // Full diagnostic
   __SAMVADA_PERSISTENCE__.checkStorage()
   __SAMVADA_PERSISTENCE__.checkQuota()
   __SAMVADA_PERSISTENCE__.listKeys()
   __SAMVADA_PERSISTENCE__.verifyEncoding()
   ```

4. **Report Issue**
   - Include browser name and version
   - Include console output from diagnostics
   - Include any error messages

---

**Last Updated**: January 21, 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
