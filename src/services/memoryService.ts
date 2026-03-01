import { callLLMProvider } from '../utils/llmService';
import { generateId } from '../utils/helpers';
import type { LLMProviderConfig } from '../types';
import type { MemoryEntry, MemorySettings } from '../types/memory';

const MIN_CONTENT_LENGTH = 20;

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

  return `You are a memory compaction assistant. Merge, deduplicate, and summarise this fact list into at most ${maxEntries} entries.

Rules:
1. Each output entry: single declarative sentence, at most ${maxCharsPerEntry} characters.
2. Merge similar or related facts into one concise entry.
3. Preserve all genuinely distinct facts — do not lose information.
4. Prioritise specificity over vague generalisations.
5. Return ONLY a JSON array of strings. No markdown. No explanation.

Current entries:
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
  extractedFromPnrId: string
): Promise<MemoryEntry[]> {
  if (
    userMessage.trim().length < MIN_CONTENT_LENGTH &&
    assistantMessage.trim().length < MIN_CONTENT_LENGTH
  ) {
    return [];
  }

  const provider = buildExtractionProvider(settings);
  const prompt = buildExtractionPrompt(
    userMessage,
    assistantMessage,
    existingEntries,
    settings.maxCharsPerEntry
  );

  const result = await callLLMProvider(provider, prompt);
  const rawStrings = parseExtractionResult(result.message.content, settings.maxCharsPerEntry);

  const existingNormalised = new Set(
    existingEntries.map(e => e.content.toLowerCase().trim())
  );

  return rawStrings
    .filter(s => !existingNormalised.has(s.toLowerCase().trim()))
    .map(content => ({
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

export async function fetchOllamaModels(baseUrl: string): Promise<string[]> {
  try {
    const url = `${baseUrl.replace(/\/$/, '')}/api/tags`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models ?? []).map((m: { name: string }) => m.name);
  } catch {
    return [];
  }
}
