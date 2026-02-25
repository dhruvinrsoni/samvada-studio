import { useState, useCallback, useMemo } from 'react';
import { useChat } from '../context/ChatContext';
import type { PromptResponse, Draft } from '../types';

interface PromptNavigationItem {
  id: string;
  content: string;
  type: 'prompt' | 'draft';
  timestamp: Date;
  pnrId?: string;
  draftIndex?: number;
}

export const usePromptNavigation = () => {
  const { activeChat } = useChat();
  const [navigationIndex, setNavigationIndex] = useState<number>(-1);
  const [originalContent, setOriginalContent] = useState<string>('');

  // Build navigation history from current chat's prompts and drafts
  const navigationHistory = useMemo((): PromptNavigationItem[] => {
    if (!activeChat) return [];

    const history: PromptNavigationItem[] = [];

    // Add current unsent content as a "draft" if it exists
    // This will be handled by the component using this hook

    // Add all prompts and drafts from the chat (in reverse chronological order for navigation)
    activeChat.promptResponses.forEach((pnr: PromptResponse) => {
      // Add drafts for this prompt (most recent first)
      pnr.drafts.slice().reverse().forEach((draft: Draft, draftIndex: number) => {
        history.push({
          id: `draft-${pnr.id}-${draft.id}`,
          content: draft.content,
          type: 'draft',
          timestamp: draft.timestamp,
          pnrId: pnr.id,
          draftIndex: pnr.drafts.length - 1 - draftIndex, // Reverse index for original order
        });
      });

      // Add the sent prompt
      history.push({
        id: `prompt-${pnr.id}`,
        content: pnr.prompt.content,
        type: 'prompt',
        timestamp: pnr.prompt.timestamp,
        pnrId: pnr.id,
      });
    });

    // Reverse to get chronological order (oldest first)
    return history.reverse();
  }, [activeChat]);

  const initializeNavigation = useCallback((currentContent: string) => {
    setOriginalContent(currentContent);
    setNavigationIndex(-1); // -1 means we're at the current/unsent content
  }, []);

  const navigateToPrevious = useCallback((): string | null => {
    if (navigationIndex < navigationHistory.length - 1) {
      const newIndex = navigationIndex + 1;
      setNavigationIndex(newIndex);
      return navigationHistory[newIndex].content;
    }
    return null; // No more previous items
  }, [navigationIndex, navigationHistory]);

  const navigateToNext = useCallback((): string | null => {
    if (navigationIndex > 0) {
      const newIndex = navigationIndex - 1;
      setNavigationIndex(newIndex);
      return navigationHistory[newIndex].content;
    } else if (navigationIndex === 0) {
      // Going back to original content
      setNavigationIndex(-1);
      return originalContent;
    }
    return null; // Already at the beginning
  }, [navigationIndex, navigationHistory, originalContent]);

  const resetNavigation = useCallback(() => {
    setNavigationIndex(-1);
  }, []);

  const isNavigating = navigationIndex >= 0;

  return {
    navigationHistory,
    currentNavigationIndex: navigationIndex,
    isNavigating,
    initializeNavigation,
    navigateToPrevious,
    navigateToNext,
    resetNavigation,
  };
};