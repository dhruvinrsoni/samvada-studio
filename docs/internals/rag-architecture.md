# RAG Architecture — Technical Documentation

> Target audience: senior engineers and CS students working on or studying the RAG pipeline in Samvada Studio.

---

## 1. What RAG Is and Why It Exists

Retrieval-Augmented Generation (RAG) grounds LLM responses in user-provided documents. Without RAG, the model can only answer from its training data. With RAG, the model receives relevant document excerpts in its system prompt and answers from those.

Samvada Studio's RAG is **entirely client-side** — no server, no cloud vector database. Documents, embeddings, and indexes live in the browser's IndexedDB. This is a hard architectural constraint that shapes every design choice.

---

## 2. File Map

```
src/
├── types/index.ts                    ← RAGChunk, RAGCollection, RAGDocument, RAGSettings, RAGSearchMode
├── services/
│   ├── ragService.ts                 ← Orchestrator: ingest, query, format, query expansion
│   ├── vectorStore.ts                ← IndexedDB CRUD + vector search + BM25 + RRF
│   ├── embeddingService.ts           ← Embedding + reranking providers (Ollama / Transformers.js)
│   ├── documentParser.ts             ← Text extraction from PDF, DOCX, CSV, TXT, MD
│   └── textChunker.ts                ← Fixed-size and parent-child chunking strategies
├── workers/
│   └── embedding.worker.ts           ← Web Worker: Transformers.js embedding + cross-encoder reranking
├── context/
│   └── RAGContext.tsx                 ← React state, settings persistence, public API
└── components/rag/
    ├── KnowledgePanel.tsx             ← Collection management UI
    ├── DocumentUpload.tsx             ← File upload with progress
    ├── RAGSettingsPanel.tsx           ← All RAG settings controls
    └── RAGAttachmentSelector.tsx      ← Per-chat collection picker
```

---

## 3. Data Model

### IndexedDB Schema (database: `samvada-rag`, version 1)

| Object Store | Key Path | Indexes |
|-------------|----------|---------|
| `collections` | `id` | — |
| `documents` | `id` | `byCollection` (collectionId) |
| `chunks` | `id` | `byCollection` (collectionId), `byDocument` (documentId) |

### Key Types

```ts
interface RAGChunk {
  id: string;
  documentId: string;
  collectionId: string;
  text: string;              // The chunk text (child text for parent-child strategy)
  vector: number[];          // Embedding vector
  chunkIndex: number;
  metadata: {
    heading?: string;        // Markdown heading this chunk falls under
    startOffset?: number;
    source: string;          // Original filename
    parentText?: string;     // Larger parent chunk (parent-child strategy only)
  };
}

interface RAGSettings {
  chunkSize: number;                            // Parent/fixed chunk size in chars
  chunkOverlap: number;                         // Overlap between adjacent chunks
  topK: number;                                 // Final number of results to inject
  similarityThreshold: number;                  // Minimum cosine similarity for vector search
  embeddingModel: string;                       // e.g. 'nomic-embed-text'
  embeddingProvider: 'ollama' | 'transformers';
  searchMode: 'hybrid' | 'vector' | 'keyword';
  rerankEnabled: boolean;
  rerankModel: string;                          // e.g. 'Xenova/ms-marco-MiniLM-L-6-v2'
  queryExpansionEnabled: boolean;
  queryExpansionMode: 'multi-query' | 'hyde';
  chunkingStrategy: 'fixed' | 'parent-child';
  childChunkSize: number;                       // Child chunk size (parent-child only)
  ragTemplate: string;                          // System prompt template with {context}
}
```

---

## 4. Pipeline Overview

### Ingestion (upload time)

```
File (PDF/DOCX/CSV/TXT/MD)
       │
       ▼
  documentParser.ts
  ├── PDF → pdfjs-dist
  ├── DOCX → mammoth
  ├── CSV → papaparse
  └── TXT/MD → FileReader
       │
       ▼  (markdown files only)
  cleanMarkdownForEmbedding()
  ├── Strip badge images, inline links, bare URLs, HTML tags
       │
       ▼
  textChunker.ts
  ├── chunkText()          → fixed-size chunks with overlap
  └── chunkTextParentChild() → small children mapped to large parents
       │
       ▼
  embeddingService.ts
  ├── OllamaEmbeddingProvider  → POST /api/embed (batched)
  └── TransformersEmbeddingProvider → Web Worker (sequential)
       │
       ▼
  vectorStore.ts → IndexedDB
  └── addChunks(chunks)
```

### Query (chat time)

```
User query
       │
       ▼
  [Optional] Query Expansion (ragService.expandQueries)
  ├── multi-query → LLM generates 2-3 query variants
  └── hyde → LLM generates hypothetical answer
       │
       ▼  (for each query variant)
  ragService.queryCollection()
       │
       ├── [keyword mode] → BM25 search only
       ├── [vector mode]  → cosine similarity search only
       └── [hybrid mode]  → BM25 + vector in parallel → RRF fusion
              │
              ▼
  [If multi-query] RRF fusion across query variants
              │
              ▼
  [Optional] Cross-encoder reranking (embeddingService.rerank)
  └── Transformers.js Web Worker scores (query, passage) pairs
              │
              ▼
  ragService.formatRAGContext()
  ├── Group by source filename
  ├── Use parentText if available (dedup by parent)
  └── Inject into system prompt via {context} template
              │
              ▼
  ChatArea.tsx → effectiveChatSettings.customInstructions
  └── Sent as system message to LLM
```

---

## 5. Settings Versioning

RAG settings are cached in `localStorage` under `samvada-studio-rag-settings`. When new fields are added, a version counter (`RAG_SETTINGS_VERSION` in `RAGContext.tsx`) is bumped. On load, if the stored version is older, the entire settings object is replaced with `DEFAULT_RAG_SETTINGS` from code.

This prevents stale settings from causing silent failures (e.g., missing `searchMode` field defaulting to `undefined`).

---

## 6. Why Client-Side

| Constraint | Consequence |
|-----------|-------------|
| No backend | IndexedDB for storage, no Postgres/pgvector |
| No server-side embedding | Must use Ollama (local) or Transformers.js (in-browser WASM) |
| No HNSW/FAISS index | Brute-force O(n) cosine scan — acceptable for <100k chunks |
| No server-side reranking | Cross-encoder runs in Web Worker via Transformers.js |
| No server-side query expansion | Must use the user's configured LLM provider |

The architecture scales to corpora of a few hundred documents (thousands of chunks). For larger corpora, the O(n) vector scan would need replacing with a client-side ANN index (e.g., `hnswlib-wasm`).

---

## 7. Integration Points

| File | What changes |
|------|-------------|
| `App.tsx` | Wraps `AppContent` with `<RAGProvider>` |
| `AdminPanel.tsx` | Adds "Knowledge" tab rendering `KnowledgePanel` and `RAGSettingsPanel` |
| `ChatArea.tsx` | Queries collections before LLM call; injects RAG context into system message; provides `llmCaller` for query expansion |
| `ChatSettings.tsx` / sidebar | `RAGAttachmentSelector` for per-chat collection binding |

---

## 8. Tradeoffs

| Decision | Alternative considered | Why this choice |
|---------|----------------------|-----------------|
| Brute-force cosine scan | HNSW index | Simplicity; acceptable perf for small corpora; no WASM dependency |
| Store vectors in IndexedDB | In-memory only | Persistence across sessions; no re-embedding on reload |
| Parent text stored per-child chunk | Separate parent store with ID lookups | Simplicity; small storage overhead for typical doc sizes |
| RRF over score normalization | Min-max normalize + weighted sum | RRF is rank-based, avoids incompatible score scales between BM25 and cosine |
| RAG context in system message | Prepend to user message | Models treat system messages as more authoritative; reduces hallucination |
| Settings version bump on schema change | Migration logic | Simpler; acceptable since defaults are sensible |
