# Security & Privacy Philosophy

> **Our Commitment**: Samvada Studio is built with **security-first** and **privacy-first** principles. This document outlines the measures we've implemented to protect your data and maintain your trust.

---

## 🔐 Core Principles

### 1. **Privacy by Design**
- **Zero Server Storage**: All data stays on your device. We don't have servers, databases, or any backend infrastructure.
- **Client-Side Only**: The entire application runs in your browser. No data ever leaves your machine except when you explicitly call an LLM API.
- **No Tracking**: No analytics, no telemetry, no usage tracking. Your conversations are yours alone.

### 2. **Security by Default**
- **No API Key Storage**: API keys are stored in memory during runtime only, never persisted to localStorage or any other storage.
- **HTTPS Everywhere**: All API calls to LLM providers use encrypted HTTPS connections.
- **Input Sanitization**: All user inputs and API responses are sanitized to prevent XSS and injection attacks.
- **Content Security**: Responses are cleaned of control characters, null bytes, and malicious content before display.

### 3. **Transparency**
- **Open Source**: Full source code available for audit at [github.com/dhruvinrsoni/samvada-studio](https://github.com/dhruvinrsoni/samvada-studio)
- **No Hidden Dependencies**: All dependencies are documented and auditable
- **Clear Data Flow**: Every piece of data's journey is documented

---

## 🛡️ Technical Security Measures

### API Key Management

**Problem**: API keys are sensitive credentials that must never be exposed.

**Our Solution**:
```typescript
// ✅ API keys stored in memory only (runtime state)
interface LLMProviderConfig {
  apiKey?: string; // ⚠️ SENSITIVE - Never stored in localStorage
  // ... other fields
}

// ✅ localStorage stores safe version without keys
interface SafeLLMProviderConfig {
  // Excludes apiKey completely
  id: string;
  name: string;
  // ... non-sensitive fields only
}

// ✅ Keys must be re-entered each session
// ❌ NEVER: localStorage.setItem('apiKey', key)
// ✅ ALWAYS: In-memory React state only
```

**Benefits**:
- Keys disappear when browser/tab closes
- No risk of key leakage from disk
- Malicious scripts can't read keys from localStorage
- Users maintain full control of their credentials

---

### Data Storage Architecture

**What We Store Locally** (localStorage):
```typescript
{
  "chats": [/* Chat history, messages, settings */],
  "providers": [/* Provider configs WITHOUT API keys */],
  "folders": [/* Chat organization */],
  "templates": [/* Prompt templates */],
  "contextPanels": [/* Context snippets */],
  "theme": "dark",
  "accentColor": "blue"
}
```

**What We NEVER Store**:
- ❌ API keys
- ❌ Passwords
- ❌ Session tokens
- ❌ OAuth tokens
- ❌ Any credentials

**Why localStorage is Safe (for non-sensitive data)**:
- ✅ Origin-isolated (only our domain can access)
- ✅ Survives page refresh (better UX)
- ✅ User data stays on their device
- ❌ NOT for sensitive data (we follow this)

---

### Input Sanitization

**Every user input goes through validation**:
```typescript
// 1. Trim whitespace
// 2. Remove null bytes (\0)
// 3. Normalize line endings
// 4. Strip control characters
// 5. Limit length
```

**API responses are sanitized**:
```typescript
export const sanitizeLLMResponse = (content: string): string => {
  // Remove null bytes
  text = text.replace(/\0/g, '');
  
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n');
  
  // Remove control characters except whitespace
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return text;
};
```

**Why This Matters**:
- Prevents XSS attacks via malicious AI responses
- Protects against injection attacks
- Ensures UI stability and correct rendering

---

### HTTPS Enforcement

**All Provider Communications are Encrypted**:

| Provider | Endpoint | Encryption |
|----------|----------|------------|
| OpenAI | `https://api.openai.com/...` | ✅ TLS 1.3 |
| Anthropic | `https://api.anthropic.com/...` | ✅ TLS 1.3 |
| Google Gemini | `https://generativelanguage.googleapis.com/...` | ✅ TLS 1.3 |
| Azure OpenAI | `https://*.openai.azure.com/...` | ✅ TLS 1.3 |
| Ollama | `http://localhost:11434/...` | ⚠️ Local only |
| Custom | User-defined | ⚠️ User responsibility |

**Important Notes**:
- Ollama is HTTP because it's localhost-only (no internet exposure)
- Custom providers default to HTTPS, but users can override (documented risk)
- All authentication headers/parameters are encrypted in transit

---

### Authentication Security

**Different providers, same security standard**:

```typescript
// OpenAI: Bearer token in header (✅ Best practice)
headers: {
  'Authorization': `Bearer ${apiKey}`
}

// Anthropic: Custom header (✅ Best practice)
headers: {
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01'
}

// Azure: API key in header (✅ Best practice)
headers: {
  'api-key': apiKey
}

// Google: Query parameter (⚠️ Google's official method)
url: `${endpoint}?key=${apiKey}`
// Note: Still encrypted via HTTPS, but visible in logs
```

**Why Headers > Query Parameters**:
- ✅ Not visible in browser history
- ✅ Not logged by intermediate proxies
- ✅ Not included in referrer headers
- ❌ Query params visible in logs (but HTTPS still encrypts)

**Google Gemini Caveat**:
- Google's official API requires `?key=` parameter
- Still secure (HTTPS encrypts the entire URL)
- Best practice: Use IP restrictions in Google Cloud Console
- Alternative: OAuth2 (more complex, for production apps)

---

### Logging Security

**Debug logs never expose sensitive data**:

```typescript
// ❌ NEVER do this:
console.log('API Key:', apiKey);

// ✅ ALWAYS do this:
logDebug('Provider Request', {
  provider: provider.name,
  endpoint: provider.apiEndpoint,
  model: provider.model,
  // ❌ NO apiKey field
});

// ✅ For debugging, mask sensitive data:
logDebug('Auth Header', {
  hasKey: !!apiKey,
  keyPrefix: apiKey?.substring(0, 7) + '...',
  keyLength: apiKey?.length
});
```

**Log Levels**:
- `DEBUG`: Development only, verbose
- `INFO`: General flow, no sensitive data
- `WARN`: Potential issues, user-visible
- `ERROR`: Failures, includes sanitized context

---

## 🔒 Privacy Measures

### No Backend = No Data Collection

**Traditional Chat Apps**:
```
User → Frontend → Backend → Database → LLM API
              ↑           ↑         ↑
        Track user   Store data  Potential leak
```

**Samvada Studio**:
```
User → Frontend → LLM API
         ↑
    No tracking, no storage
```

**What This Means**:
- ✅ We can't access your conversations (we don't have them)
- ✅ We can't sell your data (we don't collect it)
- ✅ We can't be hacked for user data (it's not on our servers)
- ✅ Government requests? We have nothing to give

---

### Local-First Architecture

**Your Data Locations**:

```
Browser Memory (Runtime):
├── Current chat session
├── API keys (temporary)
├── Active context panels
└── Component state

Browser localStorage (Persistent):
├── Chat history
├── Provider configs (NO keys)
├── Templates
├── Folders
└── Settings

Your Disk (Optional):
└── Exported chats (you control)
```

**Data Flow**:
1. You type a prompt → Memory
2. Send to LLM → HTTPS encrypted
3. Receive response → Memory
4. Display → React DOM
5. Close browser → API keys erased
6. Reopen → Enter keys again

**Privacy Benefits**:
- ✅ No cloud storage = no cloud breaches
- ✅ No user accounts = no credential theft
- ✅ No analytics = no behavior profiling
- ✅ No cookies = no tracking across sites

---

### Third-Party API Privacy

**What LLM Providers See**:
- Your prompt content
- Your API key (for authentication)
- Your IP address (from the request)
- Request metadata (timestamp, model used)

**What They DON'T See**:
- Your full chat history (only current prompt)
- Your identity (unless you tell them in prompts)
- Other chats with other providers
- Your app settings or preferences

**Provider Privacy Comparison**:

| Provider | Data Retention | Used for Training? | Privacy Policy |
|----------|----------------|-------------------|----------------|
| OpenAI | 30 days (API) | ❌ No (API tier) | [Link](https://openai.com/policies/privacy-policy) |
| Anthropic | Not retained (API) | ❌ No (API tier) | [Link](https://www.anthropic.com/privacy) |
| Google Gemini | Varies | ⚠️ Varies by tier | [Link](https://policies.google.com/privacy) |
| Azure OpenAI | Enterprise controlled | ❌ No | [Link](https://azure.microsoft.com/en-us/support/legal/) |
| Ollama | Local only | N/A | N/A (on your PC) |

**Your Responsibility**:
- ⚠️ Don't include personal info in prompts
- ⚠️ Review provider privacy policies
- ⚠️ Use enterprise tiers for sensitive work
- ✅ Use Ollama for maximum privacy (fully local)

---

## 🛠️ Security Best Practices (For Users)

### 1. **API Key Management**

✅ **DO**:
- Generate separate keys for different apps
- Use API key restrictions (IP allowlists, rate limits)
- Rotate keys regularly (monthly/quarterly)
- Revoke immediately if compromised
- Use environment variables for automation scripts

❌ **DON'T**:
- Share keys publicly or commit to git
- Use production keys in development
- Use same key across multiple apps
- Store keys in unencrypted files

### 2. **Secure Your Browser**

✅ **DO**:
- Keep browser updated
- Use HTTPS Everywhere extension
- Clear localStorage periodically
- Use private/incognito for sensitive work
- Lock your computer when away

❌ **DON'T**:
- Use public/shared computers for API access
- Install untrusted browser extensions
- Disable browser security features
- Click suspicious links in AI responses

### 3. **Prompt Hygiene**

✅ **DO**:
- Review prompts before sending
- Use generic examples instead of real data
- Anonymize sensitive information
- Use Ollama (local) for confidential work

❌ **DON'T**:
- Include passwords, keys, or tokens
- Share personal identifiable information
- Paste proprietary code (without rights)
- Include financial/health data

---

## 🔍 Security Audit Checklist

### Code Review Points

- [ ] No hardcoded credentials
- [ ] API keys never in localStorage
- [ ] All external calls use HTTPS
- [ ] User inputs sanitized
- [ ] API responses sanitized
- [ ] Error messages don't leak internals
- [ ] Logs don't contain sensitive data
- [ ] Dependencies are up-to-date
- [ ] No eval() or Function() with user input
- [ ] CSP headers configured (if hosted)

### Testing Points

- [ ] API keys cleared on browser close
- [ ] localStorage contains no secrets
- [ ] Network calls are encrypted
- [ ] XSS protection works
- [ ] Error handling doesn't expose stack traces
- [ ] Rate limiting respected
- [ ] Input validation prevents injection
- [ ] File uploads rejected (we don't support them anyway)

---

## 🚨 Incident Response

### If You Suspect a Security Issue

1. **Don't Panic**: Most issues are fixable
2. **Assess Impact**: What data might be affected?
3. **Immediate Actions**:
   - Revoke compromised API keys immediately
   - Clear browser cache/localStorage
   - Change passwords if shared
4. **Report to Us**: [Open a GitHub Issue](https://github.com/dhruvinrsoni/samvada-studio/issues) (use "Security" label)
5. **Update**: Pull latest code if a fix is released

### If You Find a Vulnerability

**Responsible Disclosure**:
- Email: [Create issue first, email for critical]
- GitHub: Open an issue with "Security" label
- Details: Steps to reproduce, impact assessment
- Timeline: We aim to respond within 48 hours

**Bug Bounty**: Not yet (but we appreciate researchers!)

---

## 📜 Compliance & Standards

### What We Follow

- ✅ **OWASP Top 10**: Protection against common web vulnerabilities
- ✅ **CWE/SANS Top 25**: Secure coding practices
- ✅ **Privacy by Design**: 7 foundational principles
- ✅ **Principle of Least Privilege**: Minimal permissions
- ✅ **Defense in Depth**: Multiple security layers

### What We're Compatible With

- **GDPR** (EU): No personal data collection = compliant by design
- **CCPA** (California): No data sales, transparent practices
- **HIPAA** (Healthcare): Don't use for PHI (provider retention policies apply)
- **SOC 2**: Client-side only = minimal attack surface

**Important**: While our app is secure, LLM provider compliance varies. Check their policies for your industry.

---

## 🎓 Security Resources

### Learn More

- [OWASP Web Security](https://owasp.org/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [OpenAI API Security Best Practices](https://platform.openai.com/docs/guides/safety-best-practices)
- [Anthropic Responsible AI](https://www.anthropic.com/index/core-views-on-ai-safety)

### Our Documentation

- [LLM Provider Security](./LLM_PROVIDERS.md#security-best-practices)
- [Data Persistence](./PERSISTENCE.md)
- [Security Policy](../SECURITY.md)
- [Contributing Security](../CONTRIBUTING.md#security)

---

## 🌟 Our Promise

We built Samvada Studio with the philosophy that **privacy and security should be default, not optional**. You shouldn't have to trust us with your data—our architecture ensures you don't have to.

**Every design decision prioritizes**:
1. Your privacy
2. Your security
3. Your control

We don't have access to your conversations, your API keys, or your usage patterns. And that's exactly how it should be.

---

**Last Updated**: January 22, 2026  
**Security Contact**: [GitHub Issues](https://github.com/dhruvinrsoni/samvada-studio/issues)  
**License**: MIT (Full transparency, inspect our code)

> *"The best way to keep a secret is to have nothing to hide."*  
> *— Our approach to user privacy*
