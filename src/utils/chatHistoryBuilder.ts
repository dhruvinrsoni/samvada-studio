import type { PromptResponse, ChatHistoryMessage } from '../types';

/**
 * Build a provider-agnostic conversation history from an array of PnRs.
 *
 * For each PnR takes the ACTIVE prompt version and the ACTIVE response
 * for that version (what the user currently sees).
 *
 * @param promptResponses - The full promptResponses array from the Chat
 * @param upToIndex - Build history for PnRs at indices [0, upToIndex).
 *                    If omitted, includes all PnRs.
 */
export function buildChatHistory(
  promptResponses: PromptResponse[],
  upToIndex?: number,
): ChatHistoryMessage[] {
  const limit = upToIndex !== undefined ? upToIndex : promptResponses.length;
  const history: ChatHistoryMessage[] = [];

  for (let i = 0; i < limit; i++) {
    const pnr = promptResponses[i];
    if (!pnr) continue;

    // Active prompt version
    const allPrompts = pnr.prompts?.length ? pnr.prompts : [pnr.prompt];
    const activePromptIdx = pnr.activePromptIndex ?? 0;
    const activePrompt = allPrompts[activePromptIdx] ?? allPrompts[0] ?? pnr.prompt;

    // Active response for this prompt version
    const versionResponses = pnr.responses.filter(
      r => (r.promptVersionIndex ?? 0) === activePromptIdx,
    );
    const storedDraftIdx = pnr.activeResponseIndexPerVersion?.[activePromptIdx];
    const activeDraftIdx =
      storedDraftIdx !== undefined
        ? Math.min(storedDraftIdx, Math.max(0, versionResponses.length - 1))
        : Math.max(0, versionResponses.length - 1);
    const activeResponse = versionResponses[activeDraftIdx];

    // Skip PnRs without a response to avoid consecutive user messages
    // (Anthropic requires strictly alternating roles)
    if (!activeResponse) continue;

    history.push({
      role: 'user',
      content: activePrompt.content,
      ...(activePrompt.images?.length ? { images: activePrompt.images } : {}),
    });
    history.push({ role: 'assistant', content: activeResponse.content });
  }

  return history;
}

/**
 * Estimate token count for a history array.
 * Uses the same heuristic as ChatContext (ceil(chars / 4)).
 */
export function estimateHistoryTokens(history: ChatHistoryMessage[]): number {
  return history.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0);
}

/**
 * Truncate history from oldest messages until total tokens fit within
 * the context window budget.
 *
 * Removes user+assistant pairs together to keep alternation intact.
 * Always preserves at least the current prompt (history may become empty).
 */
export function truncateHistory(
  history: ChatHistoryMessage[],
  systemTokens: number,
  currentPromptTokens: number,
  contextWindowTokens: number,
  reserveForResponse: number = 1024,
): ChatHistoryMessage[] {
  const budget = contextWindowTokens - systemTokens - currentPromptTokens - reserveForResponse;
  if (budget <= 0) return [];

  const result = [...history];
  let totalTokens = estimateHistoryTokens(result);

  // Remove from the front (oldest) in pairs
  while (result.length > 0 && totalTokens > budget) {
    const removed = result.shift()!;
    totalTokens -= Math.ceil(removed.content.length / 4);
    // If we removed a user message, also remove the paired assistant message
    if (removed.role === 'user' && result.length > 0 && result[0]?.role === 'assistant') {
      const removedAssistant = result.shift()!;
      totalTokens -= Math.ceil(removedAssistant.content.length / 4);
    }
  }

  return result;
}
