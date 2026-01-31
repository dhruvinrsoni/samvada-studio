<div align="center">

# 🗣️ Samvada Studio

### *संवाद स्टूडियो* (Saṃvāda Studio)

**The LLM Chat UI that combines Gemini + ChatGPT + Copilot**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)


[![Product Hunt](https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1067197&type=badge)](https://www.producthunt.com/products/samvada-studio)

**[🌐 Try Online](https://dhruvinrsoni.github.io/samvada-studio/) • [✨ Features](#-features) • [🚀 Quick Start](#-quick-start) • [📚 Docs](#-documentation) • [🤝 Contributing](#-contributing)**

</div>

---

## 🌐 Try it Online

**🚀 Live Demo**: [https://dhruvinrsoni.github.io/samvada-studio/](https://dhruvinrsoni.github.io/samvada-studio/)

No installation needed! Try Samvada Studio directly in your browser. All data stays local on your device.

> 📱 **Install as App**: Click the install prompt or visit Settings to install as a Progressive Web App for offline access!

> ⚠️ **Hosted Version Limitations**: The online version supports OpenAI, Anthropic, Google, and Azure providers. Local providers (Ollama) and custom CORS proxy features require running the app locally.

---

## 📖 What is Samvada?

> **Samvada** (संवाद, *Saṃvāda*) means "dialogue" or "conversation" in Sanskrit

**Samvada Studio** is a power-user workspace for conversational AI that brings together the **best UX features** from leading platforms:

Fully Vibe Coded

<table>
<tr>
<td align="center">💎<br><b>Gemini</b><br><sub>Inline editing, drafts</sub></td>
<td align="center">💬<br><b>ChatGPT</b><br><sub>Quote text, archiving</sub></td>
<td align="center">🤖<br><b>Copilot</b><br><sub>Command palette, shortcuts</sub></td>
<td align="center">✨<br><b>And More!</b><br><sub>Voice, templates, folders</sub></td>
</tr>
</table>

> 📱 **Install as App**: Samvada Studio is a **Progressive Web App (PWA)** — [install it](docs/PWA_GUIDE.md) for a faster, app-like experience with offline support!

**Perfect for:**
- 👨‍💻 **Developers** who need keyboard-first interfaces
- 🎯 **Prompt engineers** testing multiple providers
- 🔬 **Researchers** organizing complex conversations
- ✍️ **Content professionals** who value privacy & control

> 💙 **The Origin Story**: This started as a frustrated backend engineer's side project. Read [THE_BEGINNING.md](docs/THE_BEGINNING.md) to see the original scribbled feature list that sparked it all.

---

## 🤖 Development Approach

**Built with AI Assistance (Vibe Coding)**

This project was developed using **AI-assisted development** (what we call "vibe coding"):

- ✨ **First Draft**: The initial implementation was generated from a single comprehensive prompt
- 🔄 **Iterative Refinement**: Each feature was then manually refined, tested, and enhanced
- 🎯 **Human-Led**: All architectural decisions, UX choices, and feature priorities were human-driven
- 🧠 **AI as Tool**: AI accelerated coding, but every line was reviewed and approved

**Why we're transparent about this:**
- 🔓 **Honesty First**: We believe in being truthful about our development process
- 🚀 **Celebrate Innovation**: AI-assisted development is a skill, not a shortcut
- 📚 **Share Knowledge**: Others can learn from our approach
- 💪 **Quality Matters**: The tool doesn't matter — the result does

**What AI helped with:**
- 🏗️ Initial component scaffolding
- 🔧 Boilerplate code generation
- 🐛 Bug identification and fixes
- 📝 Documentation drafts

**What humans did:**
- 🎨 All UX/UI design decisions
- 🔐 Security architecture and review
- ✅ Testing and quality assurance
- 📋 Feature prioritization
- 🎯 Product vision and direction

> **The Result**: A production-ready, fully-functional LLM chat interface with 37+ features, built in record time without compromising on quality. This is what modern development looks like.

---

## 🚀 Quick Start

### **Option 1: Use Online (Recommended)**

🌐 **[Launch Samvada Studio](https://dhruvinrsoni.github.io/samvada-studio/)** — No installation required!

### **Option 2: Run Locally**

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

<details>
<summary><b>🎬 First-Time Setup (click to expand)</b></summary>

### Step 1: Configure a Provider
1. Click the ⚙️ gear icon (bottom-right) to open Admin Settings
2. Go to **Providers** tab
3. Click **+ Add Provider**
4. Choose your provider (OpenAI, Anthropic, Google, Ollama, Azure, Custom)
5. Enter your API key
6. **For OpenAI/Anthropic**: Configure CORS proxy (see [CORS Proxy Guide](docs/CORS_PROXY.md))
7. Click **Test Connection** to verify

### Step 2: Create Your First Chat
1. Click **New Chat** in the sidebar
2. Type your prompt
3. Press `Ctrl+Enter` to send
4. Magic happens! ✨

### Step 3: Explore Power Features
- Press **?** to see all keyboard shortcuts
- Press **Ctrl+K** for the command palette
- Press **Ctrl+M** to use voice input
- Check out [GETTING_STARTED.md](docs/GETTING_STARTED.md) for deep dive

</details>

## ✨ Features

> 💡 **What's a PnR?** Throughout Samvada, **PnR** = **Prompt and Response** — the fundamental unit of conversation. Each PnR includes your prompt, AI response(s), stars, pins, timestamps, and drafts.

### 🎯 35+ Power-User Features

<details open>
<summary><b>✏️ Editing & Iteration</b></summary>

| Feature | Description | Inspired By |
|---------|-------------|-------------|
| **Inline Response Editing** | Edit AI responses directly | 💎 Gemini |
| **Inline Prompt Editing** | Modify your prompts after sending | Custom |
| **Drafts & Regenerate** | Multiple response versions | 💎 Gemini |
| **Quote Text** | Quote responses in next prompt | 💬 ChatGPT |

</details>

<details>
<summary><b>📁 Organization & Management</b></summary>

| Feature | Description |
|---------|-------------|
| **Chat Folders** | Organize with 8 colors, 10 icons, drag-drop |
| **Pin Conversations** | Pin important PnRs for quick access |
| **Archive System** | Archive old chats, toggle archived view |
| **Star Messages** | Star individual messages or entire PnRs |
| **Bulk Operations** | Select multiple chats, bulk delete/archive |
| **Collapsible PnRs** | Collapse/expand with preview headers |

</details>

<details>
<summary><b>💬 Smart Prompting</b></summary>

| Feature | Description |
|---------|-------------|
| **Markdown Editor** | Bold, italic, code, links with toolbar |
| **List Auto-Continue** | Type "1." or "-" to enable list mode |
| **Voice Input** | Speech-to-text dictation (`Ctrl+M`) |
| **Prompt Templates** | Save & reuse with categories |
| **Context Panels** | Reusable context snippets (code, docs, guidelines) |
| **Token Counter** | Live token count + cost estimation |

</details>

<details>
<summary><b>🔍 Discovery & Navigation</b></summary>

| Feature | Description | Inspired By |
|---------|-------------|-------------|
| **Command Palette** | VS Code-style quick actions (`Ctrl+K`) | 🤖 Copilot |
| **Global Search** | Search across all chats (`Ctrl+Shift+F`) | Custom |
| **Keyboard Shortcuts** | Full keyboard control (press `?`) | 🤖 Copilot |
| **Prompt History** | Navigate with `↑` / `↓` arrows | Terminal |

</details>

<details>
<summary><b>⚙️ Advanced Configuration</b></summary>

| Feature | Description |
|---------|-------------|
| **Chat-Wise Settings** | Role, instructions, examples per chat |
| **Few-Shot Examples** | Input/output example pairs for context |
| **Formatting Profiles** | 5 presets + custom profiles (Technical, Concise, Academic, Creative, Code-only) |
| **Always Include/Exclude** | Per-chat formatting rules and content filters |
| **Sandbox Parameters** | Temperature, tokens, top-p, penalties |
| **Per-Chat Providers** | Switch LLMs mid-conversation |
| **Connection Health Monitor** | Real-time provider connectivity status with troubleshooting |

</details>

<details>
<summary><b>📤 Export & Backup</b></summary>

| Format | Features |
|--------|----------|
| **Markdown** | Clean, readable format |
| **JSON** | Full data structure |
| **HTML** | Styled, shareable |
| **Plain Text** | Simple export |

**Options:** Include/exclude timestamps, export all or selected chats

</details>

<details>
<summary><b>🎨 Theming & UI</b></summary>

| Feature | Options |
|---------|---------|
| **Color Modes** | Dark, Light, Auto (system) |
| **Accent Colors** | 8 themes (Blue, Purple, Green, Orange, Pink, Cyan, Red, Yellow) |
| **Font Sizes** | Small, Medium, Large |
| **Compact Mode** | Reduce spacing |
| **Animations** | Smooth transitions |
| **Code Highlighting** | Syntax highlighting with copy buttons |
| **Message Reactions** | Thumbs up/down, bookmark, TTS |
| **Responsive Design** | Mobile, tablet, desktop with collapsible sidebar and burger menu |
| **Theme-Colored UI** | Top bar gradient accent, branded text effects, live preview panel |

</details>

<details>
<summary><b>🤖 Multi-Provider LLM Support</b></summary>

Connect to **6 providers** with unified interface:

| Provider | Models | Type | Best For |
|----------|--------|------|----------|
| 🟢 **OpenAI** | GPT-4, GPT-4 Turbo, GPT-3.5 | Cloud | General purpose |
| 🟣 **Anthropic** | Claude 3.5 Sonnet, Opus | Cloud | Long context |
| 🔵 **Google** | Gemini 1.5 Pro, Flash | Cloud | Fast, free tier |
| 🦙 **Ollama** | Llama, Mistral, CodeLlama | Local | Privacy++ |
| ☁️ **Azure OpenAI** | Enterprise GPT-4 | Cloud | Enterprise |
| 🔧 **Custom** | Any OpenAI-compatible | Self-hosted | Full control |

**Features:**
- Switch providers mid-conversation
- Test connections before use
- Set defaults per chat
- Run multiple providers simultaneously

**🔧 CORS Proxy Support (NEW!):**
- OpenAI & Anthropic require CORS proxy for browser use
- Built-in local proxy server: `npm run proxy`
- SSL bypass support for corporate networks: `npm run proxy:insecure`
- Automatic proxy routing when configured
- **📖 [Setup Guide](docs/CORS_PROXY.md)**

**🌐 Local Network Access (NEW!):**
- One-click permission management for local LLM servers
- Full control over localhost access (no browser settings needed)
- Auto-detect Ollama and prompt for permission on first use
- Grant, revoke, or reset permissions anytime
- Test connections directly from Admin settings
- **📖 [Complete Guide](docs/LOCAL_NETWORK_ACCESS.md)**

</details>

<details>
<summary><b>🔍 Connection Health Monitor (CHM)</b></summary>

**Real-time connectivity monitoring with smart troubleshooting**

The **Connection Health Monitor** is a floating notification popup that appears in the bottom-right corner when LLM provider connectivity issues are detected.

### ✨ Key Features
- **Smart Detection**: Monitors Ollama, internet connectivity, and provider health
- **Expandable Details**: Click to see troubleshooting steps and status
- **Auto-Recovery**: Checks every 30 seconds with exponential backoff
- **Provider-Specific**: Different checks for local (Ollama) vs cloud providers
- **Minimizable**: Can be minimized to status bar or dismissed

### 🎯 What It Monitors
| Provider Type | What It Checks | Status Shown |
|---------------|----------------|--------------|
| **Ollama (Local)** | Service running + model installed | "Ollama Not Running" |
| **Cloud Providers** | API connectivity + auth | "Provider Offline" |
| **Internet** | Browser online status | "Offline" |

### 📖 Troubleshooting Integration
When issues are detected, CHM shows:
- **Problem Description**: Clear explanation of what's wrong
- **Fix Steps**: Step-by-step resolution instructions
- **Quick Actions**: Direct links to relevant settings
- **Status Details**: Response times, last checked timestamps

**📖 [Health Monitoring Guide](docs/HEALTH_MONITORING.md)**

</details>

<details>
<summary><b>⌨️ Complete Keyboard Shortcuts</b></summary>

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command Palette |
| `?` | Shortcuts Help |
| `Ctrl+Enter` / `Shift+Enter` | Send Message |
| `Enter` | New line |
| `Ctrl+M` | Voice Input |
| `Ctrl+.` | Text-to-Speech |
| `Ctrl+Shift+F` | Global Search |
| `Ctrl+Shift+E` | Export Modal |
| `Ctrl+Shift+T` | Templates Library |
| `↑` / `↓` | Navigate History |
| `Escape` | Close Modals |

**Press `?` in the app to see all shortcuts!**

</details>

---

## 📚 Documentation

<details>
<summary><b>🚀 Getting Started</b></summary>

| Document | Description |
|----------|-------------|
| [🚀 GETTING_STARTED.md](docs/GETTING_STARTED.md) | Step-by-step onboarding guide |
| [💙 THE_BEGINNING.md](docs/THE_BEGINNING.md) | **The origin story** — How this all started |
| [📊 FEATURE_COMPLETION.md](docs/FEATURE_COMPLETION.md) | **Vision vs Reality** — 20/20 features shipped! |

</details>

<details>
<summary><b>📖 Features & Guides</b></summary>

| Document | Description |
|----------|-------------|
| [📋 FEATURES.md](docs/FEATURES.md) | Complete feature documentation with examples |
| [💎 FORMATTING_PROFILES_GUIDE.md](docs/FORMATTING_PROFILES_GUIDE.md) | Complete guide to formatting profiles |
| [🔌 CORS_PROXY.md](docs/CORS_PROXY.md) | **IMPORTANT:** OpenAI & Anthropic setup with CORS proxy |
| [🌐 LOCAL_NETWORK_ACCESS.md](docs/LOCAL_NETWORK_ACCESS.md) | Local network permission management for Ollama & local LLMs |
| [🦙 OLLAMA_CONNECTIVITY.md](docs/OLLAMA_CONNECTIVITY.md) | **Production-grade** Ollama auto-discovery & configuration |
| [🔄 OLLAMA_AUTO_DISCOVERY_E2E.md](docs/OLLAMA_AUTO_DISCOVERY_E2E.md) | **End-to-End** Ollama auto-discovery (auto-configures everything!) |
| [🛡️ ERROR_PREVENTION_GUIDE.md](docs/ERROR_PREVENTION_GUIDE.md) | **CRITICAL:** How we prevent component errors from crashing the app |
| [�🔄 OLLAMA_DHCP_DETECTION.md](docs/OLLAMA_DHCP_DETECTION.md) | DHCP-aware Ollama detection (mobile/LAN access) |
| [🏥 CHM_CONNECTION_HEALTH_MONITOR.md](docs/CHM_CONNECTION_HEALTH_MONITOR.md) | **CHM** - Connection Health Monitor deep dive |
| [📱 PWA_GUIDE.md](docs/PWA_GUIDE.md) | Progressive Web App installation & offline guide |
| [💾 PERSISTENCE.md](docs/PERSISTENCE.md) | How data is saved and restored |
| [🔒 CONTENT_SANITIZATION.md](docs/CONTENT_SANITIZATION.md) | Content security and validation |
| [🐛 TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions |

</details>

<details>
<summary><b>🏗️ Technical Documentation</b></summary>

| Document | Description |
|----------|-------------|
| [🔌 LLM_PROVIDERS.md](docs/LLM_PROVIDERS.md) | How to add new LLM providers |
| [🔮 FUTURE_PROOF_DESIGN.md](docs/FUTURE_PROOF_DESIGN.md) | Architecture philosophy |
| [🔐 SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) | Security-first approach |

</details>

<details>
<summary><b>🤝 Contributing</b></summary>

| Document | Description |
|----------|-------------|
| [🤝 CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [🤖 copilot-security-enforcement.md](.github/copilot-security-enforcement.md) | Security enforcement rules |
| [🎯 copilot-design-philosophy.md](.github/copilot-design-philosophy.md) | Design patterns & best practices |

</details>

<details>
<summary><b>🎨 Branding & Story</b></summary>

| Document | Description |
|----------|-------------|
| [🎨 BRAND.md](docs/BRAND.md) | Naming, etymology, brand guidelines |
| [📱 LINKEDIN_POST.md](docs/LINKEDIN_POST.md) | Social media content ideas |

</details>

---

## 🏗️ Architecture & Tech Stack

<details>
<summary><b>🛠️ Tech Stack</b></summary>

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3 | UI framework with Hooks |
| **TypeScript** | 5.6 | Type-safe development |
| **Vite** | 6.0 | Lightning-fast build tool |
| **Tailwind CSS** | 3.4 | Utility-first styling |
| **Web Speech API** | Native | Voice input & text-to-speech |
| **React Markdown** | Latest | Markdown rendering |
| **UUID** | Latest | Unique ID generation |

</details>

<details>
<summary><b>📐 Architecture Overview</b></summary>

```
Samvada Studio
│
├── 🎨 UI Layer (React 18 + TypeScript)
│   ├── Sidebar — Chats, folders, search
│   ├── ChatArea — Conversations, provider selection
│   ├── PromptInput — Smart input with markdown
│   ├── Admin — Provider management
│   └── Modals — Command palette, templates, export
│
├── 🧠 State Management (Context API + useReducer)
│   └── ChatContext — Single source of truth
│
├── 🔧 Business Logic
│   ├── llmService.ts — Multi-provider abstraction
│   ├── storage.ts — Safe localStorage wrapper
│   ├── helpers.ts — Utility functions
│   └── contentSanitizer.ts — Input validation
│
└── 💾 Persistence (localStorage)
    ├── Chats & conversations
    ├── Provider configs (API keys in memory)
    ├── Templates & folders
    └── User preferences
```

**Design Principles (SOLID):**
- ✅ **Single Responsibility** — Each component does one thing well
- ✅ **Open/Closed** — Easy to extend, hard to break
- ✅ **Dependency Inversion** — Abstractions over implementations

**Key Decisions:**
- 🔒 **Offline-first** — No backend required
- 🔐 **Privacy by default** — API keys stay in your browser
- ⚡ **Fast** — Vite for instant HMR, Tailwind for zero runtime
- 🧩 **Extensible** — Add new providers in 20 minutes

</details>

<details>
<summary><b>📁 Project Structure</b></summary>

```
src/
├── components/
│   ├── admin/          # Provider configuration
│   ├── chat/           # Chat interface & messages
│   ├── common/         # Command palette, shortcuts
│   ├── context/        # Context panels
│   ├── export/         # Export modal
│   ├── search/         # Global search
│   ├── sidebar/        # Sidebar & folders
│   ├── starred/        # Starred messages
│   └── templates/      # Template library
├── context/
│   ├── ChatContext.tsx # Global state management
│   └── ToastContext.tsx # Toast notifications
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
│   ├── llmService.ts   # Multi-provider LLM abstraction
│   ├── storage.ts      # localStorage wrapper
│   └── helpers.ts      # General utilities
└── constants/          # App constants
```

</details>

---

## 🗺️ Roadmap

<details open>
<summary><b>✅ Version 1.0 — Shipped!</b></summary>

- [x] Multi-provider LLM support (6 providers)
- [x] Inline editing for prompts & responses
- [x] Drafts & regenerate responses
- [x] Chat folders with drag-drop
- [x] Prompt templates library
- [x] Voice input & text-to-speech
- [x] Command palette (Ctrl+K)
- [x] Keyboard shortcuts system
- [x] Export (MD/JSON/HTML/TXT)
- [x] Context panels
- [x] Global search
- [x] Message reactions
- [x] Archive & pin chats
- [x] Bulk operations
- [x] Per-chat formatting profiles (5 presets + custom)
- [x] Theme customization (8 colors)
- [x] Token counter & cost estimation
- [x] **PWA Support** — Install as app, offline support, auto-updates

</details>

<details>
<summary><b>🚧 Version 2.0 — In Progress</b></summary>

- [ ] **Image Generation** — DALL-E, Midjourney, Stable Diffusion
- [ ] **Conversation Branching** — Tree view for alternate paths
- [ ] **Cloud Sync** — Optional backup to cloud (privacy-first)
- [ ] **Browser Extension** — Chrome/Firefox extension
- [ ] **Collaborative Features** — Share chats & templates
- [ ] **Advanced Search** — Full-text search with filters
- [ ] **Custom Themes** — User-created color schemes

</details>

<details>
<summary><b>🔮 Future — Samvada Suite</b></summary>

**Samvada Labs**
- A/B testing for prompts
- Experimentation framework
- Performance benchmarking

**Samvada Hub**
- Enterprise connectors
- SSO integration
- Team management
- Audit logs

**Samvada Forge**
- Custom model fine-tuning
- Dataset management
- Training pipelines

</details>

---

## 🤝 Contributing

We welcome contributions of all kinds!

<details>
<summary><b>Ways to Contribute</b></summary>

- 🐛 **Bug Reports** — Found something broken? Open an issue
- 💡 **Feature Requests** — Have an idea? We'd love to hear it
- 📝 **Documentation** — Help improve our docs
- 🎨 **UI/UX** — Design enhancements, accessibility
- 🔧 **Code** — Pull requests welcome!
- 🌍 **Translations** — Help us go global
- ⭐ **Spread the Word** — Star, share, tweet!

</details>

<details>
<summary><b>Quick Start for Contributors</b></summary>

```bash
# Fork the repo, then:
git clone https://github.com/dhruvinrsoni/samvada-studio.git
cd samvada-studio
npm install
npm run dev

# Create a branch
git checkout -b feature/amazing-feature

# Make your changes, then:
git commit -m "Add amazing feature"
git push origin feature/amazing-feature

# Open a Pull Request!
```

**See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.**

</details>

---

## 💬 Community & Support

<table>
<tr>
<td align="center">🐛<br><b><a href="https://github.com/dhruvinrsoni/samvada-studio/issues">Issues</a></b><br><sub>Bug reports & feature requests</sub></td>
<td align="center">💡<br><b><a href="https://github.com/dhruvinrsoni/samvada-studio/discussions">Discussions</a></b><br><sub>Questions & community chat</sub></td>
<td align="center">📧<br><b><a href="https://github.com/dhruvinrsoni">Contact</a></b><br><sub>Reach out to the maintainer</sub></td>
</tr>
</table>

---

## 📜 License

**MIT License** — Free to use for personal or commercial projects. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

**Inspired by the best features from:**
- 💎 **Google Gemini** — Inline editing, drafts, conversation flow
- 💬 **ChatGPT** — Quote functionality, archiving, UX patterns
- 🤖 **GitHub Copilot** — Command palette, keyboard-first design
- 🔵 **VS Code** — Shortcuts system, command infrastructure

**Built with amazing open-source tools:**
- React, TypeScript, Vite, Tailwind CSS, and many more

**Special thanks to:**
- The open-source community for inspiration and tools
- Early users and contributors for feedback and support
- You, for checking out Samvada Studio! ⭐

---

<div align="center">

**Made with ❤️ by [Dhruvin Soni](https://github.com/dhruvinrsoni)**

*"संवाद करें, सीखें, बढ़ें"*  
*(Converse, Learn, Grow)*

---

### ⭐ Star this repo if you find it useful!

[![GitHub stars](https://img.shields.io/github/stars/dhruvinrsoni/samvada-studio?style=social)](https://github.com/dhruvinrsoni/samvada-studio/stargazers)

---

</div>
