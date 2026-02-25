// LLM Service - Supports multiple providers
import { generateId } from './helpers';
import type { Message, Draft, LLMProviderConfig } from '../types';

export interface LLMResponse {
  message: Message;
  processingTime: number;
}

// Real API call to LLM provider
export const callLLMProvider = async (
  provider: LLMProviderConfig,
  prompt: string,
  systemPrompt?: string
): Promise<LLMResponse> => {
  const startTime = Date.now();

  // Ensure API endpoint is defined
  if (!provider.apiEndpoint) {
    throw new Error(`API endpoint not configured for provider: ${provider.name}`);
  }

  const endpoint = provider.apiEndpoint;

  try {
    let response: Response;
    let content: string;

    switch (provider.type) {
      case 'openai':
      case 'azure':
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
        content = openaiData.choices[0].message.content;
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
        content = anthropicData.content[0].text;
        break;

      case 'google':
        const geminiEndpoint = `${endpoint}/${provider.model}:generateContent?key=${provider.apiKey}`;
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
          throw new Error(`Google API error: ${response.status}`);
        }

        const googleData = await response.json();
        content = googleData.candidates[0].content.parts[0].text;
        break;

      case 'ollama':
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
          throw new Error(`Ollama API error: ${response.status}`);
        }

        const ollamaData = await response.json();
        content = ollamaData.response;
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
        content = customData.choices?.[0]?.message?.content || customData.response || customData.text || '';
        break;
    }

    const processingTime = Date.now() - startTime;

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
    console.error('LLM API call failed:', error);
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
  provider?: LLMProviderConfig | null
): Promise<LLMResponse> => {
  if (!provider) {
    throw new Error('No LLM provider selected. Please configure a provider in Admin Settings.');
  }

  if (!isProviderConfigured(provider)) {
    throw new Error(`LLM provider "${provider.name}" is not properly configured. Please check your API keys and settings in Admin Settings.`);
  }

  try {
    return await callLLMProvider(provider, prompt, systemPrompt);
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
  provider?: LLMProviderConfig | null
): Promise<LLMResponse> => {
  return getLLMResponse(prompt, undefined, provider);
};

// Test provider connection
export const testProviderConnection = async (
  provider: LLMProviderConfig
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await callLLMProvider(provider, 'Hello, please respond with "Connection successful!"');
    if (response.message.content) {
      return { success: true, message: 'Connection successful!' };
    }
    return { success: false, message: 'No response received' };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Connection failed' 
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
): Promise<{ success: boolean; models: string[]; error?: string }> => {
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
      .map(m => m.name);
    
    return { success: true, models: filteredModels };
  } catch (error) {
    return {
      success: false,
      models: [],
      error: error instanceof Error ? error.message : 'Failed to fetch models',
    };
  }
};
