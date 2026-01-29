// LLM Service - Supports multiple providers
import { generateId } from './helpers';
import type { Message, Draft, LLMProviderConfig, ChatSettings } from '../types';
import { logDebug, logError, logWarning } from './debug';

export interface LLMResponse {
  message: Message;
  processingTime: number;
}

/**
 * Check if local network access is allowed
 * Returns true if allowed or not needed, false if denied
 */
const checkLocalNetworkPermission = (endpoint: string): boolean => {
  // Check if endpoint is localhost/local network
  const isLocalEndpoint = endpoint.includes('localhost') || 
                          endpoint.includes('127.0.0.1') ||
                          endpoint.includes('192.168.') ||
                          endpoint.includes('10.') ||
                          endpoint.includes('172.16.') ||
                          endpoint.includes('172.17.') ||
                          endpoint.includes('172.18.') ||
                          endpoint.includes('172.19.') ||
                          endpoint.includes('172.20.') ||
                          endpoint.includes('172.21.') ||
                          endpoint.includes('172.22.') ||
                          endpoint.includes('172.23.') ||
                          endpoint.includes('172.24.') ||
                          endpoint.includes('172.25.') ||
                          endpoint.includes('172.26.') ||
                          endpoint.includes('172.27.') ||
                          endpoint.includes('172.28.') ||
                          endpoint.includes('172.29.') ||
                          endpoint.includes('172.30.') ||
                          endpoint.includes('172.31.');

  if (!isLocalEndpoint) {
    return true; // Not a local endpoint, no permission needed
  }

  // Check stored permission
  const permission = localStorage.getItem('samvada-local-network-permission');
  
  if (permission === 'denied') {
    return false; // Permission explicitly denied
  }

  // If not set or granted, allow (will prompt on first use via hook)
  return true;
};

/**
 * Build system prompt with formatting profile instructions
 */
export const buildSystemPromptWithFormatting = (
  baseSystemPrompt: string | undefined,
  chatSettings: ChatSettings
): string => {
  let systemPrompt = baseSystemPrompt || '';
  
  // Add role if specified
  if (chatSettings.role) {
    systemPrompt += `\n\nYou are a ${chatSettings.role}.`;
  }
  
  // Add custom instructions
  if (chatSettings.customInstructions) {
    systemPrompt += `\n\n${chatSettings.customInstructions}`;
  }
  
  // Add formatting profile instructions
  if (chatSettings.formattingProfile) {
    const profile = chatSettings.formattingProfile;
    
    systemPrompt += `\n\n## FORMATTING REQUIREMENTS`;
    systemPrompt += `\nProfile: ${profile.name}`;
    
    if (profile.responseFormat) {
      systemPrompt += `\nResponse Format: ${profile.responseFormat}`;
    }
    
    if (profile.stylePreferences) {
      systemPrompt += `\n\nStyle: ${profile.stylePreferences}`;
    }
    
    // Add enabled rules
    const enabledRules = profile.rules.filter(r => r.isEnabled);
    if (enabledRules.length > 0) {
      systemPrompt += `\n\nFormatting Rules:`;
      enabledRules.forEach((rule, index) => {
        systemPrompt += `\n${index + 1}. [${rule.type.toUpperCase()}] ${rule.name}: ${rule.value}`;
      });
    }
  }
  
  // Add always include items
  if (chatSettings.alwaysInclude.length > 0) {
    systemPrompt += `\n\nAlways Include: ${chatSettings.alwaysInclude.join(', ')}`;
  }
  
  // Add always exclude items
  if (chatSettings.alwaysExclude.length > 0) {
    systemPrompt += `\n\nAlways Exclude: ${chatSettings.alwaysExclude.join(', ')}`;
  }
  
  // Add examples if provided
  if (chatSettings.examples.length > 0) {
    systemPrompt += `\n\n## EXAMPLES`;
    chatSettings.examples.forEach((example, index) => {
      systemPrompt += `\n\nExample ${index + 1}:`;
      systemPrompt += `\nInput: ${example.input}`;
      systemPrompt += `\nOutput: ${example.output}`;
    });
  }
  
  return systemPrompt.trim();
};

/**
 * Sanitize LLM response content
 * Cleans up common issues and ensures safe text output
 */
const sanitizeLLMResponse = (content: string | null | undefined): string => {
  if (!content) return '';
  
  // Ensure it's a string
  let text = String(content);
  
  // Trim whitespace
  text = text.trim();
  
  // Remove any null bytes
  text = text.replace(/\0/g, '');
  
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Remove control characters except common whitespace
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return text;
};

// Real API call to LLM provider
export const callLLMProvider = async (
  provider: LLMProviderConfig,
  prompt: string,
  systemPrompt?: string
): Promise<LLMResponse> => {
  const startTime = Date.now();
  const requestId = generateId();

  logDebug('LLM Request', {
    requestId,
    provider: provider.name,
    providerType: provider.type,
    endpoint: provider.apiEndpoint,
    model: provider.model,
    promptLength: prompt.length,
    hasSystemPrompt: !!systemPrompt,
  });

  // Ensure API endpoint is defined
  if (!provider.apiEndpoint) {
    const error = new Error(`API endpoint not configured for provider: ${provider.name}`);
    logError('LLM Configuration Error', error, { provider: provider.name });
    throw error;
  }

  const endpoint = provider.apiEndpoint;

  // Check local network permission for local endpoints
  if (!checkLocalNetworkPermission(endpoint)) {
    const error = new Error(
      `🌐 Local network access denied.\n\n` +
      `${provider.name} requires access to ${endpoint}.\n\n` +
      `Please enable local network access in Admin Settings → General → Local Network Access`
    );
    logError('Local Network Permission Denied', error, { 
      provider: provider.name,
      endpoint 
    });
    throw error;
  }

  try {
    let response: Response;
    let content: string;

    switch (provider.type) {
      case 'openai':
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
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const openaiData = await response.json();
        content = sanitizeLLMResponse(openaiData.choices[0].message.content);
        break;

      case 'azure':
        // Azure uses api-key header (not Bearer) and deployment-based endpoints
        if (!endpoint.includes('api-version')) {
          throw new Error('Azure endpoint must include api-version parameter (e.g., ?api-version=2024-02-01)');
        }
        
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': provider.apiKey || '', // Azure uses api-key header
          },
          body: JSON.stringify({
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
          logError('Azure API Error', new Error(`HTTP ${response.status}`), {
            requestId,
            status: response.status,
            errorBody: errorText,
          });
          
          if (response.status === 401) {
            throw new Error('Invalid Azure API key. Check your credentials.');
          } else if (response.status === 404) {
            throw new Error('Azure deployment not found. Check your endpoint URL and deployment name.');
          } else {
            throw new Error(`Azure API error: ${response.status} - ${errorText}`);
          }
        }

        const azureData = await response.json();
        content = sanitizeLLMResponse(azureData.choices[0].message.content);
        break;

      case 'anthropic':
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': provider.apiKey || '',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: provider.model,
            max_tokens: provider.settings.maxTokens,
            messages: [{ role: 'user', content: prompt }],
            system: systemPrompt,
          }),
        });

        if (!response.ok) {
          throw new Error(`Anthropic API error: ${response.status}`);
        }

        const anthropicData = await response.json();
        content = sanitizeLLMResponse(anthropicData.content[0].text);
        break;

      case 'google':
        // Auto-correct old endpoint format (backward compatibility)
        const baseEndpoint = endpoint.replace(/\/models$/, '');
        const geminiEndpoint = `${baseEndpoint}/models/${provider.model}:generateContent?key=${provider.apiKey}`;
        
        logDebug('Google API Request', {
          requestId,
          endpoint: geminiEndpoint,
          model: provider.model,
        });
        
        response = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: provider.settings.temperature,
              maxOutputTokens: provider.settings.maxTokens,
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logError('Google API Error', new Error(`HTTP ${response.status}`), {
            requestId,
            status: response.status,
            errorBody: errorText,
            model: provider.model,
            endpoint: geminiEndpoint,
          });
          
          if (response.status === 400) {
            throw new Error(`Invalid request to Google API. Check model name and API key.`);
          } else if (response.status === 403) {
            throw new Error(`Google API access denied. Check your API key permissions.`);
          } else if (response.status === 404) {
            throw new Error(`Model "${provider.model}" not found. Please check the model name.`);
          } else {
            throw new Error(`Google API error: ${response.status} - ${errorText}`);
          }
        }

        const googleData = await response.json();
        content = sanitizeLLMResponse(googleData.candidates[0].content.parts[0].text);
        break;

      case 'ollama':
        logDebug('Ollama Request', {
          requestId,
          endpoint,
          model: provider.model,
          temperature: provider.settings.temperature,
        });

        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: provider.model,
              prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
              stream: false,
              options: {
                temperature: provider.settings.temperature,
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            logError('Ollama API Error', new Error(`HTTP ${response.status}`), {
              requestId,
              status: response.status,
              statusText: response.statusText,
              errorBody: errorText,
              endpoint,
            });

            // Provide helpful error messages
            if (response.status === 404) {
              throw new Error(
                `Ollama model "${provider.model}" not found. ` +
                `Please ensure Ollama is running and the model is installed. ` +
                `Run: ollama pull ${provider.model}`
              );
            } else if (response.status === 500) {
              throw new Error(
                `Ollama server error. Please check if the model is loaded correctly. ` +
                `Error: ${errorText}`
              );
            } else {
              throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
            }
          }

          const ollamaData = await response.json();
          content = sanitizeLLMResponse(ollamaData.response);
          
          logDebug('Ollama Response', {
            requestId,
            responseLength: content.length,
            processingTime: Date.now() - startTime,
          });
        } catch (error) {
          if (error instanceof TypeError && error.message.includes('fetch')) {
            logError('Ollama Connection Error', error, {
              requestId,
              endpoint,
              suggestion: 'Is Ollama running? Start with: ollama serve',
            });
            throw new Error(
              `Cannot connect to Ollama at ${endpoint}. ` +
              `Please ensure Ollama is installed and running. ` +
              `Start Ollama with: ollama serve`
            );
          }
          throw error;
        }
        break;

      default:
        // Custom provider - try OpenAI-compatible format
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
          throw new Error(`Custom API error: ${response.status}`);
        }

        const customData = await response.json();
        content = sanitizeLLMResponse(customData.choices?.[0]?.message?.content || customData.response || customData.text || '');
        break;
    }

    const processingTime = Date.now() - startTime;

    logDebug('LLM Success', {
      requestId,
      provider: provider.name,
      processingTime,
      contentLength: content.length,
    });

    return {
      message: {
        id: generateId(),
        role: 'assistant',
        content,
        timestamp: new Date(),
        isStarred: false,
      },
      processingTime,
    };
  } catch (error) {
    logError('LLM API Call Failed', error, {
      requestId,
      provider: provider.name,
      providerType: provider.type,
      endpoint: provider.apiEndpoint,
      processingTime: Date.now() - startTime,
    });
    throw error;
  }
};

// Check if provider is properly configured
const isProviderConfigured = (provider: LLMProviderConfig): boolean => {
  switch (provider.type) {
    case 'ollama':
      return !!(provider.apiEndpoint);
    case 'custom':
      return !!(provider.apiEndpoint && provider.apiKey);
    default:
      return !!(provider.apiKey);
  }
};

// Smart response function - uses provider if available, otherwise throws error
export const getLLMResponse = async (
  prompt: string,
  systemPrompt?: string,
  provider?: LLMProviderConfig | null,
  chatSettings?: ChatSettings
): Promise<LLMResponse> => {
  if (!provider) {
    const error = new Error('No LLM provider selected. Please configure a provider in Admin Settings.');
    logWarning('No Provider Selected', { prompt: prompt.substring(0, 50) });
    throw error;
  }

  if (!provider.isEnabled) {
    const error = new Error(`Provider "${provider.name}" is disabled. Please enable it in Admin Settings.`);
    logWarning('Provider Disabled', { provider: provider.name });
    throw error;
  }

  if (!isProviderConfigured(provider)) {
    const error = new Error(
      `LLM provider "${provider.name}" is not properly configured. ` +
      (provider.type === 'ollama' 
        ? 'Please ensure Ollama is running (ollama serve) and the model is installed.'
        : 'Please check your API keys and settings in Admin Settings.')
    );
    logWarning('Provider Not Configured', { 
      provider: provider.name,
      type: provider.type,
      hasEndpoint: !!provider.apiEndpoint,
      hasApiKey: !!provider.apiKey,
    });
    throw error;
  }

  // Build enhanced system prompt with formatting profile if chatSettings provided
  const enhancedSystemPrompt = chatSettings 
    ? buildSystemPromptWithFormatting(systemPrompt, chatSettings)
    : systemPrompt;

  try {
    return await callLLMProvider(provider, prompt, enhancedSystemPrompt);
  } catch (error) {
    console.error('LLM API call failed:', error);
    throw new Error(`Failed to get response from ${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Generate multiple draft responses
export const generateDrafts = async (
  prompt: string,
  count: number = 3
): Promise<Draft[]> => {
  const drafts: Draft[] = [];
  
  for (let i = 0; i < count; i++) {
    await new Promise(resolve => setTimeout(resolve, 300));
    drafts.push({
      id: generateId(),
      content: `Draft ${i + 1}: Response to "${prompt.substring(0, 30)}..."`,
      timestamp: new Date(),
    });
  }
  
  return drafts;
};

// Regenerate a response
export const regenerateResponse = async (
  prompt: string,
  provider?: LLMProviderConfig | null,
  chatSettings?: ChatSettings
): Promise<LLMResponse> => {
  return getLLMResponse(prompt, undefined, provider, chatSettings);
};

// Test provider connection
export const testProviderConnection = async (
  provider: LLMProviderConfig
): Promise<{ success: boolean; message: string }> => {
  const startTime = Date.now();
  
  // Pre-flight checks
  if (!provider.apiEndpoint) {
    return { 
      success: false, 
      message: `API endpoint not configured for ${provider.name}` 
    };
  }

  // For Ollama, first check if the service is running
  if (provider.type === 'ollama') {
    try {
      const baseUrl = provider.apiEndpoint.replace('/api/generate', '').replace('/api/chat', '');
      const tagsUrl = `${baseUrl}/api/tags`;
      
      const tagsResponse = await fetch(tagsUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      if (!tagsResponse.ok) {
        return {
          success: false,
          message: `Ollama service responded with error: ${tagsResponse.status}. Is Ollama running?`
        };
      }

      const data = await tagsResponse.json();
      const models = data.models || [];
      
      // Check if the configured model exists
      const modelExists = models.some((m: { name: string }) => m.name === provider.model);
      
      if (!modelExists) {
        const availableModels = models.map((m: { name: string }) => m.name).join(', ') || 'none';
        return {
          success: false,
          message: `Model "${provider.model}" not found. Available models: ${availableModels}. Run: ollama pull ${provider.model}`
        };
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TimeoutError') {
          return {
            success: false,
            message: 'Ollama service is not responding. Is Ollama running? Try: ollama serve'
          };
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          return {
            success: false,
            message: 'Cannot connect to Ollama. Is it running on http://localhost:11434? Try: ollama serve'
          };
        }
      }
      return {
        success: false,
        message: `Ollama connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // For cloud providers, check API key format
  if (provider.type !== 'ollama' && provider.type !== 'custom') {
    if (!provider.apiKey || provider.apiKey.trim().length < 10) {
      return {
        success: false,
        message: 'API key is missing or too short. Please provide a valid API key.'
      };
    }
  }

  // Google-specific validation
  if (provider.type === 'google') {
    // Validate model name format
    const validModelPrefixes = ['gemini-', 'models/gemini-'];
    const hasValidPrefix = validModelPrefixes.some(prefix => provider.model.startsWith(prefix));
    
    if (!hasValidPrefix) {
      return {
        success: false,
        message: `Invalid model name "${provider.model}". Google models should start with "gemini-" (e.g., gemini-1.5-pro, gemini-pro)`
      };
    }
    
    // Auto-correct endpoint if it has /models at the end (backward compatibility)
    if (provider.apiEndpoint.endsWith('/models')) {
      logWarning('Google Endpoint', { 
        message: 'Old endpoint format detected, will auto-correct',
        oldEndpoint: provider.apiEndpoint 
      });
    }
  }

  // Perform actual API test with a simple prompt
  try {
    const response = await callLLMProvider(provider, 'Say "OK" if you can read this.');
    const duration = Date.now() - startTime;
    
    if (response.message.content && response.message.content.length > 0) {
      return { 
        success: true, 
        message: `✓ Connected successfully! (${duration}ms)` 
      };
    }
    return { 
      success: false, 
      message: 'No response received from the model' 
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Parse error messages for better user feedback
    if (error instanceof Error) {
      const msg = error.message;
      
      // OpenAI/Azure errors
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        return { success: false, message: 'Invalid API key. Please check your credentials.' };
      }
      if (msg.includes('429') || msg.includes('rate limit')) {
        return { success: false, message: 'Rate limit exceeded. Please try again later.' };
      }
      if (msg.includes('404')) {
        return { success: false, message: `Model "${provider.model}" not found or endpoint incorrect.` };
      }
      if (msg.includes('403') || msg.includes('Forbidden')) {
        return { success: false, message: 'API key does not have permission for this model.' };
      }
      if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
        return { success: false, message: 'Provider service is unavailable. Try again later.' };
      }
      
      // Network errors
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        // Special handling for Anthropic CORS issues
        if (provider.type === 'anthropic') {
          return {
            success: false,
            message: 'CORS Error: Anthropic API blocks browser requests. Solutions: 1) Install a CORS proxy extension (e.g., "CORS Unblock"), 2) Use a backend proxy server, or 3) Try a different provider. ⚠️ Browser extensions may pose security risks.'
          };
        }
        return { 
          success: false, 
          message: 'Network error. Check your internet connection or endpoint URL.' 
        };
      }
      if (msg.includes('timeout')) {
        return { success: false, message: `Request timed out after ${duration}ms. Service may be slow or down.` };
      }
      
      return { 
        success: false, 
        message: msg 
      };
    }
    
    return { 
      success: false, 
      message: 'Connection test failed. Please check your configuration.' 
    };
  }
};

// Fetch available models from Ollama
export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
  details?: {
    family?: string;
    format?: string;
    parameter_size?: string;
  };
}

export const fetchOllamaModels = async (
  endpoint: string
): Promise<{ success: boolean; models: { name: string; size?: number }[]; error?: string }> => {
  try {
    // Convert generate endpoint to tags endpoint
    const baseUrl = endpoint.replace('/api/generate', '').replace('/api/chat', '');
    const tagsUrl = `${baseUrl}/api/tags`;
    
    const response = await fetch(tagsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const models: OllamaModel[] = data.models || [];
    
    // Filter out embedding models (they typically have 'embed' in the name)
    const filteredModels = models
      .filter(m => !m.name.toLowerCase().includes('embed'))
      .map(m => ({ name: m.name, size: m.size }));
    
    return { success: true, models: filteredModels };
  } catch (error) {
    return {
      success: false,
      models: [],
      error: error instanceof Error ? error.message : 'Failed to fetch models',
    };
  }
};

// Fetch available models from OpenAI
export const fetchOpenAIModels = async (
  apiKey: string
): Promise<{ success: boolean; models: string[]; error?: string }> => {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const models: string[] = (data.data || [])
      .filter((m: { id: string; owned_by?: string }) => 
        // Filter for chat models
        (m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3')) &&
        !m.id.includes('instruct') &&
        !m.id.includes('realtime') &&
        !m.id.includes('audio')
      )
      .map((m: { id: string }) => m.id)
      .sort((a: string, b: string) => {
        // Sort by model generation (gpt-4 > gpt-3.5)
        if (a.includes('gpt-4') && !b.includes('gpt-4')) return -1;
        if (!a.includes('gpt-4') && b.includes('gpt-4')) return 1;
        return a.localeCompare(b);
      });
    
    return { success: true, models };
  } catch (error) {
    return {
      success: false,
      models: [],
      error: error instanceof Error ? error.message : 'Failed to fetch models',
    };
  }
};

// Fetch available models from Anthropic
export const fetchAnthropicModels = async (
  apiKey: string
): Promise<{ success: boolean; models: string[]; error?: string }> => {
  // Anthropic doesn't have a models endpoint, but we validate the key with a test call
  try {
    // First, validate key format
    if (!apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid API key format. Anthropic keys start with "sk-ant-"');
    }
    
    // Validate key by making a minimal API call
    let response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Use cheapest model for validation
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });
    } catch (fetchError) {
      // CORS error - this is expected for Anthropic API from browser
      const errorMsg = fetchError instanceof Error ? fetchError.message : '';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('CORS')) {
        throw new Error('CORS Error: Anthropic API cannot be called directly from browser. Solutions: 1) Use a CORS proxy browser extension (e.g., "CORS Unblock" for Chrome/Edge), 2) Run a local proxy server, or 3) Use Anthropic through a backend API. Note: Browser extensions may pose security risks.');
      }
      throw fetchError;
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      }
      if (response.status === 403) {
        throw new Error('API key does not have permission');
      }
      throw new Error(`API validation failed: ${response.status}`);
    }
    
    // Return known Claude models (Anthropic doesn't have a models listing API)
    // These are curated and verified models as of the API version
    const models = [
      'claude-sonnet-4-20250514',
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
    
    return { success: true, models };
  } catch (error) {
    // Check if it's a CORS-related error
    const errorMsg = error instanceof Error ? error.message : '';
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('CORS')) {
      return {
        success: false,
        models: [],
        error: 'CORS Error: Anthropic API blocks browser requests. Use a CORS proxy extension or backend server. Learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
      };
    }
    
    return {
      success: false,
      models: [],
      error: error instanceof Error ? error.message : 'Failed to validate key',
    };
  }
};

// Fetch available models from Google Gemini
export const fetchGoogleModels = async (
  apiKey: string
): Promise<{ success: boolean; models: string[]; error?: string }> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 400 || response.status === 403) {
        throw new Error('Invalid API key');
      }
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const models: string[] = (data.models || [])
      .filter((m: { name: string; supportedGenerationMethods?: string[] }) => 
        // Filter for generative models that support generateContent
        m.supportedGenerationMethods?.includes('generateContent') &&
        m.name.includes('gemini')
      )
      .map((m: { name: string }) => m.name.replace('models/', ''))
      .sort((a: string, b: string) => {
        // Sort by version (2.0 > 1.5 > 1.0)
        if (a.includes('2.0') && !b.includes('2.0')) return -1;
        if (!a.includes('2.0') && b.includes('2.0')) return 1;
        if (a.includes('1.5') && !b.includes('1.5')) return -1;
        if (!a.includes('1.5') && b.includes('1.5')) return 1;
        return a.localeCompare(b);
      });
    
    return { success: true, models };
  } catch (error) {
    return {
      success: false,
      models: [],
      error: error instanceof Error ? error.message : 'Failed to fetch models',
    };
  }
};
