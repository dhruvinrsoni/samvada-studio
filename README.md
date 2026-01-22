<div align="center">

# 🗣️ Samvada Studio

### *संवाद स्टूडियो* (Saṃvāda Studio)

**A power-user workspace for designing, testing, and managing conversational AI across multiple LLM providers**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Contributing](#-contributing)

---

</div>

## 📖 What is Samvada Studio?

**Samvada** (संवाद, *Saṃvāda*) means "dialogue" or "conversation" in Sanskrit — reflecting our focus on conversation design and orchestration.

Samvada Studio is a feature-rich LLM Chat UI that combines the **best UX features** from:
- 💎 **Gemini** — Inline editing, drafts
- 💬 **ChatGPT** — Quote text, conversation flow
- 🤖 **GitHub Copilot** — Command palette, keyboard shortcuts
- ✨ **And much more!**

Perfect for **developers**, **prompt engineers**, **researchers**, and **content professionals** who need a powerful, keyboard-first interface for working with AI.

> 💙 **The Origin Story**: Want to know how this started? Read [THE_BEGINNING.md](docs/THE_BEGINNING.md) — the original scribbled feature list that sparked this entire project. It's a story of frustration turned into creation.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm/yarn/pnpm
- Modern browser (Chrome, Edge, Firefox, Safari)

### Installation

```bash
# Clone the repository
git clone https://github.com/dhruvinrsoni/samvada-studio.git
cd samvada-studio

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### First Steps

1. **Configure a Provider** — Click the ⚙️ Admin button → Add OpenAI, Anthropic, or Ollama
2. **Test Connection** — Use the "Test" button to verify your API key
3. **Create a Chat** — Click "New Chat" in the sidebar
4. **Start Conversing** — Type your prompt and press `Ctrl+Enter`

👉 **See [GETTING_STARTED.md](docs/GETTING_STARTED.md) for detailed onboarding**


---

## ✨ Features

> 💡 **What's a PnR?** Throughout this documentation, **PnR** stands for **Prompt and Response** — the fundamental unit of conversation in Samvada Studio. Each PnR represents a complete exchange: your prompt (question/input) and the AI's response(s), along with metadata like stars, pins, timestamps, and drafts.

<details open>
<summary><h3>🎯 Core Features (20+ Production-Ready)</h3></summary>

| Category | Feature | Description |
|----------|---------|-------------|
| **✏️ Editing** | Inline Response Editing | Edit AI responses directly (Gemini-style) |
| | Inline Prompt Editing | Modify your prompts after sending |
| | Drafts & Regenerate | Generate multiple response drafts, switch between them |
| **📌 Organization** | Pin Conversations | Pin important prompt-response pairs |
| | Archive Chats | Archive old chats, toggle archived view |
| | Star Messages | Star individual messages or entire conversations |
| | Chat Folders | Organize chats with drag-drop folders (8 colors, 10 icons) |
| **💬 Prompting** | Markdown Editor | Bold, italic, code, links with toolbar |
| | List Support | Auto-continue numbered & bullet lists |
| | Quote Text | Quote responses in next prompt (ChatGPT-style) |
| | Voice Input | Dictate with speech-to-text (Ctrl+M) |
| | Prompt Templates | Save & reuse common prompts with categories |
| **🔍 Discovery** | Global Search | Search across all chats (Ctrl+Shift+F) |
| | Highlight Matches | Jump to results with highlighting |
| | Command Palette | VS Code-style quick actions (Ctrl+K) |
| **⚙️ Settings** | Chat-Wise Settings | Per-chat role, instructions, examples |
| | Few-Shot Examples | Add input/output example pairs |
| | Always Include/Exclude | Formatting rules per chat |
| | Temperature & Tokens | Fine-tune model parameters |
| **🛠️ Power User** | Keyboard Shortcuts | Full keyboard navigation (press ?) |
| | Bulk Operations | Select multiple chats, bulk delete/archive |
| | Collapsible PnRs | Collapse/expand prompt-response items |
| | Context Panel Mode | Side panel for custom context injection |
| | Copyable PnR IDs | Click to copy unique conversation IDs |
| **📊 Analytics** | Timestamps | On every message and conversation |
| | Processing Time | See how long responses took |
| | Token Counter | Live token count & cost estimation |
| | Debug Info | Processing times and diagnostics |
| **📤 Export** | Multiple Formats | Export as MD, JSON, HTML, TXT |
| | Full Backup | Export all data at once |
| | Code Highlighting | Syntax-highlighted code blocks with copy |

</details>

<details>
<summary><h3>🤖 Multi-Provider LLM Support</h3></summary>

Connect to **6 LLM providers** with unified interface:

| Provider | Models | Type |
|----------|--------|------|
| 🟢 **OpenAI** | GPT-4, GPT-4 Turbo, GPT-3.5 | Cloud API |
| 🟣 **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus | Cloud API |
| 🔵 **Google** | Gemini 1.5 Pro, Gemini 1.5 Flash | Cloud API |
| 🦙 **Ollama** | Llama, Mistral, Code Llama, etc. | Local |
| ☁️ **Azure OpenAI** | Enterprise-hosted models | Cloud API |
| 🔧 **Custom** | Any OpenAI-compatible endpoint | Self-hosted |

**Features:**
- ✅ Per-chat provider selection
- ✅ Test connections before use
- ✅ Set default provider
- ✅ Multiple providers simultaneously
- ✅ Sandbox mode (temperature, top-p, frequency penalty, etc.)

</details>

<details>
<summary><h3>🎨 Theming & Customization</h3></summary>

| Feature | Options |
|---------|---------|
| **Color Modes** | Dark, Light, Auto (follows system) |
| **Accent Colors** | 8 colors (Blue, Purple, Green, Orange, Pink, Cyan, Red, Yellow) |
| **Font Sizes** | Small, Medium, Large |
| **Compact Mode** | Reduce spacing for more content |
| **Custom Themes** | Full CSS variable system |

</details>

<details>
<summary><h3>⌨️ Keyboard Shortcuts</h3></summary>

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command Palette |
| `?` | Keyboard Shortcuts Help |
| `Ctrl+Enter` / `Shift+Enter` | Send Message |
| `Enter` | New line (multi-line mode) |
| `Ctrl+M` | Voice Input |
| `Ctrl+.` | Text-to-Speech |
| `Ctrl+Shift+F` | Global Search |
| `Ctrl+Shift+E` | Export Modal |
| `Ctrl+Shift+T` | Templates Library |
| `↑` / `↓` | Navigate prompt history |

**Press `?` in the app to see all shortcuts!**

</details>

<details>
<summary><h3>📋 Context Panel - Dynamic Context Injection</h3></summary>

The **Context Panel** is a powerful feature that lets you create reusable context snippets that can be included on-demand in your prompts.

**What is it?**
- A side panel for managing custom context pieces
- Store code snippets, documentation, examples, or any reference text
- Toggle individual contexts on/off per prompt
- Include only relevant context instead of repeating yourself

**Use Cases:**
1. **Code Development**: Store API documentation, code style guides, or example implementations
2. **Content Writing**: Save brand voice guidelines, tone examples, or reference materials
3. **Research**: Keep key facts, quotes, or data points readily available
4. **Documentation**: Store technical specs, requirements, or design patterns

**How to Use:**
1. Click the Context Panel button (📋 icon) in the top-right toolbar
2. Click "+ New Panel" and give it a descriptive name
3. Add your context text in the editor
4. Toggle the checkbox to activate/deactivate the context
5. Active contexts are automatically included with your prompts

**Example:**
```
Panel: "Python Best Practices"
✅ Active

Content:
- Use type hints for all function parameters
- Follow PEP 8 style guide
- Prefer list comprehensions over map/filter
- Use context managers (with) for resources
```

When this panel is active, all your prompts will include these guidelines, ensuring consistent responses without retyping them each time!

**Tips:**
- Create panels for different programming languages, frameworks, or domains
- Use descriptive names to easily find the right context
- Keep panels focused - one topic per panel works best
- Toggle panels off when they're not relevant to save tokens

</details>

---

## 📚 Documentation

### 🚀 Getting Started
| Document | Description |
|----------|-------------|
| [🚀 GETTING_STARTED.md](docs/GETTING_STARTED.md) | Step-by-step onboarding guide |
| [💙 THE_BEGINNING.md](docs/THE_BEGINNING.md) | **The origin story** — How frustration became creation |
| [📊 FEATURE_COMPLETION.md](docs/FEATURE_COMPLETION.md) | **Vision vs Reality** — 20/20 features shipped!

### 📖 Features & Guides
| Document | Description |
|----------|-------------|
| [📋 FEATURES.md](docs/FEATURES.md) | Complete feature documentation with examples |
| [💾 PERSISTENCE.md](docs/PERSISTENCE.md) | How data is saved and restored |
| [🔒 CONTENT_SANITIZATION.md](docs/CONTENT_SANITIZATION.md) | Content security and validation |
| [🐛 TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions |

### 🏗️ Technical Documentation
| Document | Description |
|----------|-------------|
| [🔌 LLM_PROVIDERS.md](docs/LLM_PROVIDERS.md) | How to add new LLM providers (with checklist) |
| [🔮 FUTURE_PROOF_DESIGN.md](docs/FUTURE_PROOF_DESIGN.md) | Architecture philosophy and maintainable patterns |
| [🔐 SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) | Security-first approach, Privacy by Design |

### 🤝 Contributing
| Document | Description |
|----------|-------------|
| [🤝 CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute to the project |
| [🤖 copilot-security-enforcement.md](.github/copilot-security-enforcement.md) | Proactive security enforcement rules |
| [🎯 copilot-design-philosophy.md](.github/copilot-design-philosophy.md) | Pattern enforcement and best practices |

### 🎨 Branding & Story
| Document | Description |
|----------|-------------|
| [🎨 BRAND.md](docs/BRAND.md) | Naming, etymology, and brand guidelines |
| [📱 LINKEDIN_POST.md](docs/LINKEDIN_POST.md) | Ready-to-use social media content & Notion outline |

---

## 🏗️ Architecture

```
Samvada Studio
├── 🎨 UI Layer (React 18 + TypeScript)
│   ├── Sidebar (chats, folders, search)
│   ├── ChatArea (conversations, provider selection)
│   ├── PromptInput (smart input with markdown)
│   └── Admin (provider management)
│
├── 🧠 State Management (Context + Reducer)
│   └── ChatContext — Single source of truth
│
├── 🔧 Business Logic
│   ├── llmService.ts — Provider adapters
│   ├── storage.ts — Safe persistence
│   ├── helpers.ts — Utilities
│   └── contentSanitizer.ts — Security
│
└── 💾 Persistence (localStorage)
    ├── Chats & conversations
    ├── Provider configs (API keys encoded)
    ├── Templates & folders
    └── User preferences
```

**Key Design Decisions:**
- ✅ **Offline-first** — Works without backend
- ✅ **No database required** — Everything in localStorage
- ✅ **Privacy-focused** — API keys stay in your browser
- ✅ **Extensible** — Easy to add new providers

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 18.3** | UI framework with Hooks |
| **TypeScript 5.6** | Type-safe development |
| **Vite 6.0** | Lightning-fast build tool |
| **Tailwind CSS 3.4** | Utility-first styling |
| **Web Speech API** | Voice input & TTS |
| **React Markdown** | Markdown rendering |
| **UUID** | Unique ID generation |

---

## 🎯 Roadmap

### ✅ Completed (v1.0)
- [x] Multi-provider LLM support (6 providers)
- [x] 20+ core features implemented
- [x] Keyboard shortcuts & command palette
- [x] Voice input & text-to-speech
- [x] Export in 4 formats
- [x] Theme customization
- [x] Token counter & cost estimation

### 🚧 In Progress
- [ ] Image generation support (DALL-E, Midjourney)
- [ ] Conversation branching & tree view
- [ ] Cloud sync (optional)
- [ ] Browser extension

### 🔮 Future (Samvada Suite)
- **Samvada Labs** — A/B testing & experimentation module
- **Samvada Hub** — Enterprise connectors & team features
- **Samvada Forge** — Custom model fine-tuning

---

## 🤝 Contributing

We welcome contributions! Whether it's:
- 🐛 Bug reports
- 💡 Feature requests
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🔧 Code contributions

**See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.**

---

## 📜 License

**MIT License** — See [LICENSE](LICENSE) for details.

---

## 💬 Community & Support

- 🐛 **Issues** — [GitHub Issues](https://github.com/dhruvinrsoni/samvada-studio/issues)
- 💡 **Discussions** — [GitHub Discussions](https://github.com/dhruvinrsoni/samvada-studio/discussions)
- 📧 **Contact** — [@dhruvinrsoni](https://github.com/dhruvinrsoni)

---

## 🙏 Acknowledgments

Samvada Studio is inspired by the best features from:
- **Google Gemini** — Inline editing and drafts
- **ChatGPT** — Conversation flow and quote functionality
- **GitHub Copilot** — Command palette and keyboard-first UX
- **VS Code** — Keyboard shortcuts and command system

Special thanks to the open-source community for amazing tools like React, Vite, and Tailwind CSS.

---

<div align="center">

**Made with ❤️ by [Dhruvin Soni](https://github.com/dhruvinrsoni)**

*"संवाद करें, सीखें, बढ़ें"* (Converse, Learn, Grow)

⭐ **Star this repo if you find it useful!** ⭐

</div>

### 🎯 Smart Input Features
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
