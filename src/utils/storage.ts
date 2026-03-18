import type { AppState, SafeAppState, SafeLLMProviderConfig, LLMProviderConfig } from '../types';
import { validateStoredContent } from './contentSanitizer';

export const STORAGE_KEY = 'samvada-studio-state';
export const SENSITIVE_STORAGE_KEY = 'samvada-studio-sensitive';

// Simple XOR-based encoding (better than plaintext, not cryptographically secure)
// For true security, users should use environment variables or a proper secrets manager
const encode = (str: string): string => {
  const key = 'samvada-secret-key-2026';
  return btoa(
    str
      .split('')
      .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
      .join('')
  );
};

const decode = (encoded: string): string => {
  const key = 'samvada-secret-key-2026';
  try {
    return atob(encoded)
      .split('')
      .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
      .join('');
  } catch {
    return '';
  }
};

// Store sensitive data separately (API keys)
const saveSensitiveData = (providers: LLMProviderConfig[]): void => {
  try {
    const sensitiveData: Record<string, string> = {};
    providers.forEach(provider => {
      if (provider.apiKey) {
        sensitiveData[provider.id] = encode(provider.apiKey);
      }
    });
    localStorage.setItem(SENSITIVE_STORAGE_KEY, JSON.stringify(sensitiveData));
  } catch (error) {
    console.error('Failed to save sensitive data:', error);
  }
};

const loadSensitiveData = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem(SENSITIVE_STORAGE_KEY);
    if (!stored) return {};
    const encoded = JSON.parse(stored);
    const decoded: Record<string, string> = {};
    Object.entries(encoded).forEach(([id, encodedKey]) => {
      decoded[id] = decode(encodedKey as string);
    });
    return decoded;
  } catch (error) {
    console.error('Failed to load sensitive data:', error);
    return {};
  }
};

// Convert full provider config to safe version (removes API keys)
const toSafeProvider = (provider: LLMProviderConfig): SafeLLMProviderConfig => {
  const { apiKey, ...safeProvider } = provider;
  return safeProvider;
};

// Restore API keys to providers
const restoreProviderKeys = (
  providers: SafeLLMProviderConfig[],
  sensitiveData: Record<string, string>
): LLMProviderConfig[] => {
  return providers.map(provider => ({
    ...provider,
    apiKey: sensitiveData[provider.id] || undefined,
  }));
};

export const saveState = (state: AppState): void => {
  try {
    // Save sensitive data separately
    saveSensitiveData(state.providers);

    // Create safe version for storage (remove sensitive data)
    const safeState: SafeAppState = {
      ...state,
      providers: state.providers.map(toSafeProvider),
    };

    const serialized = JSON.stringify(safeState, (_key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() };
      }
      return value;
    });
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save state:', error);
  }
};

export const loadState = (): AppState | null => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;

    const safeState: SafeAppState = JSON.parse(serialized, (key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      // Validate message content when loading
      if (key === 'content' && typeof value === 'string') {
        return validateStoredContent(value);
      }
      return value;
    });

    // Load and restore sensitive data
    const sensitiveData = loadSensitiveData();
    const providers = restoreProviderKeys(safeState.providers, sensitiveData);

    // Convert back to full state with API keys restored
    return {
      ...safeState,
      providers,
      isSidebarOpen: safeState.isSidebarOpen ?? true, // Default to true if not present
      activeOllamaHostId: (safeState as any).activeOllamaHostId ?? null,
    };
  } catch (error) {
    console.error('Failed to load state:', error);
    return null;
  }
};

export const clearState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SENSITIVE_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear state:', error);
  }
};

export const exportChats = (state: AppState): string => {
  return JSON.stringify(state.chats, null, 2);
};

export const importChats = (jsonString: string): AppState['chats'] | null => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to import chats:', error);
    return null;
  }
};
