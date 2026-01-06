# Samvada Studio - Copilot Instructions

## Project Overview
A feature-rich LLM Chat UI application with the best UX features from Gemini, ChatGPT, Copilot, and more.

## Tech Stack
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Context API + useReducer (state management)
- Web Speech API (voice input/TTS)
- PWA-ready

## Key Features

### Core Chat Features
1. Inline response editing (Gemini-style)
2. Drafts and regenerate responses
3. Archive chats
4. Pin prompt-responses
5. Markdown editor for prompts
6. Collapsible chat items with headers
7. Form-based prompt configuration (role, examples)
8. Global search with highlighting
9. Bulk chat operations (delete, archive)
10. Ctrl+Enter to send, Enter for newline
11. Timestamps and debug timing info
12. Star messages
13. Context panel mode
14. Unique PnR IDs for each prompt-response

### New Premium Features
15. Command Palette (Ctrl+K) - VS Code-style quick actions
16. Keyboard Shortcuts Panel (?) - View all shortcuts
17. Prompt Templates Library - Save/reuse prompts with categories
18. Chat Folders - Organize chats with drag-drop
19. Voice Input (Ctrl+M) - Speech-to-text via Web Speech API
20. Export Modal - Export as MD/JSON/HTML/TXT
21. Message Reactions - Thumbs up/down, bookmark
22. Token Counter - Live token estimation with cost
23. Code Syntax Highlighting - Per-block copy buttons
24. Text-to-Speech - Read responses aloud (Ctrl+.)
25. Theme Customization - 8 accent colors, font sizes
26. Multi-provider LLM Support - OpenAI, Anthropic, Google, Ollama, Azure

## Component Structure
```
src/components/
├── admin/           # Provider configuration
├── chat/            # Main chat area components
├── common/          # CommandPalette, KeyboardShortcuts, SearchBar
├── context/         # ContextPanel for custom context
├── export/          # ExportModal
├── search/          # GlobalSearch
├── sidebar/         # Sidebar, ChatListItem, FoldersSection
└── templates/       # TemplatesLibrary
```

## Architecture Principles
- SOLID principles
- DRY code
- Component-based architecture
- Context API for state management
- Local storage persistence

## Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+K | Command palette |
| ? | Shortcuts help |
| Ctrl+Enter | Send message |
| Ctrl+M | Voice input |
| Ctrl+. | Read aloud |
| Ctrl+Shift+F | Global search |
| Ctrl+Shift+E | Export modal |
| Ctrl+Shift+T | Templates |

## Progress
- [x] Clarify Project Requirements
- [x] Scaffold the Project
- [x] Customize the Project
- [x] Install Required Extensions
- [x] Compile the Project
- [x] Create and Run Task
- [x] Launch the Project
- [x] Ensure Documentation is Complete
- [x] Implement 15+ Premium Features

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npx tsc --noEmit` - Type check
