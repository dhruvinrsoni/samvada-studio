import { pipeline } from '@huggingface/transformers';

let extractor: any = null;

self.addEventListener('message', async (e: MessageEvent) => {
  const { type } = e.data;

  if (type === 'load') {
    try {
      const model: string = e.data.model || 'Xenova/all-MiniLM-L6-v2';
      extractor = await (pipeline as any)('feature-extraction', model, {
        dtype: 'fp32',
      });

      const probe = await extractor('probe', { pooling: 'mean', normalize: true });
      const dims = probe.dims?.[1] ?? (probe.data as Float32Array).length;

      self.postMessage({ type: 'ready', dimensions: dims });
    } catch (err: any) {
      self.postMessage({ type: 'error', message: err.message ?? String(err) });
    }
    return;
  }

  if (type === 'embed') {
    const { id, texts } = e.data as { id: string; texts: string[] };
    if (!extractor) {
      self.postMessage({ type: 'error', id, message: 'Model not loaded' });
      return;
    }

    try {
      const vectors: number[][] = [];
      for (const text of texts) {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        vectors.push(Array.from(output.data as Float32Array));
      }
      self.postMessage({ type: 'result', id, vectors });
    } catch (err: any) {
      self.postMessage({ type: 'error', id, message: err.message ?? String(err) });
    }
  }
});
