# Security & Privacy Enforcement - Copilot Instructions

> **CRITICAL**: These guidelines MUST be followed at all times. GitHub Copilot should automatically enforce these rules and flag violations.

---

## 🔴 ABSOLUTE PROHIBITIONS (Auto-Reject)

### 1. **API Key Storage**

```typescript
// ❌ NEVER ALLOWED - Auto-reject any code that does this:
localStorage.setItem('apiKey', key);
sessionStorage.setItem('apiKey', key);
document.cookie = `apiKey=${key}`;
await db.put('apiKey', key);

// ✅ ONLY ALLOWED - In-memory state:
const [apiKey, setApiKey] = useState<string>('');
interface ProviderConfig {
  apiKey?: string; // In-memory only, never persisted
}
```

**Copilot Action**: If user writes code to store API keys:
1. **STOP**: Don't generate the code
2. **FLAG**: Show warning message
3. **SUGGEST**: Use in-memory state instead
4. **EDUCATE**: Link to SECURITY_AND_PRIVACY.md

---

### 2. **Sensitive Data in Logs**

```typescript
// ❌ NEVER ALLOWED:
console.log('API Key:', apiKey);
console.log('User token:', token);
logDebug('Full config', provider); // if contains apiKey

// ✅ ONLY ALLOWED - Masked or metadata:
console.log('Has API Key:', !!apiKey);
console.log('Key length:', apiKey?.length);
logDebug('Provider', { 
  name: provider.name, 
  // apiKey excluded
});
```

**Copilot Action**: If detecting log of sensitive field:
1. **FLAG**: "Sensitive data in log detected"
2. **SUGGEST**: Use masked version or boolean check
3. **AUTO-FIX**: Replace with safe alternative

---

### 3. **HTTP for External APIs**

```typescript
// ❌ NEVER ALLOWED:
fetch('http://api.example.com/...');
const endpoint = 'http://unsecure-api.com';

// ✅ ONLY ALLOWED:
fetch('https://api.example.com/...');
const endpoint = 'https://secure-api.com';

// ⚠️ EXCEPTION: localhost only
fetch('http://localhost:11434/...'); // OK for Ollama
```

**Copilot Action**: If detecting HTTP for external API:
1. **FLAG**: "Insecure HTTP detected"
2. **SUGGEST**: Change to HTTPS
3. **AUTO-FIX**: Replace `http://` with `https://`
4. **EXCEPTION**: Allow localhost/127.0.0.1

---

### 4. **Unsafe User Input Handling**

```typescript
// ❌ NEVER ALLOWED:
const html = `<div>${userInput}</div>`; // XSS risk
eval(userInput);
new Function(userInput)();
dangerouslySetInnerHTML={{ __html: userInput }};

// ✅ ONLY ALLOWED - Sanitized:
const html = `<div>${sanitizeInput(userInput)}</div>`;
const content = DOMPurify.sanitize(userInput);
<div>{escapeHtml(userInput)}</div>
```

**Copilot Action**: If detecting unsafe input:
1. **BLOCK**: Prevent code generation
2. **FLAG**: "Potential XSS vulnerability"
3. **SUGGEST**: Use sanitization function
4. **REQUIRE**: Input validation before use

---

## 🟡 MUST-FOLLOW PATTERNS (Auto-Enforce)

### 1. **Authentication Headers**

```typescript
// ✅ PREFER - Headers for auth:
headers: {
  'Authorization': `Bearer ${apiKey}`,
  'x-api-key': apiKey,
  'api-key': apiKey
}

// ⚠️ AVOID - Query parameters (unless provider requires):
url: `${endpoint}?key=${apiKey}` 
// Only OK if provider's official method (document reason)
```

**Copilot Action**: When generating API calls:
1. **DEFAULT**: Use header-based auth
2. **WARN**: If query param used, request justification
3. **DOCUMENT**: Add comment explaining provider requirement

---

### 2. **Input Sanitization**

```typescript
// ✅ ALWAYS - Sanitize external data:
const sanitized = sanitizeLLMResponse(apiResponse);
const clean = sanitizeInput(userInput);
const safe = text.replace(/[\x00-\x1F\x7F]/g, '');

// ❌ NEVER - Direct use:
setState(apiResponse); // Unsanitized
display(userInput); // Unsanitized
```

**Copilot Action**: When handling external data:
1. **AUTO-INSERT**: Sanitization call
2. **FLAG**: If used directly without sanitization
3. **SUGGEST**: Appropriate sanitization function

---

### 3. **Error Handling Security**

```typescript
// ❌ NEVER - Expose internals:
throw new Error(`Database error: ${dbError.stack}`);
return res.json({ error: fullException });

// ✅ ALWAYS - User-safe messages:
throw new Error('Failed to save data. Please try again.');
logError('DB Error', error, { context: 'user-save' });
return { success: false, message: 'Operation failed' };
```

**Copilot Action**: When generating error handling:
1. **DEFAULT**: Generic user messages
2. **SEPARATE**: Detailed logs from user output
3. **MASK**: Stack traces, file paths, internal IDs

---

### 4. **Dependency Security**

```typescript
// ✅ ALWAYS - Verify before adding:
// 1. Check npm audit report
// 2. Review package for known vulnerabilities
// 3. Prefer well-maintained, popular packages
// 4. Pin versions in package.json

// ❌ NEVER:
// - Use deprecated packages
// - Install from untrusted sources
// - Use packages with known CVEs
```

**Copilot Action**: When suggesting dependencies:
1. **CHECK**: Known vulnerabilities
2. **WARN**: If package has security issues
3. **SUGGEST**: Secure alternatives
4. **REMIND**: Run `npm audit` after install

---

## 🟢 SECURITY-FIRST DESIGN (Auto-Guide)

### 1. **Principle of Least Privilege**

```typescript
// ✅ GOOD - Minimal scope:
const { name, endpoint } = provider; // Only what's needed

// ❌ BAD - Over-exposure:
const provider = allProviders; // Everything exposed
```

**Copilot Guidance**: When structuring code:
- Suggest minimal data access
- Recommend scoped variables
- Prefer explicit over implicit access

---

### 2. **Defense in Depth**

```typescript
// ✅ GOOD - Multiple validation layers:
function processInput(input: string) {
  // Layer 1: Type check
  if (typeof input !== 'string') return '';
  
  // Layer 2: Length limit
  if (input.length > MAX_LENGTH) return '';
  
  // Layer 3: Sanitization
  const sanitized = sanitize(input);
  
  // Layer 4: Validation
  if (!isValid(sanitized)) return '';
  
  return sanitized;
}

// ❌ BAD - Single check:
function processInput(input: string) {
  return sanitize(input); // Only one layer
}
```

**Copilot Guidance**: When generating validation:
- Add multiple security layers
- Fail securely (default to safe state)
- Log security-relevant events

---

### 3. **Secure Defaults**

```typescript
// ✅ GOOD - Secure by default:
interface Config {
  enableDebugLogs: boolean = false; // Default off
  allowHttpEndpoints: boolean = false; // Default deny
  requireHttps: boolean = true; // Default secure
}

// ❌ BAD - Insecure defaults:
interface Config {
  enableDebugLogs: boolean = true; // Leaky by default
  allowHttpEndpoints: boolean = true; // Insecure by default
}
```

**Copilot Guidance**: When creating config:
- Default to most secure option
- Require explicit opt-in for insecure features
- Document security implications

---

## 🔧 AUTO-FIX RULES

### Rule 1: API Key Detection
```typescript
// DETECTED:
const apiKey = 'sk-1234567890abcdef';

// AUTO-FIX:
const apiKey = process.env.API_KEY; // ✅
// + ADD WARNING: "Never hardcode credentials"
```

### Rule 2: HTTP in Production
```typescript
// DETECTED:
const API_URL = 'http://api.example.com';

// AUTO-FIX:
const API_URL = 'https://api.example.com'; // ✅
// + ADD COMMENT: "Always use HTTPS for external APIs"
```

### Rule 3: Unescaped User Input
```typescript
// DETECTED:
<div>{userInput}</div>

// AUTO-FIX:
<div>{escapeHtml(userInput)}</div> // ✅
// + ADD IMPORT: import { escapeHtml } from './utils'
```

### Rule 4: Broad Error Exposure
```typescript
// DETECTED:
catch (error) {
  alert(error.stack);
}

// AUTO-FIX:
catch (error) {
  logError('Operation failed', error);
  alert('An error occurred. Please try again.');
} // ✅
```

---

## 📋 SECURITY CHECKLIST (Pre-Commit)

Before committing code, Copilot should verify:

- [ ] No hardcoded credentials
- [ ] No API keys in localStorage/cookies
- [ ] All external APIs use HTTPS (except localhost)
- [ ] User inputs sanitized
- [ ] API responses sanitized
- [ ] Error messages don't expose internals
- [ ] Logs don't contain sensitive data
- [ ] Dependencies have no known vulnerabilities
- [ ] Authentication uses headers (preferred)
- [ ] No eval() or Function() with user input

**Copilot Action**: Run this checklist automatically:
- On file save
- On commit preparation
- When user asks for code review

---

## 🚨 VIOLATION SEVERITY LEVELS

### 🔴 CRITICAL (Block Immediately)
- API keys in localStorage
- Credentials in source code
- eval() with user input
- SQL/Command injection risks

**Action**: **BLOCK** code generation, show error, require fix

### 🟠 HIGH (Flag & Suggest Fix)
- HTTP for external APIs
- Unescaped user input in HTML
- Sensitive data in logs
- Missing input validation

**Action**: **WARN**, provide fix, allow override with justification

### 🟡 MEDIUM (Suggest Improvement)
- Query param auth (when header possible)
- Single-layer validation
- Generic error messages could be better
- Missing rate limiting

**Action**: **SUGGEST** improvement, allow current approach

### 🟢 LOW (Best Practice Reminder)
- Could add more specific logging
- Could improve error context
- Could optimize security check

**Action**: **MENTION** in code review, no blocking

---

## 💡 PROACTIVE SUGGESTIONS

### When User Writes API Call:
```
🤖 Copilot: "I notice you're making an API call. 
I've added:
✅ HTTPS check
✅ Header-based authentication  
✅ Error handling with secure messages
✅ Response sanitization
✅ Request logging (without sensitive data)
```

### When User Stores Data:
```
🤖 Copilot: "I notice you're storing data.
Checking security:
✅ Not storing API keys
✅ Using localStorage (not cookies for this data type)
⚠️ Consider: Do you need encryption for this data?
```

### When User Handles Input:
```
🤖 Copilot: "I notice user input handling.
I've added:
✅ Input sanitization
✅ Length validation
✅ Type checking
✅ XSS protection
```

---

## 🎓 EDUCATIONAL MODE

When Copilot detects security issues, explain WHY:

```
❌ Detected: localStorage.setItem('apiKey', key)

🤖 Why this is dangerous:
1. localStorage is persistent (survives browser restart)
2. Accessible by any script on the same origin
3. Can be read by malicious browser extensions
4. Leaked if disk is compromised
5. No expiration mechanism

✅ Better approach:
- Use in-memory state (React useState)
- Keys cleared when tab closes
- Not accessible from localStorage
- User must re-enter each session

📚 Learn more: docs/SECURITY_AND_PRIVACY.md#api-key-management
```

---

## 🔍 CODE REVIEW MODE

When user asks for review, check:

```typescript
// USER CODE:
const saveProvider = (provider) => {
  localStorage.setItem('provider', JSON.stringify(provider));
};

// COPILOT REVIEW:
🔍 Security Analysis:
⚠️ ISSUE: Provider object may contain API key
⚠️ SEVERITY: Critical
⚠️ RISK: API key exposed in localStorage

✅ SUGGESTED FIX:
const saveProvider = (provider: LLMProviderConfig) => {
  // Create safe version without sensitive data
  const safeProvider: SafeLLMProviderConfig = {
    id: provider.id,
    name: provider.name,
    // ... exclude apiKey
  };
  localStorage.setItem('provider', JSON.stringify(safeProvider));
};

📝 ADDITIONAL: Create SafeLLMProviderConfig type if not exists
```

---

## 🎯 SUMMARY: COPILOT'S SECURITY RESPONSIBILITIES

1. **PREVENT** critical security violations (API keys in storage, etc.)
2. **DETECT** security anti-patterns (HTTP, unsanitized input, etc.)
3. **SUGGEST** secure alternatives (auto-fix when possible)
4. **EDUCATE** user on why security matters (with docs links)
5. **ENFORCE** best practices (via code generation defaults)
6. **REVIEW** code for security issues (when asked)
7. **GUIDE** toward security-first design patterns

---

**Remember**: Security is not optional. Every line of code should be written with security in mind. Copilot should be the first line of defense, catching issues before they become vulnerabilities.

---

**Last Updated**: January 22, 2026  
**Enforcement Level**: Mandatory  
**Review Frequency**: On every code generation, save, and commit
