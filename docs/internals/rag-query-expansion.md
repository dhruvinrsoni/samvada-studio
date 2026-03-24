# Query Expansion — Technical Documentation

> Target audience: senior engineers and CS students. Covers the vocabulary mismatch problem, multi-query generation, HyDE (Hypothetical Document Embeddings), and how query expansion is implemented in Samvada Studio.

---

## 1. Problem: Vocabulary Mismatch

Users and documents rarely use the same words for the same concept. The user asks "How do I set up the project?" but the document says "Installation instructions" and "Getting started guide." Neither BM25 (exact keyword match) nor vector search (semantic similarity) fully bridges this gap:

- **BM25** misses because "set up" ≠ "installation" at the token level
- **Vector search** may retrieve vaguely related content because "set up" and "installation" are close but not identical in embedding space

Query expansion attacks this by generating **multiple representations** of the same intent, each with different vocabulary, and retrieving for all of them.

---

## 2. Algorithm: Multi-Query

The simplest expansion strategy. Given a user query, ask the LLM to generate 2-3 alternative phrasings:

```
User query:     "How do I set up the project?"
Variant 1:      "Installation and setup instructions"
Variant 2:      "Getting started with the project"
Variant 3:      "Project configuration and prerequisites"
```

Each variant is independently used as a retrieval query. Results from all variants (plus the original) are merged using RRF.

### Why It Works

Different phrasings activate different keyword matches (BM25) and occupy different regions of embedding space (vector search). The union of results has higher **recall** — more relevant documents are found — while RRF ensures that documents appearing in multiple result sets rank highest.

### System Prompt

```
You are a search query generator. Given a user question, generate 2-3 alternative
phrasings that capture different semantic angles of the same intent. Output ONLY the
alternative queries, one per line. Do not number them or add any explanation.
```

The prompt is deliberately restrictive: no numbering (avoids parsing complexity), no explanation (avoids noise), one per line (trivial to split).

---

## 3. Algorithm: HyDE (Hypothetical Document Embeddings)

HyDE (Gao et al., 2022) takes a fundamentally different approach. Instead of rephrasing the question, it generates a **hypothetical answer**:

```
User query:     "How do I set up the project?"
Hypothetical:   "To set up the project, first clone the repository using git clone.
                 Then install dependencies with npm install. Create a .env file
                 with your configuration. Finally, run npm run dev to start the
                 development server."
```

This hypothetical answer is then **embedded** and used as the search query instead of the original question.

### Why It Works

The core insight: document-to-document similarity is stronger than question-to-document similarity. When you embed the hypothetical answer, it occupies a similar region in embedding space as the actual answer document. The LLM is essentially translating a question-shaped query into an answer-shaped query.

### When HyDE Hurts

HyDE can backfire when:
- The LLM generates an incorrect hypothetical (hallucination) that steers retrieval toward wrong documents
- The corpus is highly specialized and the LLM lacks domain knowledge
- The query is already precise and well-specified (no vocabulary mismatch to solve)

This is why HyDE is offered as an option alongside multi-query, not as the default.

---

## 4. Implementation

### `ragService.ts` — Query Expansion

```ts
type LLMCallerFn = (prompt: string, systemInstruction: string) => Promise<string>;
```

The RAG service doesn't know about LLM providers. Instead, it accepts a callback function that the caller (`ChatArea.tsx`) provides. This keeps the RAG pipeline decoupled from the chat infrastructure.

#### `expandQueries(query, mode, llmCaller)`

For `multi-query`:
1. Calls `llmCaller(query, MULTI_QUERY_SYSTEM)`
2. Splits response by newline
3. Strips numbering prefixes (`1. `, `2) `, etc.)
4. Filters empty lines and lines matching the original query
5. Returns 2-3 expanded queries

For `hyde`:
1. Calls `llmCaller(query, HYDE_SYSTEM)`
2. Returns the hypothetical answer as a single expanded "query"

#### `queryMultipleCollections(query, collectionIds, settings, llmCaller?)`

1. If expansion is enabled and `llmCaller` is provided, calls `expandQueries()`
2. Runs retrieval for each query variant (original + expanded) across all collections
3. If multiple variants produced results, merges them with RRF
4. Returns the fused top-K results

### `ChatArea.tsx` — LLM Caller Wiring

```ts
const llmCaller = selectedProvider
  ? async (prompt: string, systemInstruction: string) => {
      const { message } = await callLLMProvider(
        selectedProvider,
        prompt,
        [{ content: systemInstruction }],
      );
      return message.content;
    }
  : undefined;

const { results, errors } = await queryCollections(content, ragIds, llmCaller);
```

The `llmCaller` uses whatever LLM provider the user has currently selected for chat. This means query expansion uses the same model as the conversation itself.

---

## 5. Latency Impact

| Step | Added latency |
|------|--------------|
| Multi-query LLM call | ~1-3s (depends on model) |
| HyDE LLM call | ~2-5s (longer output) |
| Extra retrieval passes | ~5-15ms per variant (small compared to LLM call) |
| RRF fusion | <1ms |

Total added latency is dominated by the LLM call. For local models (Ollama), this is typically 1-5 seconds. For cloud providers, it depends on the API.

This is why query expansion is **off by default** — it doubles the time before the user sees a response. Users opt in when recall matters more than latency.

---

## 6. Tradeoffs

| Decision | Alternative | Why this choice |
|---------|------------|-----------------|
| LLM caller as callback | RAG service calls LLM directly | Decouples RAG from provider config; RAG service stays pure |
| Same model for expansion as for chat | Dedicated small model | Simpler; no additional model configuration |
| 2-3 variants for multi-query | More variants | Diminishing returns; each variant adds a retrieval pass |
| Default off | Default on | Latency cost is significant; user should opt in |
| RRF to merge expanded results | Score averaging | Consistent with hybrid search fusion; scale-independent |
| HyDE as alternative to multi-query | HyDE as complement (both) | Combining both adds 2 LLM calls and complexity; either/or is simpler |

---

## 7. File References

| File | Relevant code |
|------|--------------|
| `src/services/ragService.ts` | `LLMCallerFn`, `expandQueries()`, `queryMultipleCollections()` |
| `src/components/chat/ChatArea.tsx` | `llmCaller` creation and passing |
| `src/context/RAGContext.tsx` | `queryCollections()` signature with optional `llmCaller` |
| `src/types/index.ts` | `RAGSettings.queryExpansionEnabled`, `RAGSettings.queryExpansionMode` |
| `src/components/rag/RAGSettingsPanel.tsx` | Query expansion toggle + mode selector |
