import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode } from 'react';
import type { MemoryState, MemoryAction, MemoryEntry, MemorySettings, OllamaModel } from '../types/memory';
import type { LLMProviderConfig } from '../types';
import {
  extractMemories,
  buildCompactionPrompt,
  buildMemoryInjectionText,
  parseExtractionResult,
  fetchOllamaModels,
} from '../services/memoryService';
import { callLLMProvider } from '../utils/llmService';
import { generateId } from '../utils/helpers';

export const MEMORY_STORAGE_KEY = 'samvada-studio-memory';

const defaultSettings: MemorySettings = {
  isEnabled: false,
  extractionSource: 'ollama',
  extractionModelEndpoint: 'http://localhost:11434',
  extractionModelName: '',
  extractionProviderId: undefined,
  maxEntries: 100,
  maxCharsPerEntry: 150,
  autoCompact: true,
};

const initialState: MemoryState = {
  entries: [],
  settings: defaultSettings,
  isExtracting: false,
  isCompacting: false,
  lastExtractionAt: null,
  lastCompactionAt: null,
};

// ── Reducer ──────────────────────────────────────────────────────────────────

function memoryReducer(state: MemoryState, action: MemoryAction): MemoryState {
  switch (action.type) {
    case 'LOAD_MEMORY':
      return { ...action.payload, isExtracting: false, isCompacting: false };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'ADD_ENTRIES': {
      const combined = [...state.entries, ...action.payload];
      const trimmed =
        combined.length > state.settings.maxEntries
          ? combined.slice(combined.length - state.settings.maxEntries)
          : combined;
      return { ...state, entries: trimmed, isExtracting: false, lastExtractionAt: new Date() };
    }

    case 'DELETE_ENTRY':
      return { ...state, entries: state.entries.filter(e => e.id !== action.payload) };

    case 'REPLACE_ENTRIES':
      return { ...state, entries: action.payload, isCompacting: false, lastCompactionAt: new Date() };

    case 'SET_EXTRACTING':
      return { ...state, isExtracting: action.payload };

    case 'SET_COMPACTING':
      return { ...state, isCompacting: action.payload };

    case 'CLEAR_ALL_ENTRIES':
      return { ...state, entries: [] };

    default:
      return state;
  }
}

// ── Persistence ───────────────────────────────────────────────────────────────

function dateReplacer(_key: string, value: unknown) {
  if (value instanceof Date) return { __type: 'Date', value: value.toISOString() };
  return value;
}

function dateReviver(_key: string, value: unknown) {
  if (value && typeof value === 'object' && (value as Record<string, unknown>)['__type'] === 'Date') {
    const iso = (value as Record<string, unknown>)['value'];
    return new Date(iso as string);
  }
  return value;
}

function saveMemoryState(state: MemoryState): void {
  try {
    const toSave = {
      entries: state.entries,
      settings: state.settings,
      lastExtractionAt: state.lastExtractionAt,
      lastCompactionAt: state.lastCompactionAt,
    };
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(toSave, dateReplacer));
  } catch (err) {
    console.error('[Memory] Failed to save:', err);
  }
}

function loadMemoryState(): Partial<MemoryState> | null {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw, dateReviver) as Partial<MemoryState>;
  } catch (err) {
    console.error('[Memory] Failed to load:', err);
    return null;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface MemoryContextType {
  memoryState: MemoryState;
  memoryDispatch: React.Dispatch<MemoryAction>;
  triggerExtraction: (userMsg: string, assistantMsg: string, pnrId: string) => void;
  compactMemories: () => Promise<void>;
  getInjectionText: () => string;
  fetchAvailableModels: (baseUrl: string) => Promise<OllamaModel[]>;
  setExtractionProviderOverride: (provider: LLMProviderConfig | null) => void;
}

const MemoryContext = createContext<MemoryContextType | undefined>(undefined);

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(memoryReducer, initialState);

  // Keep a ref to always-current state for async functions (avoids stale closures)
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const isInitialMount = useRef(true);
  const extractionInFlightRef = useRef(false);
  // Optional override: when user picks an existing configured LLM provider for extraction
  const extractionProviderOverrideRef = useRef<LLMProviderConfig | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadMemoryState();
    if (saved) {
      dispatch({ type: 'LOAD_MEMORY', payload: { ...initialState, ...saved } });
    }
    requestAnimationFrame(() => { isInitialMount.current = false; });
  }, []);

  // Save on every state change (skip initial mount, same pattern as ChatContext)
  useEffect(() => {
    if (isInitialMount.current) return;
    saveMemoryState(state);
  }, [state]);

  // ── Compaction (internal + exposed) ────────────────────────────────────────

  const runCompaction = async (): Promise<void> => {
    const { settings, entries } = stateRef.current;
    if (entries.length === 0) return;

    dispatch({ type: 'SET_COMPACTING', payload: true });
    try {
      const provider: LLMProviderConfig = extractionProviderOverrideRef.current ?? {
        id: '__memory-compactor__',
        name: 'Memory Compactor (Ollama)',
        type: 'ollama' as const,
        apiEndpoint: `${settings.extractionModelEndpoint.replace(/\/$/, '')}/api/generate`,
        model: settings.extractionModelName,
        isEnabled: true,
        isDefault: false,
        settings: { temperature: 0.15, maxTokens: 1024 },
      };
      const prompt = buildCompactionPrompt(entries, settings.maxEntries, settings.maxCharsPerEntry);
      const result = await callLLMProvider(provider, prompt);
      const compacted = parseExtractionResult(result.message.content, settings.maxCharsPerEntry);

      if (compacted.length > 0) {
        const newEntries: MemoryEntry[] = compacted.map(content => ({
          id: generateId(),
          content,
          createdAt: new Date(),
          updatedAt: new Date(),
          source: 'compaction' as const,
        }));
        dispatch({ type: 'REPLACE_ENTRIES', payload: newEntries });
      } else {
        dispatch({ type: 'SET_COMPACTING', payload: false });
      }
    } catch (err) {
      console.warn('[Memory] Compaction failed:', err);
      dispatch({ type: 'SET_COMPACTING', payload: false });
    }
  };

  // ── Public API ─────────────────────────────────────────────────────────────

  // Fire-and-forget — NEVER blocks chat, NEVER surfaces errors
  const triggerExtraction = (userMsg: string, assistantMsg: string, pnrId: string): void => {
    const { settings } = stateRef.current;
    if (!settings.isEnabled) return;
    // Must have either an Ollama model name OR a provider override configured
    if (!settings.extractionModelName && !extractionProviderOverrideRef.current) return;
    if (extractionInFlightRef.current) return;

    extractionInFlightRef.current = true;
    dispatch({ type: 'SET_EXTRACTING', payload: true });

    (async () => {
      try {
        const { entries, settings: currentSettings } = stateRef.current;

        // Auto-compact if at capacity
        if (entries.length >= currentSettings.maxEntries && currentSettings.autoCompact) {
          await runCompaction();
        }

        const newEntries = await extractMemories(
          userMsg,
          assistantMsg,
          stateRef.current.entries,
          stateRef.current.settings,
          pnrId,
          extractionProviderOverrideRef.current ?? undefined
        );

        if (newEntries.length > 0) {
          dispatch({ type: 'ADD_ENTRIES', payload: newEntries });
        } else {
          dispatch({ type: 'SET_EXTRACTING', payload: false });
        }
      } catch (err) {
        console.warn('[Memory] Extraction failed (silent):', err);
        dispatch({ type: 'SET_EXTRACTING', payload: false });
      } finally {
        extractionInFlightRef.current = false;
      }
    })();
  };

  const compactMemories = async (): Promise<void> => {
    await runCompaction();
  };

  const getInjectionText = (): string => {
    const { settings, entries } = stateRef.current;
    if (!settings.isEnabled || entries.length === 0) return '';
    return buildMemoryInjectionText(entries);
  };

  const setExtractionProviderOverride = (provider: LLMProviderConfig | null): void => {
    extractionProviderOverrideRef.current = provider;
  };

  return (
    <MemoryContext.Provider
      value={{
        memoryState: state,
        memoryDispatch: dispatch,
        triggerExtraction,
        compactMemories,
        getInjectionText,
        fetchAvailableModels: fetchOllamaModels,
        setExtractionProviderOverride,
      }}
    >
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory(): MemoryContextType {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error('useMemory must be used within MemoryProvider');
  return ctx;
}
