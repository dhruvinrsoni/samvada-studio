import { ollamaDiscovery } from './ollamaDiscovery';
import type { RAGEmbeddingProvider } from '../types';

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  getDimensions(): Promise<number>;
  getModelName(): string;
}

// ── Ollama Embedding Provider ──

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private baseUrl: string;
  private model: string;
  private dimensions: number | null = null;

  constructor(model: string, baseUrl?: string) {
    this.model = model;
    this.baseUrl = baseUrl ?? this.resolveHost();
  }

  private resolveHost(): string {
    const active = ollamaDiscovery.getActiveBaseUrl();
    if (active) return active;
    const urls = ollamaDiscovery.getConfiguredEndpointUrls();
    return urls[0] ?? 'http://localhost:11434';
  }

  getModelName(): string {
    return this.model;
  }

  async getDimensions(): Promise<number> {
    if (this.dimensions) return this.dimensions;
    const vecs = await this.embed(['dimension probe']);
    this.dimensions = vecs[0]!.length;
    return this.dimensions;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const url = `${this.baseUrl.replace(/\/+$/, '')}/api/embed`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: texts }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Ollama embed failed (${resp.status}): ${body}`);
    }

    const data = await resp.json();
    const embeddings: number[][] = data.embeddings ?? data.embedding;

    if (!embeddings || !Array.isArray(embeddings)) {
      throw new Error('Unexpected response shape from Ollama /api/embed');
    }

    if (embeddings.length > 0 && !Array.isArray(embeddings[0])) {
      return [embeddings as unknown as number[]];
    }

    return embeddings;
  }
}

// ── Transformers.js Embedding Provider (via Web Worker) ──

let workerInstance: Worker | null = null;
let workerReady = false;
let workerReadyPromise: Promise<void> | null = null;
let workerDimensions: number | null = null;
let activeWorkerModel: string | null = null;

function getOrCreateWorker(model: string): Worker {
  if (workerInstance && activeWorkerModel === model) return workerInstance;

  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
    workerReady = false;
    workerReadyPromise = null;
    workerDimensions = null;
  }

  workerInstance = new Worker(
    new URL('../workers/embedding.worker.ts', import.meta.url),
    { type: 'module' },
  );
  activeWorkerModel = model;

  workerReadyPromise = new Promise<void>((resolve, reject) => {
    const onMsg = (e: MessageEvent) => {
      if (e.data.type === 'ready') {
        workerReady = true;
        workerDimensions = e.data.dimensions ?? null;
        workerInstance?.removeEventListener('message', onMsg);
        resolve();
      }
      if (e.data.type === 'error' && !workerReady) {
        reject(new Error(e.data.message));
      }
    };
    workerInstance!.addEventListener('message', onMsg);
    workerInstance!.postMessage({ type: 'load', model });
  });

  return workerInstance;
}

async function ensureWorkerReady(model: string): Promise<Worker> {
  const worker = getOrCreateWorker(model);
  if (!workerReady && workerReadyPromise) {
    await workerReadyPromise;
  }
  return worker;
}

export class TransformersEmbeddingProvider implements EmbeddingProvider {
  private model: string;

  constructor(model = 'Xenova/all-MiniLM-L6-v2') {
    this.model = model;
  }

  getModelName(): string {
    return this.model;
  }

  async getDimensions(): Promise<number> {
    await ensureWorkerReady(this.model);
    if (workerDimensions) return workerDimensions;
    const vecs = await this.embed(['dimension probe']);
    workerDimensions = vecs[0]!.length;
    return workerDimensions;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const worker = await ensureWorkerReady(this.model);

    return new Promise<number[][]>((resolve, reject) => {
      const id = crypto.randomUUID();
      const onMsg = (e: MessageEvent) => {
        if (e.data.id !== id) return;
        worker.removeEventListener('message', onMsg);
        if (e.data.type === 'result') {
          resolve(e.data.vectors);
        } else {
          reject(new Error(e.data.message ?? 'Embedding failed'));
        }
      };
      worker.addEventListener('message', onMsg);
      worker.postMessage({ type: 'embed', id, texts });
    });
  }
}

// ── Reranker (via Web Worker) ──

let rerankerLoaded = false;
let rerankerLoadPromise: Promise<void> | null = null;

async function ensureRerankerLoaded(model: string): Promise<Worker> {
  const worker = await ensureWorkerReady(activeWorkerModel ?? 'Xenova/all-MiniLM-L6-v2');

  if (rerankerLoaded) return worker;

  if (!rerankerLoadPromise) {
    rerankerLoadPromise = new Promise<void>((resolve, reject) => {
      const loadId = crypto.randomUUID();
      const onMsg = (e: MessageEvent) => {
        if (e.data.id !== loadId) return;
        worker.removeEventListener('message', onMsg);
        if (e.data.type === 'reranker-ready') {
          rerankerLoaded = true;
          resolve();
        } else {
          reject(new Error(e.data.message ?? 'Failed to load reranker'));
        }
      };
      worker.addEventListener('message', onMsg);
      worker.postMessage({ type: 'load-reranker', id: loadId, model });
    });
  }

  await rerankerLoadPromise;
  return worker;
}

export interface RerankResult {
  index: number;
  score: number;
}

export async function rerank(
  query: string,
  passages: string[],
  model: string,
): Promise<RerankResult[]> {
  const worker = await ensureRerankerLoaded(model);

  return new Promise<RerankResult[]>((resolve, reject) => {
    const id = crypto.randomUUID();
    const onMsg = (e: MessageEvent) => {
      if (e.data.id !== id) return;
      worker.removeEventListener('message', onMsg);
      if (e.data.type === 'rerank-result') {
        const scores: number[] = e.data.scores;
        const indexed = scores.map((score, i) => ({ index: i, score }));
        indexed.sort((a, b) => b.score - a.score);
        resolve(indexed);
      } else {
        reject(new Error(e.data.message ?? 'Reranking failed'));
      }
    };
    worker.addEventListener('message', onMsg);
    worker.postMessage({ type: 'rerank', id, query, passages });
  });
}

// ── Factory ──

export function createEmbeddingProvider(
  provider: RAGEmbeddingProvider,
  model: string,
  ollamaBaseUrl?: string,
): EmbeddingProvider {
  if (provider === 'ollama') {
    return new OllamaEmbeddingProvider(model, ollamaBaseUrl);
  }
  return new TransformersEmbeddingProvider(model || 'Xenova/all-MiniLM-L6-v2');
}

export async function detectBestProvider(): Promise<{
  provider: RAGEmbeddingProvider;
  model: string;
}> {
  try {
    const baseUrl = ollamaDiscovery.getActiveBaseUrl()
      ?? ollamaDiscovery.getConfiguredEndpointUrls()[0]
      ?? 'http://localhost:11434';

    const resp = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (resp.ok) {
      const data = await resp.json();
      const models = (data.models ?? []) as { name: string }[];
      const embedModel = models.find(
        (m) =>
          m.name.includes('embed') ||
          m.name.includes('nomic') ||
          m.name.includes('mxbai'),
      );
      if (embedModel) {
        return { provider: 'ollama', model: embedModel.name };
      }
    }
  } catch {
    // Ollama not available
  }
  return { provider: 'transformers', model: 'Xenova/all-MiniLM-L6-v2' };
}
