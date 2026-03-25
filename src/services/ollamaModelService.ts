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
        let detail = `${resp.status} ${resp.statusText}`;
        try {
          const body = await resp.json();
          if (body?.error) detail = body.error;
        } catch { /* response wasn't JSON */ }
        throw new Error(`Pull failed: ${detail}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let sawSuccess = false;

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
            const parsed = JSON.parse(trimmed);

            // Ollama streams {"error": "..."} for invalid model names
            if (parsed.error) {
              throw new Error(parsed.error);
            }

            const progress = parsed as OllamaPullProgress;
            onProgress(progress);
            if (progress.status === 'success') {
              sawSuccess = true;
              onComplete();
              return;
            }
          } catch (e) {
            // Re-throw errors we created above
            if (e instanceof Error && !e.message.includes('JSON')) throw e;
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          const progress = parsed as OllamaPullProgress;
          onProgress(progress);
          if (progress.status === 'success') {
            sawSuccess = true;
            onComplete();
            return;
          }
        } catch (e) {
          if (e instanceof Error && !e.message.includes('JSON')) throw e;
        }
      }

      if (sawSuccess) {
        onComplete();
      } else {
        throw new Error('Pull ended without success confirmation. The model may not exist or the server closed the connection.');
      }
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

// ---------------------------------------------------------------------------
// Human-readable model parameter helpers
// ---------------------------------------------------------------------------

function parseParamNum(s: string | undefined): number {
  if (!s) return 0;
  const m = s.match(/([\d.]+)\s*([BMK]?)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]!);
  const u = (m[2] ?? '').toUpperCase();
  if (u === 'B') return n * 1e9;
  if (u === 'M') return n * 1e6;
  if (u === 'K') return n * 1e3;
  return n;
}

export function paramSizeCategory(s: string | undefined): string {
  const n = parseParamNum(s);
  if (n >= 70e9) return 'XL';
  if (n >= 13e9) return 'Large';
  if (n >= 7e9) return 'Medium';
  if (n >= 3e9) return 'Small';
  if (n > 0) return 'Tiny';
  return '';
}

export function paramSizeHint(s: string | undefined): string {
  const n = parseParamNum(s);
  if (n >= 70e9) return 'Very powerful reasoning, needs high-end GPU (48 GB+ VRAM)';
  if (n >= 13e9) return 'Strong reasoning, needs a good GPU (16 GB+ VRAM)';
  if (n >= 7e9) return 'Solid all-rounder, runs on most GPUs (8 GB+ VRAM)';
  if (n >= 3e9) return 'Fast responses, lighter reasoning, runs on modest hardware';
  if (n > 0) return 'Very fast, good for simple tasks, runs on almost anything';
  return 'How many learnable weights the model has — more means smarter but slower';
}

export function quantQualityLabel(q: string | undefined): string {
  if (!q) return '';
  const u = q.toUpperCase();
  if (u.includes('F32') || u.includes('FP32')) return 'Full precision';
  if (u.includes('F16') || u.includes('FP16')) return 'Full precision';
  if (u.includes('Q8')) return 'Near-lossless';
  if (u.includes('Q6')) return 'High quality';
  if (u.includes('Q5')) return 'Good+';
  if (u.includes('Q4')) return 'Balanced';
  if (u.includes('Q3')) return 'Compact';
  if (u.includes('Q2')) return 'Aggressive';
  return '';
}

export function quantHint(q: string | undefined): string {
  if (!q) return 'How compressed the model weights are — lower bits = smaller & faster but less precise';
  const u = q.toUpperCase();
  if (u.includes('F32') || u.includes('FP32')) return 'No compression — maximum accuracy, largest file size';
  if (u.includes('F16') || u.includes('FP16')) return 'Half-precision floats — excellent accuracy, large file size';
  if (u.includes('Q8')) return '8-bit quantization — near original quality, about half the size of FP16';
  if (u.includes('Q6')) return '6-bit quantization — high quality with good size savings';
  if (u.includes('Q5')) return '5-bit quantization — good quality, noticeably smaller';
  if (u.includes('Q4')) return '4-bit quantization — popular sweet spot balancing quality and size';
  if (u.includes('Q3')) return '3-bit quantization — very compact, some quality trade-off';
  if (u.includes('Q2')) return '2-bit quantization — smallest possible, significant quality loss';
  return 'Quantization controls model compression — fewer bits means smaller but less precise';
}

export function quantQualityLevel(q: string | undefined): number {
  if (!q) return 0;
  const u = q.toUpperCase();
  if (u.includes('F32') || u.includes('FP32')) return 5;
  if (u.includes('F16') || u.includes('FP16')) return 5;
  if (u.includes('Q8')) return 4;
  if (u.includes('Q6')) return 4;
  if (u.includes('Q5')) return 3;
  if (u.includes('Q4')) return 3;
  if (u.includes('Q3')) return 2;
  if (u.includes('Q2')) return 1;
  return 0;
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
