export type MemorySource = 'extraction' | 'manual' | 'compaction';

export interface OllamaModel {
  name: string;
  size: number; // bytes
}

export interface MemoryEntry {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  source: MemorySource;
  extractedFromPnrId?: string;
}

export interface MemorySettings {
  isEnabled: boolean;
  extractionSource: 'ollama' | 'provider'; // NEW
  extractionModelEndpoint: string;
  extractionModelName: string;
  extractionProviderId?: string; // NEW - id of configured LLM provider to use
  maxEntries: number;
  maxCharsPerEntry: number;
  autoCompact: boolean;
}

export interface MemoryState {
  entries: MemoryEntry[];
  settings: MemorySettings;
  isExtracting: boolean;
  isCompacting: boolean;
  lastExtractionAt: Date | null;
  lastCompactionAt: Date | null;
}

export type MemoryAction =
  | { type: 'LOAD_MEMORY'; payload: MemoryState }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<MemorySettings> }
  | { type: 'ADD_ENTRIES'; payload: MemoryEntry[] }
  | { type: 'DELETE_ENTRY'; payload: string }
  | { type: 'REPLACE_ENTRIES'; payload: MemoryEntry[] }
  | { type: 'SET_EXTRACTING'; payload: boolean }
  | { type: 'SET_COMPACTING'; payload: boolean }
  | { type: 'CLEAR_ALL_ENTRIES' };
