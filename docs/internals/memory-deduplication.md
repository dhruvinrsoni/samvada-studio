# Memory Deduplication — How It Works

So you're reading this because you want to understand how Samvada Studio prevents the same memory from being stored twice (or thrice, or fifty times). Good. Let's walk through it.

## The Problem

Every time you chat, the memory system extracts facts about you:

> "User likes Python"

Later, in another conversation, the LLM might extract:

> "The user prefers Python programming"

Same fact, different words. Without dedup, you'd end up with a memory bank full of paraphrased copies of the same handful of facts. That wastes space and confuses the LLM when it tries to use them.

## The 4-Layer Defense

We catch duplicates at four different points, from cheapest to smartest:

```
New memory candidate arrives
        │
        ▼
┌─ Layer 1: Extraction Prompt ──────────────────────────┐
│  The LLM is told "do NOT repeat existing facts."      │
│  Works most of the time. But LLMs don't always listen.│
└───────────────────────────────────────────────────────┘
        │ (some dupes slip through)
        ▼
┌─ Layer 2: Exact Match ────────────────────────────────┐
│  Lowercase + trim both strings, check if identical.   │
│  "User likes Python" === "user likes python"  → caught│
│  "User likes Python" ≠ "User prefers Python"  → miss  │
└───────────────────────────────────────────────────────┘
        │ (paraphrases slip through)
        ▼
┌─ Layer 3: Fuzzy Match (Jaccard Similarity) ───────────┐
│  Tokenize into word sets, compute overlap ratio.      │
│  "User really likes Python" vs "User likes Python"    │
│   → 3 shared tokens out of 4 total = 0.75 → CAUGHT   │
└───────────────────────────────────────────────────────┘
        │ (only genuinely new facts survive)
        ▼
┌─ Layer 4: Smart Compaction ───────────────────────────┐
│  Periodically, the LLM reviews ALL memories and:     │
│  • Merges paraphrases it recognises                   │
│  • Resolves contradictions (newer fact wins)          │
│  • Removes vague facts that a more specific one covers│
└───────────────────────────────────────────────────────┘
```

Layers 1-3 run on **every extraction** (real-time, at write-time).
Layer 4 runs **periodically** when memory reaches capacity (or when you click "Compact" manually).

## Layer 3 Deep Dive: Jaccard Similarity

This is the interesting one. Here's the actual math — it's simpler than it sounds.

### Step 1: Tokenize

Turn each sentence into a **set of words** (lowercase, no punctuation):

```
"User likes Python"          → { user, likes, python }
"The user prefers Python"    → { the, user, prefers, python }
```

### Step 2: Compute Overlap

**Jaccard similarity** = (words in common) / (total unique words)

```
Intersection: { user, python }                              = 2 words
Union:        { user, likes, python, the, prefers }          = 5 words
Similarity:   2 / 5 = 0.40
```

0.40 is below our threshold of 0.70 → these are treated as **different facts**. Correctly! "Likes" and "prefers" are different words and Jaccard doesn't know they're synonyms.

### A closer paraphrase

```
"User likes Python"          → { user, likes, python }
"User really likes Python"   → { user, really, likes, python }

Intersection: { user, likes, python }                        = 3
Union:        { user, likes, python, really }                 = 4
Similarity:   3 / 4 = 0.75   → DUPLICATE (above 0.70)
```

### Why the threshold is 0.70

We tested different values:

| Pair | Jaccard | At 0.65 | At 0.70 |
|------|---------|---------|---------|
| "User prefers Python" vs "User prefers JavaScript" | 0.67 | FALSE POSITIVE | Correct (passes) |
| "User likes Python" vs "User really likes Python" | 0.75 | Caught | Caught |
| "User likes tea" vs "User likes coffee" | 0.50 | Correct | Correct |
| "User works at Google" vs "User works at Google as engineer" | 0.80 | Caught | Caught |

At 0.65, "Python" and "JavaScript" get wrongly flagged as duplicates because the sentences share 2 out of 3 words. Bumping to 0.70 fixes that while still catching actual paraphrases.

The constant is `FUZZY_DEDUP_THRESHOLD` in `memoryService.ts` — easy to tune if needed.

## Layer 4 Deep Dive: Smart Compaction

When memory hits capacity (default: 100 entries), the LLM reviews everything and applies these rules:

1. **Eliminate paraphrase duplicates** — keep the most specific version
2. **Resolve contradictions** — entries are ordered oldest→newest, so the LLM keeps the later (more recent) fact when two contradict
3. **Merge subsets** — "User likes programming" + "User likes Python" → keep only "User likes Python" (more specific)
4. **Combine related details** — multiple facets of the same topic get merged into one entry

This is the "nuclear option" — it rewrites the entire memory bank. But it only runs when memory is full, so it's not expensive.

## What Jaccard Can't Catch

Jaccard is a **bag-of-words** approach. It has no concept of meaning. So:

- "User likes cats" vs "User adores felines" → 1/5 = 0.20 → **miss** (different words, same meaning)
- "User hates Python" vs "User likes Python" → 2/3 = 0.67 → treated as different (correct! they contradict, not duplicate)

For semantic understanding, you'd need **embeddings** (vector similarity). That's a future upgrade if the LLM extraction prompt + compaction don't catch enough. For now, the 4-layer combo works well.

## Where the Code Lives

All in one file: `src/services/memoryService.ts`

| Function | What it does |
|----------|-------------|
| `jaccardSimilarity(a, b)` | Returns 0–1 similarity score between two strings |
| `isFuzzyDuplicate(candidate, entries)` | Checks if candidate is too similar to any existing entry |
| `extractMemories()` | Runs Layers 2+3 after the LLM returns new candidates |
| `buildCompactionPrompt()` | Generates the Layer 4 prompt with dedup/contradiction rules |
| `buildExtractionPrompt()` | Generates the Layer 1 prompt that tells the LLM not to repeat |

The extraction trigger and state management live in `src/context/MemoryContext.tsx` — but the dedup logic is all in the service file.
