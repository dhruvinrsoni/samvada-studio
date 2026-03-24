# Chunking Strategies — Technical Documentation

> Target audience: senior engineers and CS students. Covers why chunking matters, fixed-size vs parent-child strategies, markdown-aware splitting, chunk overlap, and markdown cleaning.

---

## 1. Problem: Why Chunking Matters

LLMs have finite context windows (4k-128k tokens). Embedding models have even smaller input limits (typically 512 tokens). Documents can be thousands of tokens. Chunking splits documents into pieces that:

1. **Fit the embedding model's input limit** — a 10,000-word document can't be embedded as one vector
2. **Enable precise retrieval** — smaller chunks match more specifically to queries
3. **Control context quality** — the LLM receives focused, relevant excerpts instead of entire documents

Chunking is a **lossy compression** step. Every split risks losing context at the boundary. Every overlap adds redundancy. The strategy directly impacts retrieval quality.

---

## 2. Fixed-Size Chunking

The simplest strategy: slide a window of `chunkSize` characters across the text with `chunkOverlap` character overlap between adjacent chunks.

### Break Point Selection

Naive fixed-size chunking cuts mid-sentence. The implementation uses a priority-based break point finder (`findBreakPoint`) that searches backward from the chunk boundary for the best split point:

| Priority | Break type | Heuristic |
|---------|-----------|-----------|
| 1 (best) | Paragraph break (`\n\n`) | Topics change at paragraph boundaries |
| 2 | Sentence end (`. `, `! `, `? `) | Sentences are atomic units of meaning |
| 3 | Line break (`\n`) | Lines often correspond to list items or code |
| 4 | Word boundary (space) | Never split mid-word |
| 5 (worst) | Raw position | Only if no better break exists in window |

Each break type requires the candidate position to be at least 30% into the chunk (`> window.length * 0.3`). This prevents degenerate cases where a paragraph break at position 5 of a 1000-char chunk would create a tiny 5-char chunk followed by a 995-char chunk.

### Overlap

Adjacent chunks share `chunkOverlap` characters. This prevents losing context at boundaries. If a sentence spans a chunk boundary, the overlap ensures it appears in at least one chunk in its entirety.

Typical setting: `chunkSize=1024, chunkOverlap=100`.

### The Micro-Chunk Bug (Historical)

A critical bug was discovered in the overlap logic: when the remaining text at the end of a section was shorter than `chunkOverlap`, the step calculation `end - start - chunkOverlap` produced a negative value, clamped to 1 by `Math.max(step, 1)`. This caused the algorithm to advance by 1 character per iteration, creating hundreds of nearly-identical micro-chunks from URL fragments at the end of markdown files.

Fix: `if (end >= text.length) break;` — stop chunking when the last chunk reaches the end of the text.

---

## 3. Markdown-Aware Chunking

For markdown files, `chunkMarkdown()` first splits by headings, then applies fixed-size chunking within each heading section.

### Heading Splitting (`splitByHeadings`)

Lines matching `^#{1,6}\s+(.+)$` start new sections. Each section carries:
- `heading`: the full heading line (e.g., `## Features`)
- `text`: body text between this heading and the next
- `startOffset`: character position in the original document

This ensures chunks are semantically coherent — a chunk about "Installation" won't bleed into "Configuration".

### Heading Prepending

Each child chunk from a heading section has the heading prepended:

```
## Features

This framework supports multiple languages including Python...
```

This gives the embedding model (and the LLM) the heading context for every chunk, even when the chunk body alone is ambiguous.

---

## 4. Parent-Child Chunking

The key insight: **optimal chunk size for retrieval differs from optimal chunk size for LLM context**.

- **Small chunks** (256 chars) match queries more precisely — less noise, tighter semantic alignment
- **Large chunks** (1024 chars) give the LLM more context — complete paragraphs, full code examples, enough surrounding text to understand the point

Parent-child chunking uses both:

```
Document text
       │
       ▼
  Split into parent chunks (chunkSize, e.g. 1024 chars)
       │
       ▼
  Split each parent into child chunks (childChunkSize, e.g. 256 chars)
       │
       ▼
  Embed child chunks (small, precise)
  Each child stores parentText in metadata
       │
       ▼
  At retrieval: match on child chunks
  At formatting: use parentText for LLM context (deduplicated)
```

### Implementation (`chunkTextParentChild`)

1. Create parent chunks using `chunkMarkdown()` or `chunkPlain()`
2. For each parent, split its body into child chunks using `splitBySizeWithOverlap()` with `childChunkSize`
3. If a parent's body is already smaller than `childChunkSize`, the parent becomes its own child (no splitting)
4. Each child's `metadata.parentText` stores the full parent text

### Deduplication at Format Time

Multiple child chunks from the same parent may all match a query. Without deduplication, the LLM would receive the same parent text multiple times.

`formatRAGContext()` deduplicates using a `Set` keyed on `source::parentText`:

```ts
const dedupKey = `${src}::${contextText}`;
if (seen.has(dedupKey)) continue;
seen.add(dedupKey);
```

This ensures each unique parent text appears exactly once in the LLM's context, regardless of how many of its children matched.

---

## 5. Markdown Cleaning

Raw markdown contains syntax that pollutes embeddings with keyword-rich but semantically meaningless content:

| Markdown element | Example | Problem |
|-----------------|---------|---------|
| Badge images | `[![Build](https://img.shields.io/...)](...)` | URL noise |
| Inline links | `[Click here](https://...)` | URL in embedding |
| Bare URLs | `https://github.com/user/repo` | Tokenizes into fragments |
| HTML tags | `<img src="...">` | Structural noise |

`cleanMarkdownForEmbedding()` strips these before chunking:

```ts
text = text.replace(/\[!\[([^\]]*)\]\([^)]*\)\]\([^)]*\)/g, '$1'); // Badge images → alt text
text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');              // Inline images → alt text
text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');               // Inline links → link text
text = text.replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1');              // Reference links → link text
text = text.replace(/^\[[^\]]+\]:\s+.*$/gm, '');                   // Reference definitions → remove
text = text.replace(/https?:\/\/[^\s)>\]]+/g, '');                 // Bare URLs → remove
text = text.replace(/<[^>]+>/g, '');                                // HTML tags → remove
text = text.replace(/\n{3,}/g, '\n\n');                             // Collapse blank lines
```

This is applied only to markdown files, during ingestion, before chunking.

---

## 6. Chunk Size Tradeoffs

| Smaller chunks | Larger chunks |
|---------------|---------------|
| More precise matching | More context per chunk |
| Higher recall (more chunks to search) | Fewer chunks (less storage, faster scan) |
| Risk: too small → fragments lose meaning | Risk: too large → noise drowns signal |
| Better for specific factual queries | Better for broad summary queries |

The parent-child strategy resolves this tension: small children for matching, large parents for context.

### Recommended Settings

| Strategy | Chunk size | Overlap | Child size |
|---------|-----------|---------|------------|
| Fixed (default) | 1024 chars | 100 chars | — |
| Parent-child | 1024 chars | 100 chars | 256 chars |

---

## 7. Tradeoffs

| Decision | Alternative | Why this choice |
|---------|------------|-----------------|
| Character-based chunking | Token-based chunking | Character counts are model-agnostic; token counts vary by tokenizer |
| Heading-first splitting for markdown | Flat fixed-size | Preserves semantic sections; headings provide context |
| Parent text stored in child metadata | Separate parent store with ID lookups | Simplicity; small storage overhead |
| Clean markdown before chunking | Clean after chunking / at query time | Cleaning before chunking prevents URL fragments from being embedded |
| 30% minimum break point | No minimum | Prevents degenerate tiny chunks from early paragraph breaks |
| Parent-child off by default | On by default | Requires re-ingesting documents; users should opt in consciously |

---

## 8. File References

| File | Relevant code |
|------|--------------|
| `src/services/textChunker.ts` | `chunkText()`, `chunkTextParentChild()`, `splitByHeadings()`, `splitBySizeWithOverlap()`, `findBreakPoint()` |
| `src/services/documentParser.ts` | `cleanMarkdownForEmbedding()` |
| `src/services/ragService.ts` | `ingestDocument()` — strategy dispatch; `formatRAGContext()` — parent text dedup |
| `src/types/index.ts` | `RAGSettings.chunkingStrategy`, `RAGSettings.childChunkSize`, `RAGChunk.metadata.parentText` |
| `src/components/rag/RAGSettingsPanel.tsx` | Chunking strategy selector + child chunk size slider |
