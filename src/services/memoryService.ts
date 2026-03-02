import { callLLMProvider } from '../utils/llmService';
import { generateId } from '../utils/helpers';
import type { LLMProviderConfig } from '../types';
import type { MemoryEntry, MemorySettings, OllamaModel } from '../types/memory';

const MIN_CONTENT_LENGTH = 20;

/*──────────────────────────────────────────────────────────────────────────────
 * Fuzzy deduplication — Jaccard token similarity
 *
 * Why we need this:
 *   The exact-match filter (Set of lowercased strings) only catches identical
 *   entries.  "User likes Python" and "The user prefers Python programming"
 *   sail right through because they're not character-for-character the same.
 *
 * How Jaccard similarity works:
 *   1. Tokenize both strings into sets of words.
 *        "user likes python"         → { user, likes, python }
 *        "the user prefers python programming" → { the, user, prefers, python, programming }
 *
 *   2. Compute:  |intersection| / |union|
 *        intersection = { user, python }            → size 2
 *        union        = { user, likes, python, the, prefers, programming } → size 6
 *        similarity   = 2 / 6 ≈ 0.33
 *
 *   Hmm, 0.33 is low — those two sentences share meaning but differ in words.
 *   A closer paraphrase like "User prefers Python" vs "User likes Python":
 *        { user, prefers, python } ∩ { user, likes, python } = { user, python }
 *        union = { user, prefers, python, likes } → size 4
 *        similarity = 2 / 4 = 0.50  … still below threshold, so both survive. Good!
 *
 *   But "User likes Python" vs "The user likes Python a lot":
 *        { user, likes, python } ∩ { the, user, likes, python, a, lot } = { user, likes, python }
 *        union size = 6
 *        similarity = 3 / 6 = 0.50  … also survives. Fine — they are slightly different.
 *
 *   And "User likes Python" vs "User really likes Python":
 *        { user, likes, python } ∩ { user, really, likes, python } = { user, likes, python }
 *        union = { user, likes, python, really } → size 4
 *        similarity = 3 / 4 = 0.75  … above 0.70 → duplicate caught!
 *
 * Why 0.70 threshold:
 *   At 0.65, "User prefers Python" vs "User prefers JavaScript" = 2/3 ≈ 0.67
 *   → false positive! Those are genuinely different facts.
 *   At 0.70, that pair passes through safely (0.67 < 0.70).
 *   Meanwhile close paraphrases like the example above (0.75) still get caught.
 *──────────────────────────────────────────────────────────────────────────────*/

/** Similarity threshold above which a new memory candidate is considered a duplicate. */
export const FUZZY_DEDUP_THRESHOLD = 0.70;

/**
 * Break a sentence into a set of normalised word tokens.
 * Strips punctuation so "Python." and "Python" become the same token.
 */
function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().trim().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean)
  );
}

/**
 * Jaccard similarity = |A ∩ B| / |A ∪ B|
 *
 * Range: 0 (nothing in common) to 1 (identical token sets).
 * Returns 0 when both strings are empty (avoids 0/0).
 */
export function jaccardSimilarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Check if `candidate` is a fuzzy duplicate of any existing memory entry.
 * Short-circuits on the first match above threshold.
 *
 * Performance: O(candidates × entries × avg_tokens). For 500 entries × 5
 * candidates on strings under 150 chars, this completes in < 1ms.
 */
export function isFuzzyDuplicate(
  candidate: string,
  existingEntries: MemoryEntry[],
  threshold: number = FUZZY_DEDUP_THRESHOLD
): boolean {
  for (const entry of existingEntries) {
    if (jaccardSimilarity(candidate, entry.content) >= threshold) return true;
  }
  return false;
}

function buildExtractionProvider(settings: MemorySettings): LLMProviderConfig {
  return {
    id: '__memory-extractor__',
    name: 'Memory Extractor (Ollama)',
    type: 'ollama',
    apiEndpoint: `${settings.extractionModelEndpoint.replace(/\/$/, '')}/api/generate`,
    model: settings.extractionModelName,
    isEnabled: true,
    isDefault: false,
    settings: {
      temperature: 0.1,
      maxTokens: 512,
    },
  };
}

export function buildExtractionPrompt(
  userMessage: string,
  assistantMessage: string,
  existingEntries: MemoryEntry[],
  maxCharsPerEntry: number
): string {
  const existingBlock =
    existingEntries.length > 0
      ? `\nAlready known facts (do NOT repeat these):\n${existingEntries.map(e => `- ${e.content}`).join('\n')}\n`
      : '';

  return `You are a memory extraction assistant. Analyze this conversation exchange and extract new, atomic facts about the USER only — their preferences, habits, communication style, stated goals, or subtle wishes.

Rules:
1. Each fact must be a single declarative sentence.
2. Each fact must be at most ${maxCharsPerEntry} characters.
3. Extract ONLY facts not already known (see list below).
4. Do NOT extract facts about the AI assistant.
5. Do NOT repeat, rephrase, or merge existing known facts.
6. If there are no new facts worth remembering, return an empty array.
7. Return ONLY a JSON array of strings. No markdown. No explanation. No wrapper object.
${existingBlock}
User message:
"""
${userMessage}
"""

Assistant response (for context only):
"""
${assistantMessage}
"""

JSON array of new memory strings:`;
}

export function buildCompactionPrompt(
  entries: MemoryEntry[],
  maxEntries: number,
  maxCharsPerEntry: number
): string {
  const entriesList = entries.map((e, i) => `${i + 1}. ${e.content}`).join('\n');

  return `You are a memory compaction assistant. Deduplicate, merge, and clean this list of user facts into at most ${maxEntries} entries.

Rules:
1. Each output entry must be a single declarative sentence, at most ${maxCharsPerEntry} characters.
2. **Eliminate duplicates**: If two or more entries express the same fact in different words, keep only ONE — the most specific and informative version.
3. **Resolve contradictions**: If entries contradict each other (e.g., "User prefers dark mode" vs "User switched to light mode"), keep only the entry that appears LATER in the list (it is more recent).
4. **Merge subsets**: If one entry is a more general version of another (e.g., "User likes programming" vs "User likes Python programming"), keep only the more specific one.
5. **Combine related details**: If multiple entries describe different facets of the same topic, merge them into one concise entry when possible without losing specificity.
6. Preserve all genuinely distinct facts — do not lose unique information.
7. Prioritise specificity over vague generalisations.
8. Return ONLY a JSON array of strings. No markdown. No explanation. No wrapper object.

Current entries (ordered from oldest to newest):
${entriesList}

Compacted JSON array (at most ${maxEntries} entries):`;
}

export function parseExtractionResult(rawText: string, maxCharsPerEntry: number): string[] {
  const stripped = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  // Attempt 1: direct JSON.parse
  try {
    const parsed = JSON.parse(stripped);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map(s => s.trim().slice(0, maxCharsPerEntry));
    }
  } catch {
    // fall through
  }

  // Attempt 2: extract first [...] block
  const arrayMatch = stripped.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string')
          .map(s => s.trim().slice(0, maxCharsPerEntry))
          .filter(s => s.length > 0);
      }
    } catch {
      // fall through
    }
  }

  // Attempt 3: extract quoted strings as last resort
  const quoted = stripped.match(/"([^"]{5,})"/g);
  if (quoted) {
    return quoted
      .map(s => s.slice(1, -1).trim().slice(0, maxCharsPerEntry))
      .filter(s => s.length > 0);
  }

  return [];
}

export async function extractMemories(
  userMessage: string,
  assistantMessage: string,
  existingEntries: MemoryEntry[],
  settings: MemorySettings,
  extractedFromPnrId: string,
  providerOverride?: LLMProviderConfig
): Promise<MemoryEntry[]> {
  if (
    userMessage.trim().length < MIN_CONTENT_LENGTH &&
    assistantMessage.trim().length < MIN_CONTENT_LENGTH
  ) {
    return [];
  }

  const provider = providerOverride ?? buildExtractionProvider(settings);
  const prompt = buildExtractionPrompt(
    userMessage,
    assistantMessage,
    existingEntries,
    settings.maxCharsPerEntry
  );

  const result = await callLLMProvider(provider, prompt);
  const rawStrings = parseExtractionResult(result.message.content, settings.maxCharsPerEntry);

  // Layer 1 — fast exact-match filter (O(1) Set lookup per candidate)
  const existingNormalised = new Set(
    existingEntries.map(e => e.content.toLowerCase().trim())
  );
  const afterExact = rawStrings.filter(
    s => !existingNormalised.has(s.toLowerCase().trim())
  );

  // Layer 2 — fuzzy Jaccard filter catches near-duplicates that differ in wording
  // (see the big comment block at the top of this file for how Jaccard works)
  const afterFuzzy = afterExact.filter(
    s => !isFuzzyDuplicate(s, existingEntries)
  );

  return afterFuzzy.map(content => ({
    id: generateId(),
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
    source: 'extraction' as const,
    extractedFromPnrId,
  }));
}

export function buildMemoryInjectionText(entries: MemoryEntry[]): string {
  if (entries.length === 0) return '';
  const facts = entries.map(e => `- ${e.content}`).join('\n');
  return `The following are known facts about the user. Use them to personalise your responses:\n${facts}`;
}

export function formatModelSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  const gb = bytes / 1_073_741_824;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1_048_576;
  return `${Math.round(mb)} MB`;
}

export async function fetchOllamaModels(baseUrl: string): Promise<OllamaModel[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/api/tags`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    const models: OllamaModel[] = (data.models ?? []).map(
      (m: { name: string; size?: number }) => ({ name: m.name, size: m.size ?? 0 })
    );
    // Sort largest first — more parameters = better for memory extraction
    return models.sort((a, b) => b.size - a.size);
  } catch {
    return [];
  }
}
