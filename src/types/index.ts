// Core Types for Samvada Studio

// LLM Provider Types
export type LLMProviderType = 'openai' | 'anthropic' | 'google' | 'ollama' | 'azure' | 'custom';

export interface LLMProviderConfig {
  id: string;
  name: string;
  type: LLMProviderType;
  apiKey?: string; // ⚠️ SENSITIVE - Never stored in localStorage
  apiEndpoint?: string;
  corsProxy?: string; // Optional CORS proxy URL for browser-blocked APIs (OpenAI, Anthropic)
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
  corsProxy?: string; // Optional CORS proxy URL for browser-blocked APIs
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
    model: 'llama2:latest',
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
  {
    id: 'table-format',
    name: 'Table Format',
    description: 'Structured data in markdown tables',
    isCustom: false,
    rules: [
      {
        id: 'table-1',
        type: 'response-format',
        name: 'Response Format',
        description: 'Use markdown tables',
        value: 'Format all structured data as markdown tables. Use proper table headers and alignment.',
        isEnabled: true,
      },
      {
        id: 'table-2',
        type: 'always-include',
        name: 'Always Include',
        description: 'Table elements',
        value: 'Table headers, proper column alignment, consistent formatting',
        isEnabled: true,
      },
    ],
    responseFormat: 'table',
    stylePreferences: 'Use markdown tables for any structured data, comparisons, or lists with multiple columns.',
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
  promptVersionIndex?: number;
}

export interface GlobalSearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  selectedResultIndex: number;
  isOpen: boolean;
}

// Provider-agnostic conversation turn for chat history
export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
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
  promptVersionIndex?: number; // which prompt version generated this response (undefined = 0)
}

export interface Draft {
  id: string;
  content: string;
  timestamp: Date;
}

export interface PromptResponse {
  id: string; // PnR ID - unique identifier
  name?: string; // Custom name for the PnR (optional)
  prompt: Message; // legacy: always mirrors prompts[activePromptIndex ?? last]
  responses: Message[];
  drafts: Draft[];
  activeResponseIndex: number; // global index into responses[] — kept in sync for backward compat
  isCollapsed: boolean;
  isPinned: boolean;
  isStarred: boolean;
  processingTime?: number; // in milliseconds
  createdAt: Date;
  updatedAt: Date;
  providerId?: string; // Which LLM provider was used
  // Prompt versioning (added in v2; undefined on old data → treated as single version)
  prompts?: Message[];                          // all prompt versions, index = version number
  activePromptIndex?: number;                   // currently displayed version (default 0)
  activeResponseIndexPerVersion?: Record<number, number>; // per-version active draft index
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
  sendChatHistory?: boolean; // Send conversation history to LLM (undefined → true)
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
  fontSize: 'xs' | 'small' | 'medium' | 'large' | 'xl';
  compactMode: boolean;
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
  // Theme settings modal state
  isThemeSettingsOpen?: boolean;
  themeSettingsActiveTab?: 'appearance' | 'colors' | 'advanced';
  // NEW: Streaming
  isStreaming: boolean;
  streamingMessageId: string | null;
  // NEW: Health Monitoring
  healthMonitoringEnabled?: boolean;
  showDisableWarning?: boolean;
  // NEW: Mobile/Responsive
  isSidebarOpen: boolean; // For mobile sidebar toggle
  // NEW: Prompt Navigation
  promptNavigationEnabled: boolean;
  // Active Ollama Host override (canonical base URL or null)
  activeOllamaHostId: string | null;
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
  // NEW: Prompt Navigation
  promptNavigationEnabled: boolean;
  // Active Ollama Host override
  activeOllamaHostId?: string | null;
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
  | { type: 'TOGGLE_PROVIDER_ENABLED'; payload: string }
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
  | { type: 'TOGGLE_THEME_SETTINGS_MODAL' }
  | { type: 'SET_THEME_SETTINGS_TAB'; payload: 'appearance' | 'colors' | 'advanced' }
  | { type: 'TOGGLE_EXPORT_MODAL' }
  | { type: 'TOGGLE_STARRED_MODAL' }
  | { type: 'TOGGLE_GLOBAL_SEARCH' }
  // NEW: Streaming
  | { type: 'SET_STREAMING'; payload: { isStreaming: boolean; messageId: string | null } }
  // NEW: Health Monitoring
  | { type: 'TOGGLE_HEALTH_MONITORING'; payload: boolean }
  | { type: 'SET_SHOW_DISABLE_WARNING'; payload: boolean }
  // NEW: Mobile/Responsive
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  // NEW: Prompt Navigation
  | { type: 'TOGGLE_PROMPT_NAVIGATION'; payload: boolean }
  // Active Ollama Host
  | { type: 'SET_ACTIVE_OLLAMA_HOST'; payload: string | null };

// Ollama Model Management Types
export interface OllamaModelDetails {
  parent_model?: string;
  format: string;
  family: string;
  families?: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface OllamaModelInfo {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
}

export interface OllamaModelShowResponse {
  modelfile: string;
  parameters: string;
  template: string;
  details: OllamaModelDetails;
  model_info?: Record<string, unknown>;
  license?: string;
}

export interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface OllamaRunningModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  details: OllamaModelDetails;
  expires_at: string;
  size_vram: number;
}

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

// Context window sizes (in tokens) for common models.
// Key is a prefix or exact model name; lookup uses longest-prefix match.
export const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI
  'gpt-3.5-turbo': 16_385,
  'gpt-4': 8_192,
  'gpt-4-turbo': 128_000,
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4.1': 1_000_000,
  'gpt-4.1-mini': 1_000_000,
  'gpt-4.1-nano': 1_000_000,
  'gpt-5': 1_000_000,
  'o1': 200_000,
  'o1-mini': 128_000,
  'o1-pro': 200_000,
  'o3': 200_000,
  'o3-mini': 200_000,
  'o3-pro': 200_000,
  'o4-mini': 200_000,
  // Anthropic
  'claude-3-opus': 200_000,
  'claude-3-sonnet': 200_000,
  'claude-3-haiku': 200_000,
  'claude-3.5-sonnet': 200_000,
  'claude-3.5-haiku': 200_000,
  'claude-3-5-sonnet': 200_000,
  'claude-3-5-haiku': 200_000,
  'claude-sonnet-4': 200_000,
  'claude-opus-4': 200_000,
  // Google
  'gemini-pro': 32_000,
  'gemini-1.5-pro': 2_000_000,
  'gemini-1.5-flash': 1_000_000,
  'gemini-2.0-flash': 1_000_000,
  'gemini-2.5-pro': 1_000_000,
  'gemini-2.5-flash': 1_000_000,
  // Ollama (conservative defaults — actual varies by model/quantization)
  'llama2': 4_096,
  'llama3': 8_192,
  'llama3.1': 128_000,
  'llama3.2': 128_000,
  'llama3.3': 128_000,
  'mistral': 32_000,
  'mixtral': 32_000,
  'codellama': 16_384,
  'deepseek': 128_000,
  'phi': 4_096,
  'phi3': 128_000,
  'gemma': 8_192,
  'gemma2': 8_192,
  'gemma3': 128_000,
  'qwen': 32_000,
  'qwen2': 128_000,
};

/**
 * Look up the context window for a model name.
 * Exact match first, then longest-prefix match.
 * e.g. "gpt-4o-2024-08-06" matches "gpt-4o" (128k).
 */
export function getModelContextWindow(modelName: string): number | undefined {
  if (MODEL_CONTEXT_WINDOWS[modelName] !== undefined) {
    return MODEL_CONTEXT_WINDOWS[modelName];
  }
  let bestMatch = '';
  for (const key of Object.keys(MODEL_CONTEXT_WINDOWS)) {
    if (modelName.startsWith(key) && key.length > bestMatch.length) {
      bestMatch = key;
    }
  }
  return bestMatch ? MODEL_CONTEXT_WINDOWS[bestMatch] : undefined;
}
