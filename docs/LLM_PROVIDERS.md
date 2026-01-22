# LLM Provider Implementation Guide

This document outlines how LLM providers are implemented in Samvada Studio and how to add new ones.

## 🎯 Design Principles

### Security by Default
- ✅ API keys never stored in `localStorage`
- ✅ All API calls use HTTPS
- ✅ Sensitive data sanitized in logs
- ✅ Headers preferred over query parameters for authentication

### Consistency
- ✅ All providers follow the same interface
- ✅ Standardized error handling
- ✅ Common response sanitization
- ✅ Unified testing mechanism

### User Experience
- ✅ Dynamic model fetching where available
- ✅ Helpful error messages with actionable suggestions
- ✅ Connection testing before use
- ✅ Comprehensive logging for debugging

---

## 📋 Supported Providers

| Provider | Authentication | Model Discovery | Endpoint Format | Status |
|----------|----------------|-----------------|-----------------|--------|
| **OpenAI** | `Authorization: Bearer` | ✅ Dynamic from API | `https://api.openai.com/v1/chat/completions` | ✅ Production |
| **Anthropic** | `x-api-key` header | ⚠️ Validated + Hardcoded | `https://api.anthropic.com/v1/messages` | ✅ Production |
| **Google Gemini** | Query param `?key=` | ✅ Dynamic from API | `https://generativelanguage.googleapis.com/v1beta` | ✅ Production |
| **Ollama** | None (localhost) | ✅ Dynamic from `/api/tags` | `http://localhost:11434/api/generate` | ✅ Production |
| **Azure OpenAI** | `api-key` header | ⚠️ Deployment-based | `https://{resource}.openai.azure.com/...` | ✅ Production |
| **Custom** | `Authorization: Bearer` | Manual | User-defined | ✅ Beta |

---

## 🔧 Provider Implementation Checklist

When adding a new provider, you MUST implement:

### 1. **API Call Handler** (`callLLMProvider`)

```typescript
case 'your-provider':
  response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`, // Or provider-specific auth
    },
    body: JSON.stringify({
      // Provider-specific request format
      model: provider.model,
      messages: [...],
      // ... other settings
    }),
  });

  if (!response.ok) {
    // Detailed error handling
    throw new Error(`Provider API error: ${response.status}`);
  }

  const data = await response.json();
  content = sanitizeLLMResponse(data.your.response.path);
  break;
```

### 2. **Model Fetching Function**

```typescript
export const fetchYourProviderModels = async (
  apiKey: string
): Promise<{ success: boolean; models: string[]; error?: string }> => {
  try {
    // Fetch from API OR validate key + return known models
    const response = await fetch('https://api.provider.com/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Invalid API key');
      throw new Error(`Failed: ${response.status}`);
    }

    const data = await response.json();
    const models = data.models.map(m => m.id);
    
    return { success: true, models };
  } catch (error) {
    return {
      success: false,
      models: [],
      error: error instanceof Error ? error.message : 'Failed to fetch',
    };
  }
};
```

### 3. **Connection Testing**

Connection testing is already generic, but add provider-specific pre-flight checks in `testProviderConnection()`:

```typescript
// Add in testProviderConnection() before the actual API call
if (provider.type === 'your-provider') {
  // Pre-flight checks
  if (!provider.apiKey?.startsWith('expected-prefix-')) {
    return { 
      success: false, 
      message: 'Invalid API key format. Keys should start with "expected-prefix-"' 
    };
  }
  
  // Endpoint validation
  if (!provider.apiEndpoint.includes('required-path')) {
    return {
      success: false,
      message: 'Endpoint must include "required-path"'
    };
  }
}
```

### 4. **Error Handling**

Implement specific error codes:

```typescript
if (!response.ok) {
  const errorText = await response.text();
  logError('Provider Error', new Error(`HTTP ${response.status}`), {
    requestId,
    status: response.status,
    errorBody: errorText,
  });
  
  // Provider-specific error messages
  if (response.status === 401) {
    throw new Error('Invalid API key. Check your credentials.');
  }
  if (response.status === 403) {
    throw new Error('Permission denied. Check API key permissions.');
  }
  if (response.status === 404) {
    throw new Error(`Model "${provider.model}" not found.`);
  }
  if (response.status === 429) {
    throw new Error('Rate limit exceeded. Try again later.');
  }
  if (response.status >= 500) {
    throw new Error('Service unavailable. Provider is down.');
  }
  
  throw new Error(`API error: ${response.status} - ${errorText}`);
}
```

### 5. **Configuration Defaults**

Add to `ProviderForm.tsx`:

```typescript
const PROVIDER_TYPES = [
  // ...
  { type: 'your-provider', label: 'Your Provider Name', icon: '🚀' },
];

const DEFAULT_ENDPOINTS = {
  // ...
  'your-provider': 'https://api.yourprovider.com/v1/chat',
};

const DEFAULT_MODELS = {
  // ...
  'your-provider': ['model-1', 'model-2', 'model-3'],
};
```

---

## 🔍 Provider-Specific Details

### **OpenAI**
- **Authentication**: Bearer token in `Authorization` header
- **Model Discovery**: Dynamic via `/v1/models` endpoint
- **Special Notes**: 
  - Filters for chat models (excludes embeddings, TTS, etc.)
  - Sorts by generation (GPT-4 > GPT-3.5)

### **Anthropic (Claude)**
- **Authentication**: API key in `x-api-key` header
- **Model Discovery**: No API endpoint, validates key with test call
- **Special Notes**: 
  - Requires `anthropic-version: 2023-06-01` header
  - Models are hardcoded but verified as valid
  - System prompt sent separately from messages

### **Google Gemini**
- **Authentication**: API key in URL query parameter `?key=`
- **Model Discovery**: Dynamic via `/v1beta/models` endpoint
- **Special Notes**: 
  - Filters for models with `generateContent` capability
  - Auto-corrects old `/models` endpoint format
  - Model names stripped of `models/` prefix

### **Ollama**
- **Authentication**: None (local service)
- **Model Discovery**: Dynamic via `/api/tags` endpoint
- **Special Notes**: 
  - Checks if service is running before operations
  - Verifies model installation
  - Provides `ollama pull` commands in error messages
  - 3-second connection timeout

### **Azure OpenAI**
- **Authentication**: API key in `api-key` header (NOT Bearer)
- **Model Discovery**: Deployment-based (no model listing)
- **Special Notes**: 
  - Endpoint must include `api-version` query parameter
  - "Model" field is actually deployment name
  - Format: `https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-01`

### **Custom Provider**
- **Authentication**: Bearer token (OpenAI-compatible default)
- **Model Discovery**: Manual entry
- **Special Notes**: 
  - Assumes OpenAI-compatible API format
  - Tries multiple response formats: `choices[0].message.content`, `response`, or `text`
  - Fallback for providers not natively supported

---

## 🛡️ Security Best Practices

### ✅ DO
- Store API keys in memory only (runtime state)
- Use HTTPS for all API calls
- Sanitize all responses before displaying
- Log errors without exposing sensitive data
- Use headers for authentication when possible
- Validate inputs before sending to API
- Provide clear error messages to users

### ❌ DON'T
- Store API keys in localStorage/sessionStorage
- Log full API keys (use masked versions)
- Trust raw API responses without sanitization
- Expose internal error details to users
- Use HTTP for any provider communication
- Hardcode credentials in source code

---

## 📖 Example: Adding a New Provider

Let's say you want to add support for "Mistral AI":

### Step 1: Add to Types
```typescript
// src/types/index.ts
export type LLMProviderType = '...' | 'mistral';
```

### Step 2: Add Configuration
```typescript
// src/components/admin/ProviderForm.tsx
const PROVIDER_TYPES = [
  // ...
  { type: 'mistral', label: 'Mistral AI', icon: '🌬️' },
];

const DEFAULT_ENDPOINTS = {
  // ...
  mistral: 'https://api.mistral.ai/v1/chat/completions',
};

const DEFAULT_MODELS = {
  // ...
  mistral: ['mistral-tiny', 'mistral-small', 'mistral-medium'],
};
```

### Step 3: Implement API Handler
```typescript
// src/utils/llmService.ts
case 'mistral':
  response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: provider.settings.temperature,
      max_tokens: provider.settings.maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
  }

  const mistralData = await response.json();
  content = sanitizeLLMResponse(mistralData.choices[0].message.content);
  break;
```

### Step 4: Add Model Fetching
```typescript
export const fetchMistralModels = async (
  apiKey: string
): Promise<{ success: boolean; models: string[]; error?: string }> => {
  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed: ${response.status}`);
    }

    const data = await response.json();
    const models = data.data.map((m: any) => m.id);
    return { success: true, models };
  } catch (error) {
    return {
      success: false,
      models: [],
      error: error instanceof Error ? error.message : 'Failed',
    };
  }
};
```

### Step 5: Hook into ProviderForm
```typescript
// In ProviderForm.tsx useEffect for dynamic model fetching
case 'mistral':
  const mistralResult = await fetchMistralModels(formData.apiKey);
  if (mistralResult.success) {
    setDynamicModels(mistralResult.models);
  }
  break;
```

---

## 🧪 Testing Checklist

Before submitting a new provider:

- [ ] Connection test passes with valid credentials
- [ ] Connection test fails gracefully with invalid credentials
- [ ] Model fetching works (if supported)
- [ ] Actual chat completion request/response works
- [ ] Error messages are helpful and actionable
- [ ] Logs don't expose sensitive data
- [ ] TypeScript types are satisfied
- [ ] Provider appears correctly in UI
- [ ] Default settings are sensible
- [ ] Documentation updated in this file

---

## 🚀 Future Enhancements

Ideas for improving provider support:

1. **OAuth2 Support**: For providers that support OAuth flows
2. **Streaming Responses**: SSE support for real-time responses
3. **Function Calling**: Structured outputs and tool use
4. **Image Generation**: Support for DALL-E, Midjourney, etc.
5. **Embeddings**: For RAG and semantic search
6. **Fine-tuned Models**: User-specific model management
7. **Cost Tracking**: Token usage and pricing per provider
8. **Response Caching**: Reduce API calls for repeated prompts

---

**Questions?** Check the implementation in `src/utils/llmService.ts` for reference examples.
