import { useState, useCallback, useMemo, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import type { PromptResponse } from '../types';

interface PromptNavigationItem {
  id: string;
  content: string;
  timestamp: Date;
}

export const usePromptNavigation = () => {
  const { activeChat } = useChat();
  const [navigationIndex, setNavigationIndex] = useState<number>(-1);
  const [originalContent, setOriginalContent] = useState<string>('');

  // Reset navigation when active chat changes
  useEffect(() => {
    setNavigationIndex(-1);
    setOriginalContent('');
  }, [activeChat?.id]);

  // Build navigation history from current chat's prompts ONLY (not drafts)
  const navigationHistory = useMemo((): PromptNavigationItem[] => {
    if (!activeChat) return [];

    // Only include sent prompts, in chronological order (oldest first)
    return activeChat.promptResponses.map((pnr: PromptResponse) => ({
      id: pnr.id,
      content: pnr.prompt.content,
      timestamp: pnr.prompt.timestamp,
    }));
  }, [activeChat]);

  const initializeNavigation = useCallback((currentContent: string) => {
    setOriginalContent(currentContent);
    setNavigationIndex(-1); // -1 means we're at the current/unsent content
  }, []);

  const navigateToPrevious = useCallback((): string | null => {
    // navigationIndex: -1 = current input, 0 = oldest, length-1 = newest
    // Going "previous" means going backward in time (older prompts)
    const currentIndex = navigationIndex === -1 ? navigationHistory.length : navigationIndex;
    
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setNavigationIndex(newIndex);
      return navigationHistory[newIndex]?.content ?? null;
    }
    return null; // No more previous items
  }, [navigationIndex, navigationHistory]);

  const navigateToNext = useCallback((): string | null => {
    // Going "next" means going forward in time (newer prompts)
    if (navigationIndex === -1) {
      return null; // Already at current input
    }
    
    if (navigationIndex < navigationHistory.length - 1) {
      const newIndex = navigationIndex + 1;
      setNavigationIndex(newIndex);
      return navigationHistory[newIndex]?.content ?? null;
    } else {
      // Going back to original/current content
      setNavigationIndex(-1);
      return originalContent;
    }
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