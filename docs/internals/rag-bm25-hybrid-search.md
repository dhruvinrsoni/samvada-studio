# BM25 & Hybrid Search — Technical Documentation

> Target audience: senior engineers and CS students. Covers the BM25 algorithm, why vector-only search fails, Reciprocal Rank Fusion, and how hybrid search is implemented in Samvada Studio.

---

## 1. Problem: Why Vector-Only Search Fails

Vector (semantic) search embeds queries and documents into a shared high-dimensional space and retrieves by cosine similarity. It excels at meaning-level matching ("What are the project features?" matches a paragraph about capabilities) but **fails on exact tokens**:

| Query | Expected match | Vector search result |
|-------|---------------|---------------------|
| `smruti-cortex` | Document mentioning that project name | Random semantically similar text |
| `error code E4012` | Log entry containing that code | Unrelated error descriptions |
| `v7.2 release` | Changelog section for that version | Any version-related content |

The root cause: embedding models compress text into ~384-dimensional vectors. Rare tokens (project names, error codes, version strings) occupy negligible signal in that space. Two documents can have identical cosine similarity to a query despite only one containing the exact keyword.

---

## 2. Algorithm: BM25

BM25 (Best Matching 25) is a **lexical ranking function** from the Okapi information retrieval system (1994). It scores documents by how well their words match the query words, accounting for term frequency, document length, and corpus statistics.

### The Formula

For a query Q with terms q₁, q₂, ..., qₙ and a document D:

```
Score(D, Q) = Σ IDF(qᵢ) · [ f(qᵢ, D) · (k₁ + 1) ] / [ f(qᵢ, D) + k₁ · (1 - b + b · |D|/avgdl) ]
```

Where:
- **f(qᵢ, D)** = frequency of term qᵢ in document D (term frequency)
- **|D|** = length of document D in tokens
- **avgdl** = average document length across the corpus
- **IDF(qᵢ)** = inverse document frequency: `ln(1 + (N - n(qᵢ) + 0.5) / (n(qᵢ) + 0.5))`
  - N = total documents, n(qᵢ) = documents containing qᵢ
- **k₁** = term frequency saturation parameter (typical: 1.2–2.0, we use 1.5)
- **b** = document length normalization parameter (typical: 0.75)

### What Each Component Does

**IDF** (Inverse Document Frequency): Words appearing in many documents are less informative. "the" appears everywhere → low IDF. "smruti-cortex" appears in one document → high IDF. This is why BM25 catches rare keywords that vectors miss.

**Term Frequency Saturation** (k₁): The first occurrence of a word matters most. The 10th occurrence of "python" in a document doesn't make it 10x more relevant than having it once. k₁ controls how quickly additional occurrences stop mattering. At k₁=1.5, the score from TF asymptotically approaches (k₁+1) = 2.5.

**Length Normalization** (b): Long documents naturally contain more term occurrences. Without normalization, a 10,000-word document would always outscore a 100-word document. b=0.75 heavily normalizes for length; b=0 disables normalization entirely.

### Tokenization

Before BM25 scoring, text is tokenized:
1. Lowercased
2. Non-alphanumeric characters replaced with spaces
3. Split on whitespace
4. Tokens shorter than 2 characters removed
5. Stop words removed (common English words: "the", "is", "at", etc.)

This is a **bag-of-words** model — word order is completely ignored. "dog bites man" and "man bites dog" produce identical BM25 scores.

---

## 3. Algorithm: Reciprocal Rank Fusion (RRF)

BM25 and vector search produce scores on **incompatible scales**. Cosine similarity ranges [0, 1]. BM25 scores are unbounded positive reals. You cannot simply add or average them.

RRF (Cormack et al., 2009) solves this by ignoring scores entirely and using only **ranks**:

```
RRF_Score(d) = Σ  1 / (k + rank_i(d))
               i
```

Where:
- `rank_i(d)` = position of document d in ranked list i (0-indexed)
- `k` = smoothing constant (standard: 60)

### Why k=60

The constant k dampens the advantage of being ranked #1 vs #2. With k=60:
- Rank 0 → score 1/61 ≈ 0.0164
- Rank 1 → score 1/62 ≈ 0.0161
- Rank 10 → score 1/71 ≈ 0.0141

The #1 result is only 1.6% better than #2, preventing a single retriever from dominating. The value 60 was empirically determined in the original paper and has become the standard default.

### Why RRF Over Score Normalization

| Approach | Problem |
|---------|---------|
| Min-max normalize then average | Sensitive to outlier scores; requires knowing global min/max |
| Z-score normalize then average | Assumes Gaussian score distribution (often violated) |
| Multiply scores | One zero score kills the product |
| **RRF** | **Scale-independent, parameter-free (except k), robust** |

---

## 4. Implementation

### `vectorStore.ts` — BM25 Search

```ts
searchByBM25(chunks: RAGChunk[], query: string, topK: number, k1 = 1.5, b = 0.75): RAGSearchResult[]
```

- Tokenizes query and all chunk texts
- Computes IDF for each unique query term against the chunk corpus
- Scores each chunk using the BM25 formula
- Returns top-K by score (descending)

The IDF values are cached in a `Map` per query to avoid redundant computation.

### `vectorStore.ts` — RRF

```ts
reciprocalRankFusion(rankedLists: RAGSearchResult[][], topK: number, k = 60): RAGSearchResult[]
```

- Iterates each ranked list, assigning RRF score `1/(k + rank + 1)` to each item
- Accumulates scores by chunk ID across all lists
- Returns top-K by fused score

### `ragService.ts` — Hybrid Query

In `queryCollection()`, when `searchMode === 'hybrid'`:

1. Loads all chunks for the collection once
2. Runs `searchByVector()` and `searchByBM25()` in sequence (both scan the same chunks)
3. Feeds both result lists into `reciprocalRankFusion()`
4. Returns top-K fused results (or passes to reranker if enabled)

The first-pass retrieves `FIRST_PASS_K = 30` results from each retriever, ensuring enough candidates for RRF to work with before truncating to the user's configured `topK`.

---

## 5. Tradeoffs

| Decision | Alternative | Why this choice |
|---------|------------|-----------------|
| Inline BM25 implementation (~50 lines) | `fast-bm25` npm package | No dependency; algorithm is simple; full control over tokenization |
| Stop word list hardcoded | No stop words / dynamic list | Hardcoded is sufficient for English; keeps tokenizer stateless |
| Bag-of-words tokenizer | Stemming (Porter/Snowball) | Stemming adds complexity; BM25 with exact tokens already catches the keywords that vectors miss |
| RRF k=60 | Tunable k | Standard default; no empirical data to justify a different value for this use case |
| Sequential BM25 + vector | True parallel (Web Worker) | BM25 is fast (~1ms for 1000 chunks); parallelization overhead not justified |

---

## 6. File References

| File | Relevant functions |
|------|-------------------|
| `src/services/vectorStore.ts` | `tokenize()`, `computeIDF()`, `searchByBM25()`, `reciprocalRankFusion()`, `searchByVector()` |
| `src/services/ragService.ts` | `queryCollection()` — hybrid dispatch logic |
| `src/types/index.ts` | `RAGSearchMode`, `RAGSettings.searchMode` |
| `src/components/rag/RAGSettingsPanel.tsx` | Search mode selector UI |
