import type {
  OllamaModelInfo,
  OllamaModelShowResponse,
  OllamaPullProgress,
  OllamaRunningModel,
} from '../types';

function cleanBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

export async function listModels(baseUrl: string): Promise<OllamaModelInfo[]> {
  const url = `${cleanBaseUrl(baseUrl)}/api/tags`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!resp.ok) throw new Error(`Failed to list models: ${resp.status} ${resp.statusText}`);
  const data = await resp.json();
  return (data.models ?? []) as OllamaModelInfo[];
}

export async function showModelInfo(
  baseUrl: string,
  modelName: string,
): Promise<OllamaModelShowResponse> {
  const url = `${cleanBaseUrl(baseUrl)}/api/show`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName }),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`Failed to show model info: ${resp.status} ${resp.statusText}`);
  return resp.json();
}

export async function deleteModel(baseUrl: string, modelName: string): Promise<void> {
  const url = `${cleanBaseUrl(baseUrl)}/api/delete`;
  const resp = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelName }),
  });
  if (!resp.ok) throw new Error(`Failed to delete model: ${resp.status} ${resp.statusText}`);
}

export async function copyModel(
  baseUrl: string,
  source: string,
  destination: string,
): Promise<void> {
  const url = `${cleanBaseUrl(baseUrl)}/api/copy`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, destination }),
  });
  if (!resp.ok) throw new Error(`Failed to copy model: ${resp.status} ${resp.statusText}`);
}

export async function listRunningModels(baseUrl: string): Promise<OllamaRunningModel[]> {
  const url = `${cleanBaseUrl(baseUrl)}/api/ps`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!resp.ok) throw new Error(`Failed to list running models: ${resp.status} ${resp.statusText}`);
  const data = await resp.json();
  return (data.models ?? []) as OllamaRunningModel[];
}

/**
 * Pull a model from the Ollama registry with streaming progress.
 * Returns the AbortController so callers can cancel in-flight pulls.
 */
export function pullModel(
  baseUrl: string,
  modelName: string,
  onProgress: (progress: OllamaPullProgress) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
): AbortController {
  const controller = new AbortController();
  const url = `${cleanBaseUrl(baseUrl)}/api/pull`;

  (async () => {
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelName, stream: true }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`Pull failed: ${resp.status} ${resp.statusText}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const progress = JSON.parse(trimmed) as OllamaPullProgress;
            onProgress(progress);
            if (progress.status === 'success') {
              onComplete();
              return;
            }
          } catch {
            // skip malformed JSON lines
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const progress = JSON.parse(buffer.trim()) as OllamaPullProgress;
          onProgress(progress);
          if (progress.status === 'success') {
            onComplete();
            return;
          }
        } catch {
          // ignore
        }
      }

      onComplete();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onError(new Error('Pull cancelled'));
      } else {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  })();

  return controller;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
