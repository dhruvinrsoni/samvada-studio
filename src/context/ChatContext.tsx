import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import type { AppState, ChatAction, Chat, PromptResponse, SearchResult, LLMProviderConfig, PromptTemplate, ChatFolder, VoiceSettings, ThemeSettings, Message } from '../types';
import { saveState, loadState } from '../utils/storage';
import { createNewChat } from '../utils/helpers';
import { getThemeColors, applyThemeColors, generateColorPalette } from '../utils/theme';

const defaultVoiceSettings: VoiceSettings = {
  isVoiceInputEnabled: true,
  isTTSEnabled: true,
  ttsVoice: '',
  ttsRate: 1,
  ttsPitch: 1,
  autoSpeak: false,
};

const defaultThemeSettings: ThemeSettings = {
  mode: 'light',
  preset: 'royal-blue',
  customColors: null,
  fontSize: 'medium',
  compactMode: false,
  promptNavigationEnabled: true, // Enable prompt navigation by default
};

// Create default providers (local ones that don't require API keys)
const createDefaultProviders = (): LLMProviderConfig[] => {
  const ollamaProvider: LLMProviderConfig = {
    id: 'ollama-default',
    name: 'Ollama (Local)',
    type: 'ollama',
    apiEndpoint: 'http://localhost:11434/api/generate',
    model: 'llama2',
    isEnabled: true,
    isDefault: true,
    settings: { temperature: 0.7, maxTokens: 4096 },
    testStatus: 'untested',
  };

  return [ollamaProvider];
};

const initialState: AppState = {
  chats: [],
  activeChat: null,
  contextPanels: [],
  searchQuery: '',
  selectedChatIds: [],
  isContextPanelMode: false,
  theme: 'light',
  // LLM Providers - Start empty, LOAD_STATE will add defaults if needed
  providers: [],
  defaultProviderId: 'ollama-default',
  // Global Search
  globalSearch: {
    query: '',
    results: [],
    isSearching: false,
    selectedResultIndex: -1,
    isOpen: false,
  },
  // Admin Panel
  isAdminPanelOpen: false,
  // NEW: Templates
  templates: [],
  // NEW: Folders
  folders: [],
  // NEW: Voice Settings
  voiceSettings: defaultVoiceSettings,
  // NEW: Theme Settings
  themeSettings: defaultThemeSettings,
  // NEW: UI State
  isCommandPaletteOpen: false,
  isShortcutsHelpOpen: false,
  isTemplatesOpen: false,
  isExportModalOpen: false,
  isStarredModalOpen: false,
  // NEW: Streaming
  isStreaming: false,
  streamingMessageId: null,
};

function chatReducer(state: AppState, action: ChatAction): AppState {
  switch (action.type) {
    case 'CREATE_CHAT':
      return {
        ...state,
        chats: [action.payload, ...state.chats],
        activeChat: action.payload.id,
      };

    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.id ? { ...action.payload, updatedAt: new Date() } : chat
        ),
      };

    case 'DELETE_CHAT':
      return {
        ...state,
        chats: state.chats.filter(chat => chat.id !== action.payload),
        activeChat: state.activeChat === action.payload ? null : state.activeChat,
        selectedChatIds: state.selectedChatIds.filter(id => id !== action.payload),
      };

    case 'DELETE_CHATS':
      return {
        ...state,
        chats: state.chats.filter(chat => !action.payload.includes(chat.id)),
        activeChat: action.payload.includes(state.activeChat || '') ? null : state.activeChat,
        selectedChatIds: [],
      };

    case 'ARCHIVE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload ? { ...chat, isArchived: true, updatedAt: new Date() } : chat
        ),
      };

    case 'ARCHIVE_CHATS':
      return {
        ...state,
        chats: state.chats.map(chat =>
          action.payload.includes(chat.id)
            ? { ...chat, isArchived: true, updatedAt: new Date() }
            : chat
        ),
        selectedChatIds: [],
      };

    case 'UNARCHIVE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload ? { ...chat, isArchived: false, updatedAt: new Date() } : chat
        ),
      };

    case 'SET_ACTIVE_CHAT':
      return {
        ...state,
        activeChat: action.payload,
      };

    case 'ADD_PROMPT_RESPONSE': {
      const { chatId, promptResponse } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                promptResponses: [...chat.promptResponses, promptResponse],
                updatedAt: new Date(),
              }
            : chat
        ),
      };
    }

    case 'UPDATE_PROMPT_RESPONSE': {
      const { chatId, promptResponse } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                promptResponses: chat.promptResponses.map(pnr =>
                  pnr.id === promptResponse.id ? { ...promptResponse, updatedAt: new Date() } : pnr
                ),
                updatedAt: new Date(),
              }
            : chat
        ),
      };
    }

    case 'DELETE_PROMPT_RESPONSE': {
      const { chatId, pnrId } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                promptResponses: chat.promptResponses.filter(pnr => pnr.id !== pnrId),
                updatedAt: new Date(),
              }
            : chat
        ),
      };
    }

    case 'TOGGLE_COLLAPSE': {
      const { chatId, pnrId } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                promptResponses: chat.promptResponses.map(pnr =>
                  pnr.id === pnrId ? { ...pnr, isCollapsed: !pnr.isCollapsed } : pnr
                ),
              }
            : chat
        ),
      };
    }

    case 'TOGGLE_PIN_PNR': {
      const { chatId, pnrId } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                promptResponses: chat.promptResponses.map(pnr =>
                  pnr.id === pnrId ? { ...pnr, isPinned: !pnr.isPinned } : pnr
                ),
              }
            : chat
        ),
      };
    }

    case 'TOGGLE_STAR_MESSAGE': {
      const { chatId, pnrId, messageId } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                promptResponses: chat.promptResponses.map(pnr => {
                  if (pnr.id !== pnrId) return pnr;
                  
                  if (pnr.prompt.id === messageId) {
                    return {
                      ...pnr,
                      prompt: { ...pnr.prompt, isStarred: !pnr.prompt.isStarred },
                    };
                  }
                  
                  return {
                    ...pnr,
                    responses: pnr.responses.map(r =>
                      r.id === messageId ? { ...r, isStarred: !r.isStarred } : r
                    ),
                  };
                }),
              }
            : chat
        ),
      };
    }

    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };

    case 'TOGGLE_SELECT_CHAT':
      return {
        ...state,
        selectedChatIds: state.selectedChatIds.includes(action.payload)
          ? state.selectedChatIds.filter(id => id !== action.payload)
          : [...state.selectedChatIds, action.payload],
      };

    case 'SELECT_ALL_CHATS':
      return {
        ...state,
        selectedChatIds: action.payload,
      };

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedChatIds: [],
      };

    case 'TOGGLE_CONTEXT_PANEL_MODE':
      return {
        ...state,
        isContextPanelMode: !state.isContextPanelMode,
      };

    case 'ADD_CONTEXT_PANEL':
      return {
        ...state,
        contextPanels: [...state.contextPanels, action.payload],
      };

    case 'UPDATE_CONTEXT_PANEL':
      return {
        ...state,
        contextPanels: state.contextPanels.map(panel =>
          panel.id === action.payload.id ? action.payload : panel
        ),
      };

    case 'DELETE_CONTEXT_PANEL':
      return {
        ...state,
        contextPanels: state.contextPanels.filter(panel => panel.id !== action.payload),
      };

    case 'LOAD_STATE':
      // Replace state with loaded state, ensuring providers exist
      const loadedState = action.payload;
      const defaultProviders = createDefaultProviders();
      const loadedProviders = loadedState.providers || [];

      // If no providers in loaded state, use defaults
      // Otherwise, use loaded providers (they take precedence)
      const finalProviders = loadedProviders.length > 0 ? loadedProviders : defaultProviders;

      return {
        ...loadedState,
        providers: finalProviders,
        defaultProviderId: loadedState.defaultProviderId || 'ollama-default',
      };

    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };

    // Provider Actions
    case 'ADD_PROVIDER':
      return {
        ...state,
        providers: [...state.providers, action.payload],
        defaultProviderId: state.defaultProviderId || action.payload.id,
      };

    case 'UPDATE_PROVIDER':
      return {
        ...state,
        providers: state.providers.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    case 'DELETE_PROVIDER':
      return {
        ...state,
        providers: state.providers.filter(p => p.id !== action.payload),
        defaultProviderId: state.defaultProviderId === action.payload
          ? state.providers.find(p => p.id !== action.payload)?.id || null
          : state.defaultProviderId,
      };

    case 'SET_DEFAULT_PROVIDER':
      return {
        ...state,
        defaultProviderId: action.payload,
        providers: state.providers.map(p => ({
          ...p,
          isDefault: p.id === action.payload,
        })),
      };

    case 'TEST_PROVIDER':
      return {
        ...state,
        providers: state.providers.map(p =>
          p.id === action.payload.id
            ? {
                ...p,
                testStatus: action.payload.status,
                testMessage: action.payload.message,
                lastTested: new Date(),
              }
            : p
        ),
      };

    // Admin Panel Actions
    case 'TOGGLE_ADMIN_PANEL':
      return {
        ...state,
        isAdminPanelOpen: !state.isAdminPanelOpen,
      };

    // Global Search Actions
    case 'SET_GLOBAL_SEARCH_QUERY':
      return {
        ...state,
        globalSearch: {
          ...state.globalSearch,
          query: action.payload,
          isSearching: action.payload.length > 0,
        },
      };

    case 'SET_GLOBAL_SEARCH_RESULTS':
      return {
        ...state,
        globalSearch: {
          ...state.globalSearch,
          results: action.payload,
          isSearching: false,
          selectedResultIndex: action.payload.length > 0 ? 0 : -1,
        },
      };

    case 'SET_GLOBAL_SEARCH_INDEX':
      return {
        ...state,
        globalSearch: {
          ...state.globalSearch,
          selectedResultIndex: action.payload,
        },
      };

    case 'CLEAR_GLOBAL_SEARCH':
      return {
        ...state,
        globalSearch: {
          query: '',
          results: [],
          isSearching: false,
          selectedResultIndex: -1,
          isOpen: state.globalSearch.isOpen, // Keep current open state
        },
      };

    case 'NAVIGATE_TO_SEARCH_RESULT': {
      const result = action.payload;
      return {
        ...state,
        activeChat: result.chatId,
        globalSearch: {
          ...state.globalSearch,
          selectedResultIndex: state.globalSearch.results.findIndex(
            r => r.chatId === result.chatId && r.pnrId === result.pnrId && r.messageId === result.messageId
          ),
        },
      };
    }

    // NEW: Message Reactions
    case 'SET_MESSAGE_REACTION': {
      const { chatId, pnrId, messageId, reaction } = action.payload;
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                promptResponses: chat.promptResponses.map(pnr => {
                  if (pnr.id !== pnrId) return pnr;
                  if (pnr.prompt.id === messageId) {
                    return { ...pnr, prompt: { ...pnr.prompt, reaction: reaction || undefined } };
                  }
                  return {
                    ...pnr,
                    responses: pnr.responses.map(r =>
                      r.id === messageId ? { ...r, reaction: reaction || undefined } : r
                    ),
                  };
                }),
              }
            : chat
        ),
      };
    }

    // NEW: Template Actions
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.payload] };

    case 'UPDATE_TEMPLATE':
      return {
        ...state,
        templates: state.templates.map(t =>
          t.id === action.payload.id ? { ...action.payload, updatedAt: new Date() } : t
        ),
      };

    case 'DELETE_TEMPLATE':
      return { ...state, templates: state.templates.filter(t => t.id !== action.payload) };

    case 'TOGGLE_TEMPLATE_FAVORITE':
      return {
        ...state,
        templates: state.templates.map(t =>
          t.id === action.payload ? { ...t, isFavorite: !t.isFavorite } : t
        ),
      };

    case 'INCREMENT_TEMPLATE_USAGE':
      return {
        ...state,
        templates: state.templates.map(t =>
          t.id === action.payload ? { ...t, usageCount: t.usageCount + 1 } : t
        ),
      };

    // NEW: Folder Actions
    case 'CREATE_FOLDER':
      return { ...state, folders: [...state.folders, action.payload] };

    case 'UPDATE_FOLDER':
      return {
        ...state,
        folders: state.folders.map(f => (f.id === action.payload.id ? action.payload : f)),
      };

    case 'DELETE_FOLDER':
      return {
        ...state,
        folders: state.folders.filter(f => f.id !== action.payload),
        chats: state.chats.map(chat =>
          chat.folderId === action.payload ? { ...chat, folderId: undefined } : chat
        ),
      };

    case 'MOVE_CHAT_TO_FOLDER':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.chatId
            ? { ...chat, folderId: action.payload.folderId || undefined }
            : chat
        ),
      };

    case 'TOGGLE_FOLDER_EXPAND':
      return {
        ...state,
        folders: state.folders.map(f =>
          f.id === action.payload ? { ...f, isExpanded: !f.isExpanded } : f
        ),
      };

    // NEW: Voice Settings
    case 'UPDATE_VOICE_SETTINGS':
      return { ...state, voiceSettings: { ...state.voiceSettings, ...action.payload } };

    // NEW: Theme Settings
    case 'UPDATE_THEME_SETTINGS':
      const newTheme = action.payload.mode === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : action.payload.mode || state.theme;
      return {
        ...state,
        themeSettings: { ...state.themeSettings, ...action.payload },
        theme: newTheme,
      };

    // NEW: UI State Actions
    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, isCommandPaletteOpen: !state.isCommandPaletteOpen };

    case 'TOGGLE_SHORTCUTS_HELP':
      return { ...state, isShortcutsHelpOpen: !state.isShortcutsHelpOpen };

    case 'TOGGLE_TEMPLATES_MODAL':
      return { ...state, isTemplatesOpen: !state.isTemplatesOpen };

    case 'TOGGLE_EXPORT_MODAL':
      return { ...state, isExportModalOpen: !state.isExportModalOpen };

    case 'TOGGLE_STARRED_MODAL':
      return { ...state, isStarredModalOpen: !state.isStarredModalOpen };

    case 'TOGGLE_GLOBAL_SEARCH':
      return {
        ...state,
        globalSearch: {
          ...state.globalSearch,
          isOpen: !state.globalSearch.isOpen,
          query: !state.globalSearch.isOpen ? '' : state.globalSearch.query, // Clear query when opening
        }
      };

    // NEW: Streaming
    case 'SET_STREAMING':
      return {
        ...state,
        isStreaming: action.payload.isStreaming,
        streamingMessageId: action.payload.messageId,
      };

    default:
      return state;
  }
}

interface ChatContextType {
  state: AppState;
  dispatch: React.Dispatch<ChatAction>;
  activeChat: Chat | null;
  createChat: (title?: string, provider?: LLMProviderConfig) => void;
  getChat: (id: string) => Chat | undefined;
  getPnR: (chatId: string, pnrId: string) => PromptResponse | undefined;
  searchGlobal: (query: string) => void;
  getDefaultProvider: () => LLMProviderConfig | null;
  getTemplate: (id: string) => PromptTemplate | undefined;
  getFolder: (id: string) => ChatFolder | undefined;
  getStarredMessages: () => { chat: Chat; pnr: PromptResponse; message: Message }[];
  exportChat: (chatId: string, format: 'json' | 'markdown' | 'html') => string;
  estimateTokens: (text: string) => number;
  speakText: (text: string) => void;
  stopSpeaking: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const hasHydrated = useRef(false);
  const didAttemptLoad = useRef(false);

  // Load state from localStorage on mount. Mark hydrated after applying load
  useEffect(() => {
    const savedState = loadState();
    if (savedState) {
      dispatch({ type: 'LOAD_STATE', payload: savedState });
    } else {
      // Fresh install: apply defaults so users get the local Ollama provider
      dispatch({ type: 'LOAD_STATE', payload: { ...initialState, providers: createDefaultProviders() } });
    }
    // Note we've attempted a load; we'll mark hydrated after state reflects the load
    didAttemptLoad.current = true;
  }, []);

  // After we attempted load, mark hydrated once the reducer has applied the loaded state
  useEffect(() => {
    if (didAttemptLoad.current && !hasHydrated.current) {
      hasHydrated.current = true;
      return;
    }
  }, [state]);

  // Save state to localStorage on change, but only after initial hydration
  useEffect(() => {
    if (!hasHydrated.current) return;
    saveState(state);
  }, [state]);

  // Apply theme settings
  useEffect(() => {
    const root = document.documentElement;

    // Apply theme mode
    const isDark = state.themeSettings.mode === 'dark' ||
      (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);

    // Apply theme colors
    let colors;
    if (state.themeSettings.preset === 'custom' && state.themeSettings.customColors) {
      // Generate palette from custom colors
      colors = generateColorPalette(state.themeSettings.customColors.primary);
    } else {
      // Use preset colors
      colors = getThemeColors(state.themeSettings.preset, isDark ? 'dark' : 'light');
    }
    applyThemeColors(colors);

    // Apply font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--font-size-base', fontSizes[state.themeSettings.fontSize]);

    // Apply compact mode
    root.classList.toggle('compact', state.themeSettings.compactMode);
  }, [state.themeSettings]);

  const activeChat = state.chats.find(chat => chat.id === state.activeChat) || null;

  const createChat = (title?: string, provider?: LLMProviderConfig) => {
    const newChat = createNewChat(title, provider);
    dispatch({ type: 'CREATE_CHAT', payload: newChat });
  };

  const getChat = (id: string) => state.chats.find(chat => chat.id === id);

  const getPnR = (chatId: string, pnrId: string) => {
    const chat = getChat(chatId);
    return chat?.promptResponses.find(pnr => pnr.id === pnrId);
  };

  // Global search function
  const searchGlobal = (query: string) => {
    if (!query.trim()) {
      dispatch({ type: 'CLEAR_GLOBAL_SEARCH' });
      return;
    }

    dispatch({ type: 'SET_GLOBAL_SEARCH_QUERY', payload: query });

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    state.chats.forEach(chat => {
      chat.promptResponses.forEach(pnr => {
        // Search in prompt
        const promptContent = pnr.prompt.content.toLowerCase();
        let matchIndex = promptContent.indexOf(lowerQuery);
        if (matchIndex !== -1) {
          const start = Math.max(0, matchIndex - 30);
          const end = Math.min(pnr.prompt.content.length, matchIndex + query.length + 30);
          results.push({
            chatId: chat.id,
            chatTitle: chat.title,
            pnrId: pnr.id,
            messageId: pnr.prompt.id,
            messageType: 'prompt',
            content: pnr.prompt.content,
            matchedText: pnr.prompt.content.substring(start, end),
            matchIndex,
            timestamp: pnr.prompt.timestamp,
          });
        }

        // Search in responses
        pnr.responses.forEach(response => {
          const responseContent = response.content.toLowerCase();
          matchIndex = responseContent.indexOf(lowerQuery);
          if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 30);
            const end = Math.min(response.content.length, matchIndex + query.length + 30);
            results.push({
              chatId: chat.id,
              chatTitle: chat.title,
              pnrId: pnr.id,
              messageId: response.id,
              messageType: 'response',
              content: response.content,
              matchedText: response.content.substring(start, end),
              matchIndex,
              timestamp: response.timestamp,
            });
          }
        });
      });
    });

    dispatch({ type: 'SET_GLOBAL_SEARCH_RESULTS', payload: results });
  };

  const getDefaultProvider = () => {
    return state.providers.find(p => p.id === state.defaultProviderId) || null;
  };

  const getTemplate = (id: string) => state.templates.find(t => t.id === id);

  const getFolder = (id: string) => state.folders.find(f => f.id === id);

  const getStarredMessages = () => {
    const starred: { chat: Chat; pnr: PromptResponse; message: Message }[] = [];
    state.chats.forEach(chat => {
      chat.promptResponses.forEach(pnr => {
        if (pnr.prompt.isStarred) {
          starred.push({ chat, pnr, message: pnr.prompt });
        }
        pnr.responses.forEach(response => {
          if (response.isStarred) {
            starred.push({ chat, pnr, message: response });
          }
        });
      });
    });
    return starred.sort((a, b) => b.message.timestamp.getTime() - a.message.timestamp.getTime());
  };

  // Export chat to various formats
  const exportChat = (chatId: string, format: 'json' | 'markdown' | 'html'): string => {
    const chat = getChat(chatId);
    if (!chat) return '';

    switch (format) {
      case 'json':
        return JSON.stringify(chat, null, 2);
      case 'markdown': {
        let md = `# ${chat.title}\n\n`;
        md += `*Created: ${new Date(chat.createdAt).toLocaleString()}*\n\n---\n\n`;
        chat.promptResponses.forEach(pnr => {
          md += `## 🧑 User\n${pnr.prompt.content}\n\n`;
          const response = pnr.responses[pnr.activeResponseIndex];
          if (response) {
            md += `## 🤖 Assistant\n${response.content}\n\n---\n\n`;
          }
        });
        return md;
      }
      case 'html': {
        let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${chat.title}</title>
<style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px;background:#1a1a1a;color:#fff}
.user{background:#2563eb20;padding:16px;border-radius:8px;margin:8px 0}
.assistant{background:#1f2937;padding:16px;border-radius:8px;margin:8px 0}
h1{border-bottom:1px solid #333;padding-bottom:8px}</style></head><body>`;
        html += `<h1>${chat.title}</h1><p><em>Created: ${new Date(chat.createdAt).toLocaleString()}</em></p>`;
        chat.promptResponses.forEach(pnr => {
          html += `<div class="user"><strong>🧑 User</strong><p>${pnr.prompt.content.replace(/\n/g, '<br>')}</p></div>`;
          const response = pnr.responses[pnr.activeResponseIndex];
          if (response) {
            html += `<div class="assistant"><strong>🤖 Assistant</strong><p>${response.content.replace(/\n/g, '<br>')}</p></div>`;
          }
        });
        html += '</body></html>';
        return html;
      }
      default:
        return '';
    }
  };

  // Simple token estimation (approx 4 chars per token)
  const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4);
  };

  // Text-to-Speech
  const speakText = (text: string) => {
    if (!state.voiceSettings.isTTSEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = state.voiceSettings.ttsRate;
    utterance.pitch = state.voiceSettings.ttsPitch;
    if (state.voiceSettings.ttsVoice) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === state.voiceSettings.ttsVoice);
      if (voice) utterance.voice = voice;
    }
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
  };

  return (
    <ChatContext.Provider value={{ 
      state, 
      dispatch, 
      activeChat, 
      createChat, 
      getChat, 
      getPnR,
      searchGlobal,
      getDefaultProvider,
      getTemplate,
      getFolder,
      getStarredMessages,
      exportChat,
      estimateTokens,
      speakText,
      stopSpeaking,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
