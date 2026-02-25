
<!-- Enhanced README: concise product brief, architecture and quick start -->
# Samvada Studio

Samvada Studio is a keyboard-first, multi-provider conversation workbench for power users. It helps you design, iterate, and manage multi-turn conversational workflows across many LLM providers (OpenAI, Anthropic, Google, Ollama, Azure).

Etymology: Saṃvāda (IAST: Saṃvāda; Devanagari: संवाद) means "dialogue" or "conversation" in Sanskrit — the name reflects the product focus on conversation design and orchestration.

TL;DR — What this is
- A central hub for prompt/response experiments, templates, exports, and conversation management.
- Designed for developers, researchers, and content professionals who need deterministic workflows and provider comparison.

Core ideas (one-liner)
- Conversation orchestration: treat each prompt-response pair (PnR) as a first-class unit for editing, drafting, and regenerating across providers.

Quick start

```bash
npm install
npm run dev
# open http://localhost:5173
```

Where to look (important files)
- State & reducer: `src/context/ChatContext.tsx`
- Provider integration: `src/utils/llmService.ts`
- Persistence: `src/utils/storage.ts`
- Core chat UI: `src/components/chat/*`
- Admin + provider UI: `src/components/admin/*`
- Theme system: `src/utils/theme.ts`

- Product brief (concise)
- Multi-provider architecture with per-chat provider selection and dynamic provider/model fetching.
- Prompt-Response Items (PnR) with drafts, inline edits, pinning, and regeneration.
- Premium UX: Command Palette, Global Search, Keyboard Shortcuts, Voice Input, Templates, Export.

Selected features
- Provider-agnostic LLM calls via `llmService` (OpenAI, Anthropic, Google, Ollama, Azure)
- Inline editing of prompts and responses (Gemini-style)
- Drafts & regenerate workflow
- Folders, Pinning, Starred messages
- Export (MD/JSON/HTML/TXT) with full workspace backup
- Token estimation + rough cost preview

Architecture (high level)

UI (React + TypeScript)
- Sidebar (chats, folders, search)
- ChatArea (PnR rendering, provider selection)
- PromptInput (smart enter, lists, voice)
- Admin (provider management)

State
- `ChatContext` — single source of truth (reducer + actions)

Business Logic
- `utils/llmService.ts` — provider adapter and request orchestration
- `utils/storage.ts` — safe serialization (no API keys), Date round-trip

Integration
- LocalStorage for state persistence (safe form)
- Web Speech API for voice input
- React Markdown for rendering responses and code blocks

Important operational notes
- API keys are intentionally not persisted to localStorage for security; they remain in memory only. Use the Admin panel to re-enter keys after a hard refresh.
- The code includes a hydration guard to avoid initial-save race conditions; if providers appear missing after reload, allow the app to finish loading.

Brand & roadmap note
- This repo is the first module of a broader vision: "Samvada Suite" (coming soon). Samvada Studio is the creation and authoring module; future modules may include Samvada Labs (experimentation) and Samvada Hub (enterprise connectors). See `docs/BRAND.md` for naming rationale and brand guidance.

Contributing (short)
- Fork, create a small focused branch, open PRs with linked issues.
- Keep changes typed in TypeScript; follow existing formatting and lint rules.

Minimal troubleshooting
- If the app doesn't start: check Node/npm versions and run `npm install`.
-- If providers don't persist: re-enter API keys (design choice) and ensure saved providers are visible in `window.__SAMVADA_DEBUG__` (dev helper).

License
- MIT

# Samvada Studio

A feature-rich conversational UI combining the best UX features from Gemini, ChatGPT, Copilot, and more — all in one powerful interface.

![Samvada Studio](https://img.shields.io/badge/React-18.3-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue) ![Tailwind](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8) ![Vite](https://img.shields.io/badge/Vite-6.0-646cff)

## 🚀 Features

### 🎯 Command Palette (NEW!)
| Feature | Description |
|---------|-------------|
| **Quick Actions** | Press `Ctrl+K` to open VS Code-style command palette |
| **Search Commands** | Instantly find and execute any action |
| **Categories** | Chat, Navigation, Settings, Export, Templates |
| **Keyboard Navigation** | Arrow keys + Enter to select |

### 🎤 Voice Input (NEW!)
| Feature | Description |
|---------|-------------|
| **Speech-to-Text** | Click mic button or press `Ctrl+M` to dictate |
| **Real-time Preview** | See interim transcription as you speak |
| **Continuous Mode** | Keep dictating until you click stop |
| **Browser Native** | Uses Web Speech API (Chrome, Edge, Safari) |

### 📁 Chat Folders (NEW!)
| Feature | Description |
|---------|-------------|
| **Organize Chats** | Create folders with custom names, colors, and icons |
| **Drag & Drop** | Drag chats into folders to organize |
| **Expand/Collapse** | Toggle folder visibility |
| **8 Color Options** | Blue, Purple, Green, Orange, Pink, Cyan, Red, Yellow |
| **10 Icon Options** | Various emoji icons for folders |

### 📝 Prompt Templates (NEW!)
| Feature | Description |
|---------|-------------|
| **Template Library** | Save and reuse common prompts |
| **Categories** | General, Code, Writing, Analysis, Creative, Custom |
| **Favorites** | Mark frequently used templates as favorites |
| **Usage Tracking** | See how often each template is used |
| **Quick Apply** | Click to insert template content into prompt |

### 📤 Export Options (NEW!)
| Feature | Description |
|---------|-------------|
| **Multiple Formats** | Export as Markdown, JSON, HTML, or Plain Text |
| **Single or Multi-Chat** | Export one chat or select multiple |
| **Full Backup** | Export All Data option for complete backup |
| **Include Timestamps** | Optional timestamp inclusion |

### 🎨 Enhanced Code Blocks (NEW!)
| Feature | Description |
|---------|-------------|
| **Syntax Highlighting** | Colorized keywords, strings, comments, numbers |
| **Language Detection** | JavaScript, TypeScript, Python, Java, and more |
| **Copy Button** | Per-block copy with success feedback |
| **Language Label** | Shows detected language in header |

### 👍 Message Reactions (NEW!)
| Feature | Description |
|---------|-------------|
| **Thumbs Up/Down** | Rate AI responses for feedback |
| **Bookmark** | Save important responses |
| **Text-to-Speech** | Click speaker to hear response read aloud |
| **Visual Feedback** | Active reactions are highlighted |

### 📊 Token Counter (NEW!)
| Feature | Description |
|---------|-------------|
| **Live Estimation** | See token count as you type |
| **Cost Estimation** | Approximate cost per model (GPT-4, Claude, etc.) |
| **Chat Stats** | Total tokens, messages, and estimated cost |

### ⌨️ Keyboard Shortcuts Panel (NEW!)
| Feature | Description |
|---------|-------------|
| **Help Modal** | Press `?` to view all shortcuts |
| **5 Categories** | General, Chat, Prompt Input, Navigation, Voice |
| **Styled Keys** | Beautiful key badge display |

### 🎨 Theme System (ENHANCED!)
| Feature | Description |
|---------|-------------|
| **Dark/Light Mode** | Toggle with sun/moon button |
| **8 Accent Colors** | Blue, Purple, Green, Orange, Pink, Cyan, Red, Yellow |
| **Font Size Options** | Small, Medium, Large |
| **Compact Mode** | Reduce spacing for more content |

### 🔌 Multi-Provider LLM Support
| Provider | API Type | Description |
|----------|----------|-------------|
| **OpenAI (ChatGPT)** | Cloud | GPT-4, GPT-4o, GPT-3.5-turbo |
| **Anthropic (Claude)** | Cloud | Claude 3.5 Sonnet, Claude 3 Opus |
| **Google (Gemini)** | Cloud | Gemini 1.5 Pro, Gemini 1.5 Flash |
| **Ollama** | Local | Run models locally (Llama, Mistral, etc.) |
| **Azure OpenAI** | Cloud | Enterprise Azure-hosted models |
| **Custom** | Any | OpenAI-compatible API endpoints |

### ⚙️ Admin Settings Panel
| Feature | Description |
|---------|-------------|
| **Provider Configuration** | Add/edit/delete LLM provider configs |
| **Sandbox Settings** | Temperature, max tokens, top-p, frequency/presence penalty |
| **Test Connection** | Verify provider configs work before using |
| **Set Default Provider** | Choose which provider to use for new chats |
| **Data Management** | Export data or clear all data |

### 🔍 Enhanced Global Search
| Feature | Description |
|---------|-------------|
| **Cross-Chat Search** | Search across all chats instantly |
| **Highlighting** | Matching text is highlighted in results |
| **Navigate to Result** | Click to jump directly to the specific prompt/response |
| **Keyboard Navigation** | Arrow keys to navigate, Enter to select |

### 📝 Rich Text Prompt Input
| Feature | Description |
|---------|-------------|
| **Formatting Toolbar** | Bold, Italic, Code, Link buttons |
| **Auto-List Mode** | Type "1." or "-" to enable list mode |
| **List Continuation** | Enter auto-continues numbered/bullet lists |
| **Easy Exit** | Empty line or Shift+Enter exits list mode |
| **Smart Send** | Ctrl+Enter or Shift+Enter to send |
| **Voice Input** | Mic button for speech-to-text |
| **Token Counter** | Live token estimation |

### ✨ Core Chat Features
| Feature | Description | Inspired By |
|---------|-------------|-------------|
| **Inline Response Editing** | Edit any AI response directly in place | Gemini |
| **Quote to Prompt** | Select text from response and quote it in your next message | ChatGPT |
| **Drafts & Regenerate** | Multiple response drafts with easy navigation | Gemini |
| **Archive Chats** | Archive and unarchive conversations | ChatGPT |
| **Pin Prompt-Responses** | Pin important exchanges for quick access | Custom |
| **Star Messages** | Star important prompts and responses | Custom |
| **Collapsible Items** | Each PnR can be collapsed with preview header | Custom |

### 🛠️ Power User Features
| Feature | Description |
|---------|-------------|
| **Markdown Editor** | Full markdown support in prompts and responses |
| **Chat Settings** | Role, custom instructions, always include/exclude formatting |
| **Few-Shot Examples** | Add input/output examples for better context |
| **Context Panel Mode** | Add custom context snippets for on-demand inclusion |
| **Global Search** | Search across all chats instantly |
| **Bulk Operations** | Select multiple chats to delete or archive |

### ⌨️ Productivity
| Feature | Description |
|---------|-------------|
| **Keyboard Shortcuts** | Full keyboard control (`?` to view all) |
| **Timestamps** | Every prompt and response shows when it was created |
| **Debug Timing** | See processing time for each AI response |
| **Unique PnR IDs** | Each prompt-response pair has a unique identifier |

### 🎨 UI/UX
| Feature | Description |
|---------|-------------|
| **Dark/Light Theme** | Toggle between dark and light modes |
| **Accent Colors** | 8 customizable accent colors |
| **PWA Ready** | Install as a Progressive Web App |
| **Responsive Design** | Works on desktop and tablet |
| **Smooth Animations** | Polished transitions and hover effects |

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18** | Modern React with hooks |
| **TypeScript** | Type-safe development |
| **Vite** | Fast build tool |
| **Tailwind CSS** | Utility-first styling |
| **Context API** | State management |
| **Local Storage** | Persistent data |
| **react-markdown** | Markdown rendering |
| **uuid** | Unique ID generation |

## 📦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository (replace <your-user> with your GitHub username)
git clone https://github.com/<your-user>/samvada-studio.git
cd samvada-studio

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment
The app runs at `http://localhost:5173` by default.
```
npm run build
```

# Preview production build
```
npm run preview
```

## 📁 Project Structure

```
src/
├── components/
│   ├── admin/                    # Admin settings
│   │   ├── AdminPanel.tsx        # Provider config modal
│   │   ├── ProviderCard.tsx      # Provider display card
│   │   └── ProviderForm.tsx      # Add/edit provider form
│   ├── chat/
│   │   ├── ChatArea.tsx          # Main chat interface
│   │   ├── ChatSettings.tsx      # Chat configuration modal
│   │   ├── MessageContent.tsx    # Markdown renderer with syntax highlighting
│   │   ├── MessageReactions.tsx  # NEW: Thumbs up/down, bookmark, TTS
│   │   ├── PromptInput.tsx       # Rich text input with voice & tokens
│   │   ├── PromptResponseItem.tsx # Individual PnR component
│   │   ├── TokenCounter.tsx      # NEW: Token estimation & cost
│   │   └── VoiceInput.tsx        # NEW: Speech-to-text input
│   ├── common/
│   │   ├── CommandPalette.tsx    # NEW: Ctrl+K quick actions
│   │   ├── KeyboardShortcuts.tsx # NEW: ? key shortcuts help
│   │   └── SearchBar.tsx         # Reusable search component
│   ├── context/
│   │   └── ContextPanel.tsx      # Custom context panels
│   ├── export/                   # NEW: Export functionality
│   │   └── ExportModal.tsx       # Export chats in multiple formats
│   ├── search/
│   │   └── GlobalSearch.tsx      # Global search with highlighting
│   ├── sidebar/
│   │   ├── ChatListItem.tsx      # Chat list item
│   │   ├── FoldersSection.tsx    # NEW: Organize chats into folders
│   │   └── Sidebar.tsx           # Chat list sidebar
│   └── templates/                # NEW: Prompt templates
│       └── TemplatesLibrary.tsx  # Template CRUD & categories
├── context/
│   └── ChatContext.tsx           # Global state management
├── types/
│   └── index.ts                  # TypeScript definitions
├── utils/
│   ├── helpers.ts                # Utility functions
│   ├── llmService.ts             # Multi-provider LLM service
│   └── storage.ts                # Local storage persistence
├── App.tsx                       # Main app component
├── main.tsx                      # Entry point
└── index.css                     # Global styles & themes
```

## 📖 Usage Guide

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Open command palette |
| `?` | Show keyboard shortcuts help |
| `Ctrl + Enter` | Send message |
| `Shift + Enter` | Send message (in list mode) |
| `Ctrl + M` | Toggle voice input |
| `Ctrl + .` | Read response aloud (TTS) |
| `Ctrl + Shift + F` | Open global search |
| `Ctrl + Shift + E` | Open export modal |
| `Ctrl + Shift + T` | Open templates library |
| `Escape` | Close modals/search |
| `↑/↓` | Navigate search/command results |
| `Enter` | New line / continue list |

### Chat Features
- 🎨 **Theme Toggle**: Click the sun/moon icon in the header to switch themes
- ⚙️ **Chat Settings**: Click the gear icon to configure role, examples, and more
- 📌 **Pin**: Click the pin icon on chats or PnR items
- ⭐ **Star**: Click the star icon to mark important messages
- ↕️ **Collapse**: Click the arrow to minimize/expand PnR items
- 🔄 **Regenerate**: Click regenerate to get a new response (creates drafts)
- ◀️ ▶️ **Draft Navigation**: Navigate between response drafts
- 💬 **Quote**: Click quote button to include response text in your next message
- 👍 **React**: Thumbs up/down to rate responses
- 🔊 **TTS**: Click speaker icon to hear responses read aloud

### Using the Command Palette
1. Press `Ctrl+K` to open the command palette
2. Type to filter available commands
3. Use arrow keys to navigate, Enter to execute
4. Available categories: Chat, Navigation, Settings, Export, Templates

### Using Prompt Templates
1. Click the 📝 Templates button (bottom right) or press `Ctrl+Shift+T`
2. Browse templates by category or search
3. Star frequently used templates as favorites
4. Click a template to insert its content into your prompt
5. Create custom templates with the "New Template" button

### Using Voice Input
1. Click the 🎤 mic button next to send, or press `Ctrl+M`
2. Speak clearly - your words appear in real-time
3. Click again to stop recording
4. Text is automatically appended to your prompt

### Using Chat Folders
1. Folders appear in the sidebar when you create them
2. Click "New Folder" to create a folder with name, color, and icon
3. Drag and drop chats into folders to organize
4. Click folder header to expand/collapse

### Exporting Chats
1. Press `Ctrl+Shift+E` or click the Export button
2. Choose format: Markdown, JSON, HTML, or Plain Text
3. Select specific chats or use "Export All Data" for full backup
4. Toggle "Include timestamps" option as needed

### Context Panel Mode
1. Click the 📄 icon (bottom right) to toggle context panel
2. Add custom context snippets with titles
3. Toggle panels active/inactive as needed
4. Active panels are included in your queries

### Configuring LLM Providers (NEW!)
1. Click the ⚙️ gear icon (bottom right) to open Admin Settings
2. Go to the **Providers** tab
3. Click **+ Add Provider** to configure a new LLM backend
4. Enter your API key and endpoint (pre-filled for common providers)
5. Adjust sandbox settings (temperature, max tokens, etc.)
6. Click **Test Connection** to verify it works
7. Set a provider as default to use it for all new chats

#### Provider Endpoints
| Provider | Default Endpoint |
|----------|-----------------|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| Anthropic | `https://api.anthropic.com/v1/messages` |
| Google | `https://generativelanguage.googleapis.com/v1/models` |
| Ollama | `http://localhost:11434/api/generate` |
| Azure | `https://{resource}.openai.azure.com/...` |

### Bulk Operations
1. Select multiple chats using checkboxes
2. Use "Archive Selected" or "Delete Selected" buttons
3. Toggle "Show Archived" to view archived chats

## 🏗️ Architecture

The app follows **SOLID principles**:

| Principle | Implementation |
|-----------|----------------|
| **Single Responsibility** | Each component has one focused job |
| **Open/Closed** | Easy to extend with new features |
| **Liskov Substitution** | Components are interchangeable |
| **Interface Segregation** | Small, focused TypeScript interfaces |
| **Dependency Inversion** | Context API for loose coupling |

### State Management
- Uses React Context API with `useReducer`
- Actions are typed and predictable
- State persists to localStorage automatically

### Theme System
- Uses Tailwind's `darkMode: 'class'` strategy
- Adds/removes `dark` class on `<html>` element
- All components support both light and dark themes

## 🧪 Development

```bash
# Run development server
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

Built with ❤️ using React, TypeScript, and Tailwind CSS
