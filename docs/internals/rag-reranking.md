# Cross-Encoder Reranking — Technical Documentation

> Target audience: senior engineers and CS students. Covers bi-encoder vs cross-encoder models, why reranking improves precision, and how it's implemented in Samvada Studio's client-side RAG.

---

## 1. Problem: First-Pass Retrieval Is Imprecise

First-pass retrieval (vector search, BM25, or hybrid) uses **fast but approximate** methods. A bi-encoder embeds the query and each document independently, then compares their vectors. This means the model never sees the query and document together — it cannot reason about their interaction.

Example: Query "What are the limitations of the framework?" might retrieve chunks about "framework features" and "limitations of Python" separately, because both have high individual similarity. A model that reads the query and document together would understand neither is a good match.

---

## 2. Bi-Encoder vs Cross-Encoder

### Bi-Encoder (used in first-pass)

```
Query  →  Encoder  →  vector_q  ─┐
                                   ├→ cosine(vector_q, vector_d) → score
Document → Encoder → vector_d  ─┘
```

- Query and document encoded **independently**
- Can pre-compute document vectors (fast at query time)
- No cross-attention between query and document tokens
- Accuracy: moderate

### Cross-Encoder (used in reranking)

```
[CLS] query [SEP] document [SEP]  →  Encoder  →  relevance score
```

- Query and document concatenated and encoded **together**
- Full cross-attention: every query token attends to every document token
- Cannot pre-compute — must run the model for every (query, document) pair
- Accuracy: significantly higher (typically 5-15% improvement on retrieval benchmarks)

### Why Not Use Cross-Encoder for Everything?

If there are 10,000 chunks, a cross-encoder must run 10,000 forward passes (one per chunk). A bi-encoder runs 1 (embed the query) and compares against pre-computed vectors. The standard pattern is:

1. **First pass**: bi-encoder or BM25 retrieves top ~30 candidates (fast, approximate)
2. **Rerank**: cross-encoder re-scores those 30 candidates (slow, precise)
3. **Return**: top-K from reranked results

This is called a **two-stage retrieval pipeline** and is the industry standard for production RAG systems.

---

## 3. Model Choice

The default cross-encoder is `Xenova/ms-marco-MiniLM-L-6-v2`:

| Property | Value |
|---------|-------|
| Architecture | BERT-base (6 layers, 384 hidden dim) |
| Training data | MS MARCO passage ranking dataset |
| Input | (query, passage) pair |
| Output | Single relevance logit |
| Size | ~23MB (ONNX, fp32) |
| Latency | ~5-15ms per pair in WASM (browser) |

For 30 candidates, reranking takes ~150-450ms — acceptable for interactive use.

Alternative: `mixedbread-ai/mxbai-rerank-xsmall-v1` (newer, similar size). The model is configurable in RAG settings.

---

## 4. Implementation

### Web Worker (`embedding.worker.ts`)

The worker handles two pipelines:
1. **Feature extraction** — embedding (loads on `load` message)
2. **Text classification** — reranking (loads on `load-reranker` message)

The reranker loads lazily on first use:

```ts
// load-reranker message handler
reranker = await pipeline('text-classification', model, { dtype: 'fp32' });
```

The `rerank` message handler:
```ts
// For each (query, passage) pair:
const output = await reranker({ text: query, text_pair: passage });
const score = output[0]?.score ?? 0;
```

The Transformers.js `text-classification` pipeline with a cross-encoder model internally:
1. Tokenizes `[CLS] query [SEP] passage [SEP]`
2. Runs the BERT forward pass
3. Returns the logit from the classification head as `score`

### Embedding Service (`embeddingService.ts`)

```ts
rerank(query: string, passages: string[], model: string): Promise<RerankResult[]>
```

- Ensures the reranker model is loaded in the worker (lazy, one-time)
- Sends all passages in a single `rerank` message
- Worker scores each pair sequentially
- Returns `{ index, score }[]` sorted by descending score

### RAG Service (`ragService.ts`)

In `queryCollection()`, after hybrid search (or any first-pass mode):

```ts
if (settings.rerankEnabled && fused.length > 0) {
  return rerankResults(query, fused, settings);
}
```

`rerankResults()`:
1. Extracts `chunk.text` from each candidate
2. Calls `rerank(query, passages, settings.rerankModel)`
3. Maps reranked indices back to original chunks
4. Slices to `topK`

### Why Rerank After RRF, Not Before

RRF merges results from multiple retrievers. Reranking should see the **best candidates from all sources**, not just one retriever. The pipeline is:

```
BM25 results (top 30) ─┐
                         ├→ RRF (top 30) → Reranker (top 30 → top K)
Vector results (top 30) ┘
```

---

## 5. Tradeoffs

| Decision | Alternative | Why this choice |
|---------|------------|-----------------|
| `text-classification` pipeline | Raw model + tokenizer | Pipeline handles tokenization and output parsing; simpler code |
| Same Web Worker as embeddings | Separate worker | Avoids spawning a second worker; both pipelines share WASM runtime |
| Lazy reranker loading | Load on app start | Avoids downloading ~23MB model until user enables the feature |
| Sequential pair scoring | Batched scoring | Transformers.js text-classification doesn't batch pairs; sequential is the only option |
| Default off (`rerankEnabled: false`) | Default on | Downloading a model without user consent is poor UX; opt-in is safer |
| fp32 dtype | fp16/quantized | Broader browser compatibility; 23MB is acceptable |

---

## 6. Performance Characteristics

| Metric | Value (typical) |
|--------|----------------|
| Model download | ~23MB, one-time |
| Model load time | ~2-5s (WASM compilation + weight loading) |
| Per-pair inference | ~5-15ms |
| 30 candidates rerank | ~150-450ms |
| Memory footprint | ~50-80MB (model + WASM runtime) |

The latency is additive to first-pass retrieval. For a full hybrid + rerank pipeline on 1000 chunks:
- BM25: ~1ms
- Vector scan: ~5-10ms
- RRF: <1ms
- Rerank (30 candidates): ~150-450ms
- **Total: ~160-460ms** (dominated by reranking)

---

## 7. File References

| File | Relevant code |
|------|--------------|
| `src/workers/embedding.worker.ts` | `load-reranker` and `rerank` message handlers |
| `src/services/embeddingService.ts` | `ensureRerankerLoaded()`, `rerank()`, `RerankResult` |
| `src/services/ragService.ts` | `rerankResults()`, rerank integration in `queryCollection()` |
| `src/types/index.ts` | `RAGSettings.rerankEnabled`, `RAGSettings.rerankModel` |
| `src/components/rag/RAGSettingsPanel.tsx` | Reranking toggle + model input |
