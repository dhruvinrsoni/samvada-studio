import { v4 as uuidv4 } from 'uuid';
import type { Chat, ChatSettings, PromptResponse, Message, Example, ContextPanel, LLMProviderConfig } from '../types';

export const generateId = (): string => uuidv4();

export const createDefaultSettings = (): ChatSettings => ({
  role: 'You are a helpful AI assistant.',
  customInstructions: '',
  alwaysInclude: [],
  alwaysExclude: [],
  examples: [],
  temperature: 0.7,
  maxTokens: 2048,
});

export const createNewChat = (title?: string, provider?: LLMProviderConfig): Chat => ({
  id: generateId(),
  title: title || `Chat ${new Date().toLocaleDateString()}`,
  promptResponses: [],
  settings: createDefaultSettings(),
  isArchived: false,
  isPinned: false,
  providerId: provider?.id,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createMessage = (
  role: 'user' | 'assistant' | 'system',
  content: string
): Message => ({
  id: generateId(),
  role,
  content,
  timestamp: new Date(),
  isStarred: false,
});

export const createPromptResponse = (prompt: Message): PromptResponse => ({
  id: generateId(),
  prompt,
  responses: [],
  drafts: [],
  activeResponseIndex: 0,
  isCollapsed: false,
  isPinned: false,
  isStarred: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createExample = (input: string = '', output: string = ''): Example => ({
  id: generateId(),
  input,
  output,
});

export const createContextPanel = (title: string = 'Context', content: string = ''): ContextPanel => ({
  id: generateId(),
  title,
  content,
  isActive: true,
});

export const truncateText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const getFirstWords = (text: string, wordCount: number = 6): string => {
  const words = text.trim().split(/\s+/);
  if (words.length <= wordCount) return text;
  return words.slice(0, wordCount).join(' ') + '...';
};

export const formatTimestamp = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.floor(ms / 60000)}m ${((ms % 60000) / 1000).toFixed(0)}s`;
};

export const searchInChat = (chat: Chat, query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  
  if (chat.title.toLowerCase().includes(lowerQuery)) return true;
  
  for (const pnr of chat.promptResponses) {
    if (pnr.prompt.content.toLowerCase().includes(lowerQuery)) return true;
    for (const response of pnr.responses) {
      if (response.content.toLowerCase().includes(lowerQuery)) return true;
    }
  }
  
  return false;
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
