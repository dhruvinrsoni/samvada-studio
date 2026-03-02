# 📜 Changelog

All notable changes to Samvada Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **AI Memory**: Extracts preferences from conversations and injects them into future prompts. Configurable Ollama extraction provider, auto-compact when full, manual entry management in Admin → Memory tab.
- **Compact mode overhaul**: Tailwind `compact:` variant (`html.compact &`) applied across ChatArea, PromptInput, PromptResponseItem, ThemeSettingsModal — dramatic density difference between normal and compact mode.
- **Shared Toggle component** (`src/components/ui/Toggle.tsx`): WAI-ARIA switch, compact-aware auto-sizing (sm/md), dark-mode via Tailwind `dark:` variants.
- **Context utilization in title bar**: Token/context bar moved from input footer to chat title bar (hidden on mobile; shown in Chat Settings modal on mobile).
- **Theme tint on PnR headers**: Collapsible headers show `bg-theme-primary/10` base tint for visual navigation cues while scrolling.

### Fixed
- **Compact mode Toggle distortion**: CSS `min-height: 32px !important` was inflating `<button role="switch">` beyond its track size. Fixed by removing the rule; layout now handled entirely by `compact:` Tailwind classes.
- **Dead compact CSS**: Selectors targeting `.chat-area`, `.sidebar`, `.modal`, `.prompt-response-item` matched no elements (classes don't exist on JSX). Replaced with per-component `compact:` variant classes.

---

## [1.0.0] - 2026-01-22

### 🎉 Initial Release

The first public release of Samvada Studio — a power-user workspace for conversational AI.

### ✨ Added

#### 🤖 Multi-Provider Support
- OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Google (Gemini 1.5 Pro, Gemini 1.5 Flash)
- Ollama (Local models: Llama, Mistral, Code Llama)
- Azure OpenAI (Enterprise)
- Custom providers (OpenAI-compatible endpoints)

#### ✏️ Editing Features
- Inline prompt editing (edit after sending)
- Inline response editing (Gemini-style)
- Drafts & regenerate (multiple response versions)
- Draft navigation (switch between versions)

#### 📌 Organization
- Pin conversations (keep important chats at top)
- Archive chats (hide old conversations)
- Star messages (bookmark individual messages)
- Star entire conversations (PnR starring)
- Chat folders (8 colors, 10 icons, drag-drop)
- Auto-generated chat titles (from first prompt)

#### 💬 Advanced Prompting
- Markdown toolbar (Bold, Italic, Code, Links)
- Numbered & bullet list support (auto-continue)
- Quote text feature (ChatGPT-style)
- Voice input (Ctrl+M, speech-to-text)
- Prompt templates (save & reuse common prompts)
- Template categories (General, Code, Writing, Analysis, Creative)
- Context panel mode (inject custom context)

#### 🔍 Discovery
- Global search (Ctrl+Shift+F, search all chats)
- Search highlighting (matched text highlighted)
- Navigate to results (jump directly to messages)
- Command palette (Ctrl+K, VS Code-style)
- Keyboard navigation (arrow keys, Enter to select)

#### ⚙️ Chat Settings
- Per-chat system role
- Custom instructions
- Always include/exclude keywords
- Few-shot examples (input/output pairs)
- Temperature control
- Max tokens setting
- Provider override per chat

#### 🛠️ Power User Features
- Full keyboard shortcuts (press `?` to view all)
- Bulk operations (select multiple chats)
- Bulk delete/archive
- Collapsible PnRs (expand/collapse conversations)
- Copyable PnR IDs (click to copy unique ID)
- Multi-line mode (Enter for newline, Ctrl+Enter to send)
- Prompt history navigation (↑/↓ arrows)

#### 📊 Analytics & Debug
- Timestamps on all messages
- Processing time display
- Token counter (live estimation)
- Cost estimation per model
- Chat statistics (tokens, messages, cost)
- Debug information panel

#### 📤 Export & Backup
- Export to Markdown
- Export to JSON
- Export to HTML
- Export to Plain Text
- Single chat export
- Multi-chat export
- Full data backup
- Timestamps inclusion option

#### 🎨 Theming
- Dark mode
- Light mode
- Auto mode (follows system)
- 8 accent colors (Blue, Purple, Green, Orange, Pink, Cyan, Red, Yellow)
- 3 font sizes (Small, Medium, Large)
- Compact mode
- Custom CSS variables

#### ⌨️ Keyboard Shortcuts
- `Ctrl+K` — Command Palette
- `?` — Keyboard Shortcuts Help
- `Ctrl+Enter` / `Shift+Enter` — Send Message
- `Enter` — New line (multi-line mode)
- `Ctrl+M` — Voice Input
- `Ctrl+.` — Text-to-Speech
- `Ctrl+Shift+F` — Global Search
- `Ctrl+Shift+E` — Export Modal
- `Ctrl+Shift+T` — Templates Library
- `↑` / `↓` — Navigate prompt history

#### 🔒 Security
- 3-layer content sanitization system
- API key encoding (localStorage)
- XSS protection
- Content validation on load
- Malformed content recovery

#### 💾 Persistence
- Automatic localStorage sync
- Chat history persistence
- Provider configurations saved (API keys encoded)
- Templates & folders persistence
- Theme preferences saved
- Hydration guards (prevents race conditions)

#### 📚 Documentation
- Comprehensive README with badges
- Getting Started guide
- Contributing guidelines
- Features documentation
- Troubleshooting guide
- Content sanitization docs
- Persistence documentation
- Brand guidelines

### 🐛 Fixed
- Starred messages modal crash with malformed content
- Date serialization issues (Date → string in localStorage)
- Duplicate function declarations
- TypeScript compilation errors
- Content sanitization edge cases

### 🔧 Technical
- React 18.3 with TypeScript 5.6
- Vite 6.0 build system
- Tailwind CSS 3.4 for styling
- Web Speech API integration
- React Markdown rendering
- UUID for unique IDs
- Offline-first architecture

---

## [Unreleased]

### 🚧 Planned Features

#### Short Term (Next Release)
- [ ] Image generation support (DALL-E, Midjourney)
- [ ] Conversation branching & tree view
- [ ] Prompt comparison (side-by-side)
- [ ] Advanced token usage analytics
- [ ] Conversation import/export (from ChatGPT)

#### Medium Term
- [ ] Cloud sync (optional)
- [ ] Browser extension
- [ ] Mobile PWA optimizations
- [ ] Collaborative chats (share conversations)
- [ ] API rate limiting visualization

#### Long Term (Samvada Suite)
- [ ] **Samvada Labs** — A/B testing & experimentation module
- [ ] **Samvada Hub** — Enterprise connectors & team features
- [ ] **Samvada Forge** — Custom model fine-tuning

---

## How to Read This Changelog

### Types of Changes

- **Added** — New features
- **Changed** — Changes to existing functionality
- **Deprecated** — Soon-to-be removed features
- **Removed** — Removed features
- **Fixed** — Bug fixes
- **Security** — Security improvements

### Version Numbers

We use **Semantic Versioning** (MAJOR.MINOR.PATCH):
- **MAJOR** — Incompatible API changes
- **MINOR** — New backwards-compatible functionality
- **PATCH** — Backwards-compatible bug fixes

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute to this project.

---

<div align="center">

**Samvada Studio** — *संवाद करें, सीखें, बढ़ें* (Converse, Learn, Grow)

</div>
