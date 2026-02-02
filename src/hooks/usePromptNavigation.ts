import { useState, useCallback, useMemo, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import type { PromptResponse } from '../types';

interface PromptNavigationItem {
  id: string;
  content: string;
  timestamp: Date;
  isCurrent?: boolean;
}

export const usePromptNavigation = (currentContent: string) => {
  const { activeChat } = useChat();
  const [navigationIndex, setNavigationIndex] = useState<number>(-1);
  const [savedCurrentContent, setSavedCurrentContent] = useState<string>('');

  // Reset navigation when active chat changes
  useEffect(() => {
    setNavigationIndex(-1);
    setSavedCurrentContent('');
  }, [activeChat?.id]);

  // Build navigation history: [oldest sent...newest sent, current typed]
  // Current prompt is ALWAYS the last entry
  const navigationHistory = useMemo((): PromptNavigationItem[] => {
    if (!activeChat) return [];

    // Include sent prompts in chronological order (oldest first)
    const sentPrompts = activeChat.promptResponses.map((pnr: PromptResponse) => ({
      id: pnr.id,
      content: pnr.prompt.content,
      timestamp: pnr.prompt.timestamp,
      isCurrent: false,
    }));

    // Always append current prompt as the last entry (even if empty)
    const currentPrompt: PromptNavigationItem = {
      id: 'current',
      content: savedCurrentContent || currentContent,
      timestamp: new Date(),
      isCurrent: true,
    };

    return [...sentPrompts, currentPrompt];
  }, [activeChat, savedCurrentContent, currentContent]);

  const startNavigation = useCallback((content: string) => {
    // Save the current content when starting navigation
    setSavedCurrentContent(content);
  }, []);

  const navigateToPrevious = useCallback((): { content: string; isCurrent: boolean } | null => {
    // Navigation: -1 = not started, 0 = oldest, length-1 = current
    // Going "previous" means going backward in time (older prompts)
    
    if (navigationIndex === -1) {
      // Starting navigation - go to newest sent prompt (or current if no sent prompts)
      const newIndex = navigationHistory.length - 2; // -2 because last is current
      if (newIndex >= 0) {
        setNavigationIndex(newIndex);
        return {
          content: navigationHistory[newIndex]?.content ?? '',
          isCurrent: false,
        };
      }
      return null; // No history to navigate
    }
    
    if (navigationIndex > 0) {
      const newIndex = navigationIndex - 1;
      setNavigationIndex(newIndex);
      return {
        content: navigationHistory[newIndex]?.content ?? '',
        isCurrent: navigationHistory[newIndex]?.isCurrent ?? false,
      };
    }
    
    return null; // Already at oldest
  }, [navigationIndex, navigationHistory]);

  const navigateToNext = useCallback((): { content: string; isCurrent: boolean } | null => {
    // Going "next" means going forward in time (newer prompts)
    if (navigationIndex === -1) {
      return null; // Not navigating
    }
    
    if (navigationIndex < navigationHistory.length - 1) {
      const newIndex = navigationIndex + 1;
      setNavigationIndex(newIndex);
      return {
        content: navigationHistory[newIndex]?.content ?? '',
        isCurrent: navigationHistory[newIndex]?.isCurrent ?? false,
      };
    }
    
    return null; // Already at newest (current)
  }, [navigationIndex, navigationHistory]);

  const restoreOriginal = useCallback((): string => {
    // ESC: Always restore the original saved content
    setNavigationIndex(-1);
    return savedCurrentContent;
  }, [savedCurrentContent]);

  const resetNavigation = useCallback(() => {
    setNavigationIndex(-1);
    setSavedCurrentContent('');
  }, []);

  // isNavigating = true when NOT on current prompt (i.e., viewing a sent prompt)
  const currentItem = navigationIndex >= 0 ? navigationHistory[navigationIndex] : null;
  const isNavigating = navigationIndex >= 0 && !(currentItem?.isCurrent ?? false);

  return {
    navigationHistory,
    currentNavigationIndex: navigationIndex,
    isNavigating,
    startNavigation,
    navigateToPrevious,
    navigateToNext,
    restoreOriginal,
    resetNavigation,
  };
};