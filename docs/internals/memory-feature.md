# AI Memory Feature — Technical Documentation

> Target audience: senior engineers onboarding to or maintaining the Memory feature in Samvada Studio.

---

## 1. Overview & Motivation

The Memory feature lets the application autonomously learn facts about the user — preferences, habits, communication style, stated goals, subtle wishes — and inject them into future LLM conversations to produce personalised responses.

**Key properties:**
- **Opt-in, zero footprint when off.** A single global toggle. When disabled, no code in the LLM pipeline runs.
- **Local-only.** All memory lives in `localStorage` under the key `samvada-studio-memory`. Nothing is sent to any external service.
- **Ollama-dependent for extraction.** Memory extraction and compaction require a locally-running Ollama model. If Ollama is unavailable, chat continues normally — extraction silently skips.
- **Autonomous size management.** A slider caps the number of entries. Auto-compact triggers when the limit is reached. Manual compact is always available.

---

## 2. Architecture

The feature is a **vertical slice** — fully self-contained, hooking into two existing call sites.

```
src/
├── types/memory.ts             ← All types (MemoryEntry, MemorySettings, MemoryState, MemoryAction)
├── services/memoryService.ts   ← Pure logic: prompts, parsing, injection text, model fetching
├── context/MemoryContext.tsx   ← React state (useReducer), localStorage persistence, public API
└── components/memory/
    ├── MemoryPanel.tsx         ← Full settings + entries UI (rendered in AdminPanel Memory tab)
    ├── MemoryIndicator.tsx     ← Progress bar component (green → yellow → red, pulse >90%)
    └── MemoryEntryItem.tsx     ← Single entry card with delete button
```

**Integration points (only two files modified):**

| File | What changes |
|------|-------------|
| `src/App.tsx` | Wrap `AppContent` with `<MemoryProvider>` |
| `src/components/admin/AdminPanel.tsx` | Add 🧠 Memory tab (type + button + content) |
| `src/components/chat/ChatArea.tsx` | Inject memories before LLM call; trigger extraction after response |

**Data flow:**

```
User submits prompt
       │
       ▼
handleSendPrompt (ChatArea)
       ├── [A] getInjectionText() → if non-empty, shallow-copy chatSettings with memory appended
       ├── getLLMResponse(... effectiveChatSettings ...)
       │        └── buildSystemMessageParts(effectiveChatSettings)
       │            → memory appears inside customInstructions → SystemMessagePart[]
       ├── dispatch UPDATE_PROMPT_RESPONSE
       └── [B] triggerExtraction(content, message.content, pnr.id)  ← fire-and-forget
                    │
                    ├── if !isEnabled || !modelName || inFlight → return
                    ├── if at capacity && autoCompact → runCompaction()
                    ├── callLLMProvider(ephemeralOllamaProvider, extractionPrompt)
                    ├── parseExtractionResult(rawText) → string[]
                    ├── dedup against existing entries
                    └── dispatch ADD_ENTRIES → persisted to samvada-studio-memory
```

**Why `MemoryContext` is a peer to `ChatContext`, not nested inside it:**

Memory is orthogonal to chat data. Nesting it inside `ChatProvider` would couple the two state domains and risk losing memories when chat state is reset. As a sibling provider, `MemoryProvider` has an independent lifecycle and its own `localStorage` key.

---

## 3. Type Definitions (`src/types/memory.ts`)

```ts
export type MemorySource = 'extraction' | 'manual' | 'compaction';

export interface MemoryEntry {
  id: string;                    // uuid v4 (generateId())
  content: string;               // Single atomic fact — char-limited at write time
  createdAt: Date;
  updatedAt: Date;
  source: MemorySource;          // Provenance: where did this entry come from?
  extractedFromPnrId?: string;   // Debug: which PnR triggered the extraction
}

export interface MemorySettings {
  isEnabled: boolean;                 // Global toggle
  extractionModelEndpoint: string;    // Ollama base URL (e.g. "http://localhost:11434")
  extractionModelName: string;        // Ollama model name (e.g. "llama3.2:latest")
  maxEntries: number;                 // Slider: 10–500, default 100
  maxCharsPerEntry: number;           // Slider: 50–500, default 150
  autoCompact: boolean;               // true: compact before adding when full
}

export interface MemoryState {
  entries: MemoryEntry[];
  settings: MemorySettings;
  isExtracting: boolean;         // Transient — NOT persisted to localStorage
  isCompacting: boolean;         // Transient — NOT persisted to localStorage
  lastExtractionAt: Date | null;
  lastCompactionAt: Date | null;
}

export type MemoryAction =
  | { type: 'LOAD_MEMORY'; payload: MemoryState }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<MemorySettings> }
  | { type: 'ADD_ENTRIES'; payload: MemoryEntry[] }      // batch add post-extraction
  | { type: 'DELETE_ENTRY'; payload: string }            // entry id
  | { type: 'REPLACE_ENTRIES'; payload: MemoryEntry[] }  // post-compaction
  | { type: 'SET_EXTRACTING'; payload: boolean }
  | { type: 'SET_COMPACTING'; payload: boolean }
  | { type: 'CLEAR_ALL_ENTRIES' };
```

**`isExtracting` and `isCompacting` are never saved.** They are UI-only flags restored to `false` on every load.

---

## 4. Memory Service (`src/services/memoryService.ts`)

Pure functions — no React, no side effects beyond the Ollama API call.

### `extractMemories(userMsg, assistantMsg, existing, settings, pnrId)`

Calls Ollama with an extraction prompt and returns new `MemoryEntry[]`.

- Skips silently if both messages are < 20 characters (trivial exchange guard).
- Builds an **ephemeral** `LLMProviderConfig` from `settings` — never stored in app state, temperature 0.1 for deterministic JSON output.
- Calls `callLLMProvider()` directly (not `getLLMResponse`) because memory extraction needs its own isolated provider config, not the chat's configured provider.
- Deduplication: normalised lowercase equality against all existing entry contents.

### `buildExtractionPrompt(userMsg, assistantMsg, existing, maxChars)`

Produces the extraction prompt. Key design choices:
- Rules are numbered — models follow numbered lists more reliably than prose.
- "Already known facts" block prevents re-extracting existing memories.
- Temperature 0.1 selected for structured JSON reproducibility.
- Asking for JSON array of strings (not objects) minimises parsing failure surface.

### `parseExtractionResult(rawText, maxChars)` — three-tier fallback

1. Strip markdown fences → `JSON.parse()` → validate `string[]`
2. Regex-extract first `[...]` block → `JSON.parse()`
3. Regex-match all `"..."` quoted strings (min 5 chars)
4. Return `[]` — **never throws**

This handles: well-behaved JSON, markdown-fenced JSON, JSON embedded in prose, quoted strings only.

### `buildCompactionPrompt(entries, maxEntries, maxChars)`

Produces the compaction prompt. Rules instruct the model to merge similar entries while preserving distinct facts, and output at most `maxEntries` strings.

### `buildMemoryInjectionText(entries)` → string

Formats entries as a bulleted list with a framing header. Returns `''` when entries is empty.

### `fetchOllamaModels(baseUrl)` → `Promise<string[]>`

Calls `/api/tags`, maps `data.models[].name`. 5-second timeout via `AbortSignal.timeout`. Returns `[]` on any failure.

---

## 5. Memory Context (`src/context/MemoryContext.tsx`)

### Reducer actions

| Action | What it does |
|--------|-------------|
| `LOAD_MEMORY` | Restore from localStorage; resets transient flags |
| `UPDATE_SETTINGS` | Shallow-merge settings partial |
| `ADD_ENTRIES` | Append new entries; FIFO-trim if over `maxEntries` |
| `DELETE_ENTRY` | Remove by ID |
| `REPLACE_ENTRIES` | Overwrite all entries (post-compaction); sets `lastCompactionAt` |
| `SET_EXTRACTING` | Toggle extraction spinner |
| `SET_COMPACTING` | Toggle compaction spinner |
| `CLEAR_ALL_ENTRIES` | Wipe all entries |

### `ADD_ENTRIES` capacity handling

```ts
const combined = [...state.entries, ...action.payload];
const trimmed = combined.length > state.settings.maxEntries
  ? combined.slice(combined.length - state.settings.maxEntries)  // FIFO drop (oldest first)
  : combined;
```

This is the fallback when `autoCompact` is off. When `autoCompact` is on, `triggerExtraction` calls `runCompaction()` before dispatching `ADD_ENTRIES`, so the capacity check is rarely hit.

### Persistence

- Saved to `localStorage` key `samvada-studio-memory` on every state change (initial mount skipped via `useRef(true)` flag — mirrors `ChatContext` pattern).
- `isExtracting` and `isCompacting` are excluded from the saved object.
- Dates are serialised as `{ __type: 'Date', value: iso }` and revived on load.

### `stateRef` pattern

```ts
const stateRef = useRef(state);
useEffect(() => { stateRef.current = state; }, [state]);
```

Async functions (`triggerExtraction`, `runCompaction`) read from `stateRef.current` to avoid stale closure bugs. This is necessary because these functions are defined once (not recreated on each render) but need the latest state at call time.

### Race condition mutex

```ts
const extractionInFlightRef = useRef(false);
```

If an extraction is already running, subsequent `triggerExtraction` calls return immediately. This is safe because each extraction call passes the full current `stateRef.current.entries` for deduplication, so the next PnR's extraction will catch anything the skipped call would have found.

### Public API (`useMemory()`)

| Function | Called by | Contract |
|----------|-----------|---------|
| `triggerExtraction(userMsg, assistantMsg, pnrId)` | `ChatArea` after response | Synchronous entry point, async internally, never throws |
| `compactMemories()` | `MemoryPanel` Compact button | Async, awaited by caller |
| `getInjectionText()` | `ChatArea` before LLM call | Pure read, returns `''` when disabled or empty |
| `fetchAvailableModels(baseUrl)` | `MemoryPanel` endpoint input | Delegates to `memoryService.fetchOllamaModels` |

---

## 6. ChatArea Integration (`src/components/chat/ChatArea.tsx`)

### Point A: Memory injection (before LLM call)

Location: in `handleSendPrompt`, after chat history is built, before `getLLMResponse()`.

```ts
let effectiveChatSettings = activeChat.settings;
if (memoryState.settings.isEnabled) {
  const injectionText = getInjectionText();
  if (injectionText) {
    effectiveChatSettings = {
      ...activeChat.settings,
      customInstructions: activeChat.settings.customInstructions
        ? `${activeChat.settings.customInstructions}\n\n${injectionText}`
        : injectionText,
    };
  }
}
```

This creates a **shallow local copy** of `ChatSettings` — the original `activeChat.settings` in the store is never mutated. The memory text lands inside `customInstructions`, which `buildSystemMessageParts` converts to a `SystemMessagePart` that is sent to the model.

### Point B: Memory extraction (after successful response)

Location: immediately after `dispatch({ type: 'UPDATE_PROMPT_RESPONSE', ... })`.

```ts
triggerExtraction(content, message.content, pnr.id);
// No await — intentionally fire-and-forget
```

Note: `content` is the **raw user input**, not `fullPrompt` (which may have context panels prepended with `[Context: ...]` headers). Extracting from raw user words gives cleaner signal about the user's preferences.

---

## 7. UI Components

### `MemoryPanel.tsx`

Rendered in `AdminPanel` Memory tab. Sections:

1. **Header + global enable toggle** — always visible; toggling `isEnabled` hides/shows everything below.
2. **Settings section** (when enabled):
   - Ollama endpoint input + refresh button (calls `fetchAvailableModels` on blur or button click)
   - Model dropdown (populated from Ollama `/api/tags`)
   - Max entries slider (10–500, step 10)
   - Chars per entry slider (50–500, step 10)
   - Auto-compact toggle
3. **`MemoryIndicator`** — visual usage bar
4. **Action buttons** — Compact & Shrink (disabled without model or entries), Clear All (danger)
5. **Entries list** — sorted newest-first, scrollable, max-height 24rem

### `MemoryIndicator.tsx`

| Usage % | Bar color | Extra |
|---------|-----------|-------|
| < 60% | `bg-green-500` | — |
| 60–90% | `bg-yellow-500` | — |
| > 90% | `bg-red-500` | `animate-pulse` + warning text |

### `MemoryEntryItem.tsx`

- Truncated content (CSS `truncate`) with full content in `title` tooltip for hover.
- Source badge colour: extraction=blue, compaction=purple, manual=gray.
- Relative timestamps ("3h ago", "5d ago").
- Delete button visible on hover only (`opacity-0 group-hover:opacity-100`).

---

## 8. AdminPanel Integration

Three changes to `src/components/admin/AdminPanel.tsx`:

1. Import `MemoryPanel` from `'../memory/MemoryPanel'`
2. Extend the `activeTab` union type with `| 'memory'`
3. Add tab button (after Ollama) and tab content section

---

## 9. Extraction Prompt Engineering

**Full extraction prompt:**

```
You are a memory extraction assistant. Analyze this conversation exchange and extract
new, atomic facts about the USER only — their preferences, habits, communication style,
stated goals, or subtle wishes.

Rules:
1. Each fact must be a single declarative sentence.
2. Each fact must be at most {maxCharsPerEntry} characters.
3. Extract ONLY facts not already known (see list below).
4. Do NOT extract facts about the AI assistant.
5. Do NOT repeat, rephrase, or merge existing known facts.
6. If there are no new facts worth remembering, return an empty array.
7. Return ONLY a JSON array of strings. No markdown. No explanation. No wrapper object.

Already known facts (do NOT repeat):
- {entry1}
- {entry2}

User message:
"""
{userMessage}
"""

Assistant response (for context only):
"""
{assistantMessage}
"""

JSON array of new memory strings:
```

**Why temperature 0.1:** Memory extraction needs structured, deterministic JSON output. Low temperature reduces creative variation and hallucination risk.

**Why `callLLMProvider` not `getLLMResponse`:** `getLLMResponse` requires a provider from the app's state (configured by the user for chat). The memory extractor uses a separate ephemeral provider (always Ollama, always the memory-specific model) that is never stored in app state.

**Deduplication strategy:** Normalised lowercase equality. This catches exact duplicates reliably without requiring embeddings. Semantic deduplication (embeddings-based cosine similarity) is a future improvement.

---

## 10. Compaction

### Trigger conditions

| Trigger | Location | Condition |
|---------|----------|-----------|
| Manual | `MemoryPanel` Compact button → `compactMemories()` | User clicks with confirmation |
| Automatic | `triggerExtraction()` before `ADD_ENTRIES` | `entries.length >= maxEntries && autoCompact === true` |

### When `autoCompact` is false

`ADD_ENTRIES` reducer applies FIFO drop instead:
```ts
combined.slice(combined.length - maxEntries)
```
Oldest entries are removed to make room. No LLM call required.

### Compaction output

`REPLACE_ENTRIES` completely overwrites the entries array with the compacted result. Each compacted entry gets `source: 'compaction'` and a fresh `id` and `createdAt`.

**Important:** Compaction is lossy by design — it merges similar entries. Users are warned in the confirmation dialog.

---

## 11. Edge Cases & Failure Modes

| Situation | Where handled | Mechanism |
|-----------|--------------|-----------|
| Ollama not running | `memoryService.extractMemories` | `callLLMProvider` throws → caught in `triggerExtraction` outer try/catch → `console.warn` only |
| Malformed JSON | `parseExtractionResult` | Three-tier fallback → returns `[]` |
| Any extraction error | `triggerExtraction` outer try/catch | Swallowed silently, `SET_EXTRACTING false` dispatched |
| Memory full + autoCompact off | `ADD_ENTRIES` reducer | FIFO drop: `combined.slice(combined.length - maxEntries)` |
| Duplicate memories | `extractMemories` dedup step | Normalised lowercase equality filter |
| Trivial exchange (<20 chars each) | `extractMemories` guard | Early return `[]` |
| Rapid PnR submissions | `extractionInFlightRef` boolean mutex | Drop new call if extraction is in flight |
| No model configured | `triggerExtraction` early return | `if (!settings.extractionModelName) return` |
| Memory disabled | `getInjectionText` | Returns `''`; `effectiveChatSettings` stays unchanged |
| Compaction on small set (<10 entries) | `MemoryPanel` Compact button | Confirmation dialog warns user |
| localStorage save failure | `saveMemoryState` try/catch | `console.error`, app continues |
| Compaction returns empty | `runCompaction` | Falls back to `SET_COMPACTING false`; existing entries unchanged |

---

## 12. Testing Guidance

### Prerequisites
- Ollama running locally: `ollama serve`
- A capable instruction-following model: `ollama pull llama3.2` or `ollama pull mistral`

### Test: basic extraction
1. Enable Memory in Admin → Memory tab; set endpoint `http://localhost:11434`, select model
2. Send: "I always prefer concise answers with bullet points, not long prose."
3. Wait for extraction spinner to appear and disappear
4. Open Memory tab → verify new entry appears

### Test: injection
1. With memories present, open a new chat with the same provider
2. Ask a vague question — the model should apply the remembered preferences unprompted

### Test: deduplication
1. Send the same preference in two consecutive messages
2. Verify only one entry appears in Memory tab

### Test: auto-compact
1. Set Max memories to 10, send 12 conversations with distinct preferences
2. Verify entries stay at ≤ 10, and `source: 'compaction'` appears

### Test: FIFO fallback
1. Disable Auto-compact, set Max memories to 5
2. Send 7 conversations
3. Verify only 5 entries remain, oldest 2 removed

### Test: Ollama offline
1. Stop Ollama (`ollama stop` or kill process)
2. Send a chat message
3. Verify: chat response arrives normally, no errors shown to user, console shows `[Memory] Extraction failed (silent):`

### Test: manual compact
1. With 20+ entries, click "Compact & Shrink"
2. Accept confirmation dialog
3. Verify entry count reduces, entries now show `source: 'compaction'`

### Test: disable toggle
1. Disable Memory toggle
2. Send a prompt — verify extraction does not trigger (no spinner, no new entries)

---

## 13. Future Work

| Enhancement | Notes |
|-------------|-------|
| Semantic deduplication | Use embeddings (Ollama `nomic-embed-text`) for cosine similarity instead of string equality |
| Per-chat memory isolation | Add `chatId` scope to `MemoryEntry`; inject only relevant chat's memories |
| Manual entry creation | "Add memory" free-text input in MemoryPanel |
| Memory categories | Tag entries by type (preference, technical, style) and filter in the list |
| Import / export | JSON export/import for memory backup and migration |
| Relevance-based injection | Rank memories by relevance to current prompt before injecting (requires embeddings) |
| Cloud provider support | Allow non-Ollama extraction with explicit user consent and privacy warning |
| Memory health score | Track how often each memory influences a response; prune low-impact entries |
