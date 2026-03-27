/**
 * Ollama Registry Service
 *
 * Provides a list of popular Ollama models for the in-app model browser.
 *
 * Primary source: bundled snapshot (works offline, no CORS issues).
 * Best-effort live refresh via a CORS proxy when the user clicks refresh.
 * ollama.com/api/tags does not set Access-Control-Allow-Origin, so direct
 * fetch from the browser is blocked by CORS on cross-origin deployments.
 */

const REGISTRY_URL = 'https://ollama.com/api/tags';
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

export interface RegistryModel {
  name: string;
  size: number;
  modified_at: string;
  digest: string;
}

interface RegistryResponse {
  models: RegistryModel[];
}

// Bundled snapshot of popular Ollama models (periodically updated).
// This ensures the browse panel always has data even when offline or CORS-blocked.
const BUNDLED_MODELS: RegistryModel[] = [
  { name: 'llama3.1', size: 4661224676, digest: '', modified_at: '2024-07-23' },
  { name: 'llama3.2', size: 2019393189, digest: '', modified_at: '2024-09-25' },
  { name: 'llama3.3', size: 42837488966, digest: '', modified_at: '2024-12-06' },
  { name: 'deepseek-r1', size: 4683075072, digest: '', modified_at: '2025-01-20' },
  { name: 'gemma3', size: 3338019840, digest: '', modified_at: '2025-03-12' },
  { name: 'qwen3', size: 4920733696, digest: '', modified_at: '2025-05-14' },
  { name: 'qwen2.5', size: 4683075072, digest: '', modified_at: '2024-09-19' },
  { name: 'qwen2.5-coder', size: 4683075072, digest: '', modified_at: '2024-11-12' },
  { name: 'mistral', size: 4109865472, digest: '', modified_at: '2024-03-24' },
  { name: 'phi4', size: 9076655104, digest: '', modified_at: '2024-12-12' },
  { name: 'nomic-embed-text', size: 274302464, digest: '', modified_at: '2024-02-14' },
  { name: 'llava', size: 4733363968, digest: '', modified_at: '2024-01-24' },
  { name: 'codellama', size: 3825819519, digest: '', modified_at: '2024-01-24' },
  { name: 'mistral-nemo', size: 7071089664, digest: '', modified_at: '2024-07-18' },
  { name: 'mixtral', size: 26439551360, digest: '', modified_at: '2024-03-24' },
  { name: 'starcoder2', size: 1751082496, digest: '', modified_at: '2024-02-28' },
  { name: 'dolphin-mixtral', size: 26439551360, digest: '', modified_at: '2024-03-24' },
  { name: 'command-r', size: 20822679552, digest: '', modified_at: '2024-04-08' },
  { name: 'llama2', size: 3825819519, digest: '', modified_at: '2024-01-24' },
  { name: 'tinyllama', size: 637699584, digest: '', modified_at: '2024-01-24' },
  { name: 'mxbai-embed-large', size: 669380352, digest: '', modified_at: '2024-04-09' },
  { name: 'deepseek-coder', size: 776395776, digest: '', modified_at: '2024-01-24' },
  { name: 'phi3', size: 2176178688, digest: '', modified_at: '2024-04-23' },
  { name: 'smollm2', size: 985979648, digest: '', modified_at: '2024-11-04' },
  { name: 'qwq', size: 19849909248, digest: '', modified_at: '2024-11-28' },
  { name: 'mistral-small', size: 13547819008, digest: '', modified_at: '2025-02-14' },
  { name: 'gemma2', size: 5443152896, digest: '', modified_at: '2024-06-27' },
  { name: 'cogito', size: 4920733696, digest: '', modified_at: '2025-04-04' },
  { name: 'granite-code', size: 2064046208, digest: '', modified_at: '2024-05-06' },
  { name: 'all-minilm', size: 45431424, digest: '', modified_at: '2024-01-24' },
  { name: 'deepseek-v3.1', size: 688586727753, digest: '', modified_at: '2025-11-20' },
  { name: 'qwen3.5', size: 397000000000, digest: '', modified_at: '2026-02-16' },
  { name: 'gpt-oss', size: 13780162412, digest: '', modified_at: '2025-08-05' },
  { name: 'kimi-k2.5', size: 1118481408000, digest: '', modified_at: '2026-01-26' },
];

let cached: { models: RegistryModel[]; fetchedAt: number; live: boolean } | null = null;

/**
 * Returns the model list. First call returns the bundled snapshot instantly.
 * Subsequent calls return cached data (bundled or live).
 */
export function getRegistryModels(): RegistryModel[] {
  if (cached) return cached.models;
  cached = { models: BUNDLED_MODELS, fetchedAt: Date.now(), live: false };
  return BUNDLED_MODELS;
}

/** Whether the current data is from a live fetch vs the bundled snapshot. */
export function isLiveData(): boolean {
  return cached?.live ?? false;
}

/**
 * Attempts a live refresh via CORS proxy. Returns true on success.
 * Falls back silently to the bundled data on failure.
 */
export async function refreshFromRemote(): Promise<boolean> {
  for (const proxyFn of CORS_PROXIES) {
    try {
      const url = proxyFn(REGISTRY_URL);
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 8000);

      const resp = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);

      if (!resp.ok) continue;

      const data: RegistryResponse = await resp.json();
      if (data.models && data.models.length > 0) {
        cached = { models: data.models, fetchedAt: Date.now(), live: true };
        return true;
      }
    } catch {
      // Try next proxy
    }
  }
  return false;
}

export function invalidateRegistryCache() {
  cached = null;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return 'N/A';
  if (bytes < 1e9) return `${(bytes / 1e6).toFixed(0)} MB`;
  if (bytes < 1e12) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${(bytes / 1e12).toFixed(1)} TB`;
}
