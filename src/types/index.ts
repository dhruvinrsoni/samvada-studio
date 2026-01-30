// Core Types for Samvada Studio

// LLM Provider Types
export type LLMProviderType = 'openai' | 'anthropic' | 'google' | 'ollama' | 'azure' | 'custom';

export interface LLMProviderConfig {
  id: string;
  name: string;
  type: LLMProviderType;
  apiKey?: string; // ⚠️ SENSITIVE - Never stored in localStorage
  apiEndpoint?: string;
  model: string;
  isEnabled: boolean;
  isDefault: boolean;
  settings: {
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  lastTested?: Date;
  testStatus?: 'success' | 'failed' | 'pending' | 'untested';
  testMessage?: string;
  testErrorDetails?: any; // Full error details from test (ProviderError object)
  testRawResponse?: string; // Raw API response for debugging
}

// Secure version for localStorage (excludes sensitive data)
export interface SafeLLMProviderConfig {
  id: string;
  name: string;
  type: LLMProviderType;
  apiEndpoint?: string;
  model: string;
  isEnabled: boolean;
  isDefault: boolean;
  settings: {
    temperature: number;
    maxTokens: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
  lastTested?: Date;
  testStatus?: 'success' | 'failed' | 'pending' | 'untested';
  testMessage?: string;
  testErrorDetails?: any; // Full error details from test (ProviderError object)
  testRawResponse?: string; // Raw API response for debugging
}

export const DEFAULT_PROVIDER_CONFIGS: Record<LLMProviderType, Partial<LLMProviderConfig>> = {
  openai: {
    name: 'OpenAI (ChatGPT)',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4',
    settings: { temperature: 0.7, maxTokens: 4096 },
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-5',
    settings: { temperature: 0.7, maxTokens: 4096 },
  },
  google: {
    name: 'Google (Gemini)',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    model: 'gemini-pro',
    settings: { temperature: 0.7, maxTokens: 4096 },
  },
  ollama: {
    name: 'Ollama (Local)',
    apiEndpoint: 'http://localhost:11434/api/generate',
    model: 'llama2',
    settings: { temperature: 0.7, maxTokens: 4096 },
  },
  azure: {
    name: 'Azure OpenAI',
    apiEndpoint: '',
    model: 'gpt-4',
    settings: { temperature: 0.7, maxTokens: 4096 },
  },
  custom: {
    name: 'Custom Provider',
    apiEndpoint: '',
    model: '',
    settings: { temperature: 0.7, maxTokens: 4096 },
  },
};

// Default Formatting Profiles
export const DEFAULT_FORMATTING_PROFILES: FormattingProfile[] = [
  {
    id: 'technical-detailed',
    name: 'Technical & Detailed',
    description: 'Code-heavy responses with detailed explanations',
    isCustom: false,
    rules: [
      {
        id: 'tech-1',
        type: 'response-format',
        name: 'Response Format',
        description: 'Always use code blocks',
        value: 'Use markdown code blocks with language specification. Include inline comments.',
        isEnabled: true,
      },
      {
        id: 'tech-2',
        type: 'always-include',
        name: 'Always Include',
        description: 'Technical elements',
        value: 'Type signatures, error handling examples, edge cases',
        isEnabled: true,
      },
    ],
    responseFormat: 'markdown',
    stylePreferences: 'Technical documentation style with code examples, type signatures, and detailed explanations.',
  },
  {
    id: 'concise-bullet',
    name: 'Concise Bullets',
    description: 'Brief, scannable bullet-point responses',
    isCustom: false,
    rules: [
      {
        id: 'concise-1',
        type: 'response-format',
        name: 'Response Format',
        description: 'Use bullet points',
        value: 'Format all responses as bullet points. Maximum 3 sub-bullets per point.',
        isEnabled: true,
      },
      {
        id: 'concise-2',
        type: 'always-exclude',
        name: 'Always Exclude',
        description: 'Verbose elements',
        value: 'Long paragraphs, unnecessary context, philosophical discussions',
        isEnabled: true,
      },
    ],
    responseFormat: 'bullet-points',
    stylePreferences: 'Keep responses brief and scannable. Use emojis for visual hierarchy.',
  },
  {
    id: 'academic-formal',
    name: 'Academic & Formal',
    description: 'Scholarly tone with citations and references',
    isCustom: false,
    rules: [
      {
        id: 'academic-1',
        type: 'response-format',
        name: 'Response Format',
        description: 'Formal structure',
        value: 'Use formal academic structure: Introduction, Body, Conclusion. Include references.',
        isEnabled: true,
      },
      {
        id: 'academic-2',
        type: 'style-guide',
        name: 'Style Guide',
        description: 'Academic conventions',
        value: 'Use third person, avoid contractions, cite sources, use formal vocabulary.',
        isEnabled: true,
      },
    ],
    responseFormat: 'markdown',
    stylePreferences: 'Academic writing style with proper citations and formal language.',
  },
  {
    id: 'creative-conversational',
    name: 'Creative & Conversational',
    description: 'Friendly, engaging responses with personality',
    isCustom: false,
    rules: [
      {
        id: 'creative-1',
        type: 'style-guide',
        name: 'Style Guide',
        description: 'Conversational tone',
        value: 'Use contractions, idioms, metaphors. Be engaging and personable.',
        isEnabled: true,
      },
      {
        id: 'creative-2',
        type: 'always-include',
        name: 'Always Include',
        description: 'Creative elements',
        value: 'Examples, analogies, real-world applications, emojis when appropriate',
        isEnabled: true,
      },
    ],
    responseFormat: 'markdown',
    stylePreferences: 'Warm, conversational tone with creative examples and analogies.',
  },
  {
    id: 'code-only',
    name: 'Code Only',
    description: 'Minimal explanation, maximum code',
    isCustom: false,
    rules: [
      {
        id: 'code-1',
        type: 'response-format',
        name: 'Response Format',
        description: 'Code-focused',
        value: 'Provide complete, runnable code. Minimal text explanation.',
        isEnabled: true,
      },
      {
        id: 'code-2',
        type: 'always-exclude',
        name: 'Always Exclude',
        description: 'Non-code content',
        value: 'Long explanations, theoretical discussions, background context',
        isEnabled: true,
      },
    ],
    responseFormat: 'code-only',
    stylePreferences: 'Code first, comments second. Minimal prose.',
  },
];

// Search Types
export interface SearchResult {
  chatId: string;
  chatTitle: string;
  pnrId: string;
  messageId: string;
  messageType: 'prompt' | 'response';
  content: string;
  matchedText: string;
  matchIndex: number;
  timestamp: Date;
}

export interface GlobalSearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  selectedResultIndex: number;
  isOpen: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStarred: boolean;
  isEditing?: boolean;
  reaction?: ReactionType;
  replyTo?: string; // Message ID this is replying to
  tokenCount?: number;
}

export interface Draft {
  id: string;
  content: string;
  timestamp: Date;
}

export interface PromptResponse {
  id: string; // PnR ID - unique identifier
  prompt: Message;
  responses: Message[];
  drafts: Draft[];
  activeResponseIndex: number;
  isCollapsed: boolean;
  isPinned: boolean;
  isStarred: boolean;
  processingTime?: number; // in milliseconds
  createdAt: Date;
  updatedAt: Date;
  providerId?: string; // Which LLM provider was used
}

// Formatting Rules
export type FormattingRuleType = 'response-format' | 'always-include' | 'always-exclude' | 'style-guide';

export interface FormattingRule {
  id: string;
  type: FormattingRuleType;
  name: string;
  description: string;
  value: string;
  isEnabled: boolean;
}

export interface FormattingProfile {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
  rules: FormattingRule[];
  responseFormat?: string; // e.g., "markdown", "code-only", "bullet-points", "numbered-list"
  stylePreferences?: string; // Free-form style instructions
}

export interface ChatSettings {
  role: string;
  customInstructions: string;
  alwaysInclude: string[];
  alwaysExclude: string[];
  examples: Example[];
  temperature?: number;
  maxTokens?: number;
  providerId?: string; // Override provider for this chat
  formattingProfile?: FormattingProfile; // NEW: Per-chat formatting profile
}

export interface Example {
  id: string;
  input: string;
  output: string;
}

export interface Chat {
  id: string;
  title: string;
  promptResponses: PromptResponse[];
  settings: ChatSettings;
  isArchived: boolean;
  isPinned: boolean;
  folderId?: string; // Which folder this chat belongs to
  providerId?: string; // Associated LLM provider
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextPanel {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
}

// Prompt Template Types
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Chat Folder Types
export interface ChatFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  chatIds: string[];
  isExpanded: boolean;
  createdAt: Date;
}

// Message Reaction Types
export type ReactionType = 'thumbsUp' | 'thumbsDown' | 'heart' | 'bookmark';

export interface MessageReaction {
  messageId: string;
  reaction: ReactionType;
  timestamp: Date;
}

// Voice/Audio Types
export interface VoiceSettings {
  isVoiceInputEnabled: boolean;
  isTTSEnabled: boolean;
  ttsVoice: string;
  ttsRate: number;
  ttsPitch: number;
  autoSpeak: boolean;
}

// Theme Customization
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'cyan' | 'red' | 'yellow' | 'royal-blue' | 'emerald' | 'rose' | 'indigo' | 'teal' | 'amber' | 'violet' | 'custom';

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ColorPalette {
  primary: string;      // Main accent color
  primaryHover: string; // Hover state
  primaryLight: string; // Light variant
  primaryDark: string;  // Dark variant
  secondary: string;    // Secondary accent
  accent: string;       // Additional accent
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    light: ColorPalette;
    dark: ColorPalette;
  };
  preview: {
    primary: string;
    secondary: string;
  };
}

export interface CustomTheme {
  primary: string;
  secondary: string;
  accent: string;
}

export interface ThemeSettings {
  mode: ThemeMode;
  preset: string; // Theme preset ID or 'custom'
  customColors: CustomTheme | null;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  promptNavigationEnabled: boolean; // Enable/disable prompt navigation with arrow keys
}

// Keyboard Shortcuts
export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  keys: string[];
  category: 'navigation' | 'editing' | 'chat' | 'general';
}

// Token/Cost Estimation
export interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

// Command Palette
export interface CommandAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  shortcut?: string[];
  category: 'chat' | 'navigation' | 'settings' | 'export' | 'templates';
  action: () => void;
}

// Export/Import Types
export type ExportFormat = 'json' | 'markdown' | 'html' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  includeSettings: boolean;
  includeTimestamps: boolean;
  includeMetadata: boolean;
}

export interface AppState {
  chats: Chat[];
  activeChat: string | null;
  contextPanels: ContextPanel[];
  searchQuery: string;
  selectedChatIds: string[];
  isContextPanelMode: boolean;
  theme: 'light' | 'dark';
  // LLM Providers
  providers: LLMProviderConfig[];
  defaultProviderId: string | null;
  // Global Search
  globalSearch: GlobalSearchState;
  // Admin Panel
  isAdminPanelOpen: boolean;
  // NEW: Prompt Templates
  templates: PromptTemplate[];
  // NEW: Chat Folders
  folders: ChatFolder[];
  // NEW: Voice Settings
  voiceSettings: VoiceSettings;
  // NEW: Theme Settings
  themeSettings: ThemeSettings;
  // NEW: UI State
  isCommandPaletteOpen: boolean;
  isShortcutsHelpOpen: boolean;
  isTemplatesOpen: boolean;
  isExportModalOpen: boolean;
  isStarredModalOpen: boolean;
  // NEW: Streaming
  isStreaming: boolean;
  streamingMessageId: string | null;
  // NEW: Health Monitoring
  healthMonitoringEnabled?: boolean;
  // NEW: Mobile/Responsive
  isSidebarOpen: boolean; // For mobile sidebar toggle
}

// Secure version for localStorage (excludes sensitive provider data)
export interface SafeAppState {
  chats: Chat[];
  activeChat: string | null;
  contextPanels: ContextPanel[];
  searchQuery: string;
  selectedChatIds: string[];
  isContextPanelMode: boolean;
  theme: 'light' | 'dark';
  // LLM Providers (safe version without API keys)
  providers: SafeLLMProviderConfig[];
  defaultProviderId: string | null;
  // Global Search
  globalSearch: GlobalSearchState;
  // Admin Panel
  isAdminPanelOpen: boolean;
  // NEW: Prompt Templates
  templates: PromptTemplate[];
  // NEW: Chat Folders
  folders: ChatFolder[];
  // NEW: Voice Settings
  voiceSettings: VoiceSettings;
  // NEW: Theme Settings
  themeSettings: ThemeSettings;
  // NEW: UI State
  isCommandPaletteOpen: boolean;
  isShortcutsHelpOpen: boolean;
  isTemplatesOpen: boolean;
  isExportModalOpen: boolean;
  isStarredModalOpen: boolean;
  // NEW: Streaming
  isStreaming: boolean;
  streamingMessageId: string | null;
  // NEW: Mobile/Responsive
  isSidebarOpen: boolean;
}

export type ChatAction =
  | { type: 'CREATE_CHAT'; payload: Chat }
  | { type: 'UPDATE_CHAT'; payload: Chat }
  | { type: 'DELETE_CHAT'; payload: string }
  | { type: 'DELETE_CHATS'; payload: string[] }
  | { type: 'ARCHIVE_CHAT'; payload: string }
  | { type: 'ARCHIVE_CHATS'; payload: string[] }
  | { type: 'UNARCHIVE_CHAT'; payload: string }
  | { type: 'SET_ACTIVE_CHAT'; payload: string | null }
  | { type: 'ADD_PROMPT_RESPONSE'; payload: { chatId: string; promptResponse: PromptResponse } }
  | { type: 'UPDATE_PROMPT_RESPONSE'; payload: { chatId: string; promptResponse: PromptResponse } }
  | { type: 'DELETE_PROMPT_RESPONSE'; payload: { chatId: string; pnrId: string } }
  | { type: 'TOGGLE_COLLAPSE'; payload: { chatId: string; pnrId: string } }
  | { type: 'EXPAND_ALL'; payload: { chatId: string } }
  | { type: 'COLLAPSE_ALL'; payload: { chatId: string } }
  | { type: 'TOGGLE_PIN_PNR'; payload: { chatId: string; pnrId: string } }
  | { type: 'TOGGLE_STAR_PNR'; payload: { chatId: string; pnrId: string } }
  | { type: 'TOGGLE_STAR_MESSAGE'; payload: { chatId: string; pnrId: string; messageId: string } }
  | { type: 'SET_MESSAGE_REACTION'; payload: { chatId: string; pnrId: string; messageId: string; reaction: ReactionType | null } }
  | { type: 'REGENERATE_RESPONSE'; payload: { chatId: string; pnrId: string } }
  | { type: 'SELECT_DRAFT'; payload: { chatId: string; pnrId: string; draftIndex: number } }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'TOGGLE_SELECT_CHAT'; payload: string }
  | { type: 'SELECT_ALL_CHATS'; payload: string[] }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'TOGGLE_CONTEXT_PANEL_MODE' }
  | { type: 'ADD_CONTEXT_PANEL'; payload: ContextPanel }
  | { type: 'UPDATE_CONTEXT_PANEL'; payload: ContextPanel }
  | { type: 'DELETE_CONTEXT_PANEL'; payload: string }
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  // Provider Actions
  | { type: 'ADD_PROVIDER'; payload: LLMProviderConfig }
  | { type: 'UPDATE_PROVIDER'; payload: LLMProviderConfig }
  | { type: 'DELETE_PROVIDER'; payload: string }
  | { type: 'SET_DEFAULT_PROVIDER'; payload: string }
  | { type: 'TEST_PROVIDER'; payload: { id: string; status: 'success' | 'failed' | 'pending'; message?: string; errorDetails?: any; rawResponse?: string } }
  // Admin Panel Actions
  | { type: 'TOGGLE_ADMIN_PANEL' }
  // Global Search Actions
  | { type: 'SET_GLOBAL_SEARCH_QUERY'; payload: string }
  | { type: 'SET_GLOBAL_SEARCH_RESULTS'; payload: SearchResult[] }
  | { type: 'SET_GLOBAL_SEARCH_INDEX'; payload: number }
  | { type: 'CLEAR_GLOBAL_SEARCH' }
  | { type: 'NAVIGATE_TO_SEARCH_RESULT'; payload: SearchResult }
  // NEW: Template Actions
  | { type: 'ADD_TEMPLATE'; payload: PromptTemplate }
  | { type: 'UPDATE_TEMPLATE'; payload: PromptTemplate }
  | { type: 'DELETE_TEMPLATE'; payload: string }
  | { type: 'TOGGLE_TEMPLATE_FAVORITE'; payload: string }
  | { type: 'INCREMENT_TEMPLATE_USAGE'; payload: string }
  // NEW: Folder Actions
  | { type: 'CREATE_FOLDER'; payload: ChatFolder }
  | { type: 'UPDATE_FOLDER'; payload: ChatFolder }
  | { type: 'DELETE_FOLDER'; payload: string }
  | { type: 'MOVE_CHAT_TO_FOLDER'; payload: { chatId: string; folderId: string | null } }
  | { type: 'TOGGLE_FOLDER_EXPAND'; payload: string }
  // NEW: Voice Settings
  | { type: 'UPDATE_VOICE_SETTINGS'; payload: Partial<VoiceSettings> }
  // NEW: Theme Settings
  | { type: 'UPDATE_THEME_SETTINGS'; payload: Partial<ThemeSettings> }
  // NEW: UI State Actions
  | { type: 'TOGGLE_COMMAND_PALETTE' }
  | { type: 'TOGGLE_SHORTCUTS_HELP' }
  | { type: 'TOGGLE_TEMPLATES_MODAL' }
  | { type: 'TOGGLE_EXPORT_MODAL' }
  | { type: 'TOGGLE_STARRED_MODAL' }
  | { type: 'TOGGLE_GLOBAL_SEARCH' }
  // NEW: Streaming
  | { type: 'SET_STREAMING'; payload: { isStreaming: boolean; messageId: string | null } }
  // NEW: Health Monitoring
  | { type: 'TOGGLE_HEALTH_MONITORING'; payload: boolean }
  // NEW: Mobile/Responsive
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean };

// Toast Notification Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // in milliseconds
  timestamp: Date;
}
