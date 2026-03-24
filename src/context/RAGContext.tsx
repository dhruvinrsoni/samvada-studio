import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { RAGCollection, RAGDocument, RAGSettings, RAGSearchResult } from '../types';
import * as ragService from '../services/ragService';
import type { IngestProgress } from '../services/ragService';

// ── State ──

interface RAGState {
  collections: RAGCollection[];
  settings: RAGSettings;
  isLoading: boolean;
}

const RAG_SETTINGS_KEY = 'samvada-studio-rag-settings';
const RAG_SETTINGS_VERSION = 4;
const RAG_SETTINGS_VERSION_KEY = 'samvada-studio-rag-settings-version';

function loadSettings(): RAGSettings {
  try {
    const storedVersion = Number(localStorage.getItem(RAG_SETTINGS_VERSION_KEY) || '0');
    if (storedVersion < RAG_SETTINGS_VERSION) {
      localStorage.removeItem(RAG_SETTINGS_KEY);
      localStorage.setItem(RAG_SETTINGS_VERSION_KEY, String(RAG_SETTINGS_VERSION));
      return { ...ragService.DEFAULT_RAG_SETTINGS };
    }
    const raw = localStorage.getItem(RAG_SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as RAGSettings;
  } catch { /* use defaults */ }
  return { ...ragService.DEFAULT_RAG_SETTINGS };
}

function saveSettings(settings: RAGSettings): void {
  try {
    localStorage.setItem(RAG_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(RAG_SETTINGS_VERSION_KEY, String(RAG_SETTINGS_VERSION));
  } catch { /* ignore */ }
}

const initialState: RAGState = {
  collections: [],
  settings: loadSettings(),
  isLoading: false,
};

// ── Actions ──

type RAGAction =
  | { type: 'SET_COLLECTIONS'; payload: RAGCollection[] }
  | { type: 'ADD_COLLECTION'; payload: RAGCollection }
  | { type: 'UPDATE_COLLECTION'; payload: RAGCollection }
  | { type: 'REMOVE_COLLECTION'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<RAGSettings> }
  | { type: 'SET_LOADING'; payload: boolean };

function ragReducer(state: RAGState, action: RAGAction): RAGState {
  switch (action.type) {
    case 'SET_COLLECTIONS':
      return { ...state, collections: action.payload };
    case 'ADD_COLLECTION':
      return { ...state, collections: [...state.collections, action.payload] };
    case 'UPDATE_COLLECTION':
      return {
        ...state,
        collections: state.collections.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      };
    case 'REMOVE_COLLECTION':
      return {
        ...state,
        collections: state.collections.filter((c) => c.id !== action.payload),
      };
    case 'UPDATE_SETTINGS': {
      const newSettings = { ...state.settings, ...action.payload };
      saveSettings(newSettings);
      return { ...state, settings: newSettings };
    }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

// ── Context ──

interface RAGContextType {
  ragState: RAGState;
  ragDispatch: React.Dispatch<RAGAction>;
  refreshCollections: () => Promise<void>;
  createCollection: (name: string, description: string) => Promise<RAGCollection>;
  deleteCollection: (id: string) => Promise<void>;
  getDocuments: (collectionId: string) => Promise<RAGDocument[]>;
  ingestDocument: (
    file: File,
    collectionId: string,
    onProgress?: (p: IngestProgress) => void,
  ) => Promise<RAGDocument>;
  removeDocument: (docId: string, collectionId: string) => Promise<void>;
  queryCollections: (query: string, collectionIds: string[]) => Promise<{ results: RAGSearchResult[]; errors: string[] }>;
  formatContext: (results: RAGSearchResult[]) => string;
}

const RAGContext = createContext<RAGContextType | null>(null);

// ── Provider ──

export function RAGProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(ragReducer, initialState);

  const refreshCollections = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const cols = await ragService.getCollections();
      dispatch({ type: 'SET_COLLECTIONS', payload: cols });
    } catch (err) {
      console.error('[RAG] Failed to load collections:', err);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  useEffect(() => {
    refreshCollections();
  }, [refreshCollections]);

  const createCollectionFn = useCallback(
    async (name: string, description: string) => {
      const col = await ragService.createCollection(name, description, state.settings);
      dispatch({ type: 'ADD_COLLECTION', payload: col });
      return col;
    },
    [state.settings],
  );

  const deleteCollectionFn = useCallback(async (id: string) => {
    await ragService.removeCollection(id);
    dispatch({ type: 'REMOVE_COLLECTION', payload: id });
  }, []);

  const getDocumentsFn = useCallback(
    (collectionId: string) => ragService.getDocuments(collectionId),
    [],
  );

  const ingestDocumentFn = useCallback(
    async (file: File, collectionId: string, onProgress?: (p: IngestProgress) => void) => {
      const doc = await ragService.ingestDocument(file, collectionId, state.settings, onProgress);
      await refreshCollections();
      return doc;
    },
    [state.settings, refreshCollections],
  );

  const removeDocumentFn = useCallback(
    async (docId: string, collectionId: string) => {
      await ragService.removeDocument(docId, collectionId);
      await refreshCollections();
    },
    [refreshCollections],
  );

  const queryCollectionsFn = useCallback(
    (query: string, collectionIds: string[]) =>
      ragService.queryMultipleCollections(query, collectionIds, state.settings),
    [state.settings],
  );

  const formatContextFn = useCallback(
    (results: RAGSearchResult[]) =>
      ragService.formatRAGContext(results, state.settings.ragTemplate),
    [state.settings.ragTemplate],
  );

  return (
    <RAGContext.Provider
      value={{
        ragState: state,
        ragDispatch: dispatch,
        refreshCollections,
        createCollection: createCollectionFn,
        deleteCollection: deleteCollectionFn,
        getDocuments: getDocumentsFn,
        ingestDocument: ingestDocumentFn,
        removeDocument: removeDocumentFn,
        queryCollections: queryCollectionsFn,
        formatContext: formatContextFn,
      }}
    >
      {children}
    </RAGContext.Provider>
  );
}

// ── Hook ──

export function useRAG(): RAGContextType {
  const ctx = useContext(RAGContext);
  if (!ctx) throw new Error('useRAG must be used within RAGProvider');
  return ctx;
}
