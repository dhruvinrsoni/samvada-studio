import type { AppState, SafeAppState, SafeLLMProviderConfig } from '../types';

export const STORAGE_KEY = 'samvada-studio-state';

// Convert full provider config to safe version (removes API keys)
const toSafeProvider = (provider: any): SafeLLMProviderConfig => {
  const { apiKey, ...safeProvider } = provider;
  return safeProvider;
};

// Convert safe state to full state (API keys will be empty)
const fromSafeState = (safeState: SafeAppState): AppState => {
  return {
    ...safeState,
    providers: safeState.providers.map(provider => ({
      ...provider,
      apiKey: undefined, // API keys are not stored, will be set by user
    })),
  };
};

export const saveState = (state: AppState): void => {
  try {
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

    const safeState: SafeAppState = JSON.parse(serialized, (_key, value) => {
      if (value && typeof value === 'object' && value.__type === 'Date') {
        return new Date(value.value);
      }
      return value;
    });

    // Convert back to full state
    return fromSafeState(safeState);
  } catch (error) {
    console.error('Failed to load state:', error);
    return null;
  }
};

export const clearState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
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
