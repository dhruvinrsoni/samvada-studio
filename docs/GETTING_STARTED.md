# Getting Started

**Try online**: [https://dhruvinrsoni.github.io/samvada-studio/](https://dhruvinrsoni.github.io/samvada-studio/) — no install needed.

## Local Setup

```bash
git clone https://github.com/dhruvinrsoni/samvada-studio.git
cd samvada-studio
npm install
npm run dev   # http://localhost:5173
```

Node.js 18+ required.

## Configure a Provider

1. Click the gear icon (top-right of any chat, or Admin Settings)
2. Go to **Providers** tab → **+ Add Provider**
3. Pick a type, enter your API key or Ollama endpoint
4. Click **Test Connection** → **Save**

**Ollama (free, local, no API key)**:
```bash
# Install from ollama.ai, then:
ollama pull llama3.2
# Endpoint: http://localhost:11434
```

**Cloud providers**: Get API keys from platform.openai.com, console.anthropic.com, or aistudio.google.com.

## Create Your First Chat

1. Click **New Chat** in the sidebar
2. Type a prompt
3. Press **Enter** (single-line) or **Ctrl+Enter** / **Shift+Enter** to send

## Essential Features

### Editing & Iteration
- **Inline edit**: hover a prompt or response → click the edit icon
- **Drafts**: click Regenerate to create alternative responses; navigate between them with numbered buttons
- **Quote**: click Quote on any response to carry it into your next prompt

### Organization
- **Pin**: keep important conversations at the top of the chat list
- **Archive**: hide old chats (toggle archived view in sidebar)
- **Folders**: drag chats into color-coded folders
- **Star**: mark individual messages for quick retrieval

### Input
- **Voice**: Ctrl+M to dictate
- **Markdown toolbar**: bold, italic, code, lists — toggle with the toolbar button
- **Prompt history**: press ↑/↓ in the input to cycle through previous prompts
- **Templates**: Ctrl+Shift+T to open saved prompt templates

### Search & Navigation
- **Global search**: Ctrl+Shift+F
- **Command palette**: Ctrl+K (fastest way to do anything)
- Press **?** anywhere to see all keyboard shortcuts

### AI Memory
Enable in Admin → Memory tab. When on, the app extracts preferences from each conversation (requires a locally-running Ollama model) and injects them into future prompts automatically. Entries are stored locally and can be reviewed, deleted, or compacted in the Memory tab.

### Compact Mode
Enable in Theme Settings (gear icon → Theme Customization → Compact Mode). Dramatically reduces padding and spacing throughout the UI — useful for small screens or dense workflows.

### Per-Chat Settings
Click the gear icon in the chat title bar to configure system role, custom instructions, few-shot examples, and formatting profiles for that specific chat.

## Export

Press **Ctrl+Shift+E** to export to Markdown, JSON, HTML, or plain text.

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for CORS, Ollama, and common error solutions.
