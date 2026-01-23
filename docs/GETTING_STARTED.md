# 🚀 Getting Started with Samvada Studio

Welcome to **Samvada Studio**! This guide will help you get up and running in minutes.

> 🌐 **Try Online First**: [https://dhruvinrsoni.github.io/samvada-studio/](https://dhruvinrsoni.github.io/samvada-studio/) — No installation needed!

---

## 📋 Table of Contents

1. [Installation](#-installation)
2. [First Launch](#-first-launch)
3. [Configuring Your First Provider](#-configuring-your-first-provider)
4. [Creating Your First Chat](#-creating-your-first-chat)
5. [Essential Features](#-essential-features)
6. [Keyboard Shortcuts](#️-keyboard-shortcuts-tour)
7. [Tips & Tricks](#-tips--tricks)

---

## 🔧 Installation

### ⚡ Quick Start: Use Online

**No installation needed!** Visit [https://dhruvinrsoni.github.io/samvada-studio/](https://dhruvinrsoni.github.io/samvada-studio/) and start using Samvada Studio immediately.

- ✅ Works in any modern browser
- ✅ Install as PWA for offline use
- ✅ All data stays on your device
- ✅ Automatic updates

### 🛠️ Local Development

Want to run locally or contribute?

#### Prerequisites

- **Node.js** 18 or higher
- **npm**, **yarn**, or **pnpm**
- Modern browser (Chrome, Edge, Firefox, Safari)

#### Step 1: Clone the Repository

```bash
git clone https://github.com/dhruvinrsoni/samvada-studio.git
cd samvada-studio
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Start the Development Server

```bash
npm run dev
```

The app will open at **http://localhost:5173** 🎉

> 💡 **Prefer the hosted version?** Use [https://dhruvinrsoni.github.io/samvada-studio/](https://dhruvinrsoni.github.io/samvada-studio/) for automatic updates and zero maintenance.

---

## 🎬 First Launch

When you first open Samvada Studio, you'll see:

```
┌─────────────┬──────────────────────────────────────┐
│             │                                      │
│  Sidebar    │  Welcome Screen                      │
│             │                                      │
│  📁 Chats   │  👋 Welcome to Samvada Studio!       │
│  ⚙️ Admin   │                                      │
│             │  Please configure a provider to      │
│             │  start chatting.                     │
│             │                                      │
│             │  [⚙️ Open Admin Settings]            │
│             │                                      │
└─────────────┴──────────────────────────────────────┘
```

---

## 🤖 Configuring Your First Provider

### Option 1: OpenAI (Recommended for Beginners)

1. Click the **⚙️ Admin** button in the top-right corner
2. Click **"+ Add Provider"**
3. Select **"OpenAI (ChatGPT)"** from the dropdown
4. Enter your details:
   - **API Key**: Get from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **Model**: Select `gpt-4` or `gpt-3.5-turbo`
   - **Name**: Optional custom name (e.g., "My GPT-4")
5. Click **"Test Connection"** to verify ✅
6. Click **"Save"**
7. Set as default by clicking the **⭐ Default** button

### Option 2: Ollama (Free, Local, No API Key)

1. Install Ollama: [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama2`
3. In Samvada Studio:
   - Click **⚙️ Admin** → **"+ Add Provider"**
   - Select **"Ollama (Local)"**
   - Endpoint: `http://localhost:11434/api/generate`
   - Model: `llama2`
   - Click **"Test Connection"** → **"Save"**

### Option 3: Anthropic (Claude)

- Get API key from [console.anthropic.com](https://console.anthropic.com)
- Model: `claude-3-5-sonnet-20241022`
- Follow same steps as OpenAI

---

## 💬 Creating Your First Chat

### Method 1: New Chat Button

1. Click **"+ New Chat"** in the sidebar
2. Type your prompt in the input box at the bottom
3. Press **Ctrl+Enter** or **Shift+Enter** to send
4. Wait for the AI response!

### Method 2: Command Palette

1. Press **Ctrl+K** to open the command palette
2. Type "new chat"
3. Press **Enter**

### Method 3: With Specific Provider

1. Click the **dropdown arrow (▼)** next to "New Chat"
2. Select a provider from the list
3. A new chat with that provider is created

---

## ✨ Essential Features

### 1. **Inline Editing** (Gemini-style)

- Hover over any prompt or response
- Click the **✏️ edit button** that appears
- Modify the text
- Click **"Save"** or **"Cancel"**

### 2. **Drafts & Regenerate**

- Click **"🔄 Regenerate"** to generate alternative responses
- Navigate between drafts using numbered buttons (1, 2, 3...)
- Each regeneration creates a new draft

### 3. **Quote Text** (ChatGPT-style)

- Click **"💬 Quote"** on any response
- The response is automatically added to your next prompt
- Perfect for follow-up questions or clarifications

### 4. **Star Messages**

- Hover over a message → click **✨ (sparkles)**
- Star turns to **⭐ (gold star)**
- View all starred messages: Click **"Starred Messages"** in sidebar
- Star entire conversations by clicking star in the PnR header

### 5. **Pin Conversations**

- Click **📌** in the conversation header
- Pinned conversations appear at the top of the sidebar
- Yellow border indicates pinned status

### 6. **Archive Chats**

- Click **"Show Archived"** button in sidebar to toggle view
- Right-click chat → Select **"Archive"**
- Or use bulk operations (select multiple → Archive button)

### 7. **Organize with Folders**

- Click **"+ New Folder"** in sidebar
- Choose a name, color (8 options), and icon (10 options)
- Drag chats into folders to organize
- Click folder to expand/collapse

### 8. **Global Search**

- Press **Ctrl+Shift+F**
- Type your search query
- Use **↑** / **↓** arrows to navigate results
- Press **Enter** to jump to result

### 9. **Voice Input**

- Click the **🎤 microphone** button (or press **Ctrl+M**)
- Speak your prompt
- Real-time transcription appears as you speak
- Click again to stop

### 10. **Templates**

- Press **Ctrl+Shift+T** to open templates
- Browse by category: General, Code, Writing, Analysis
- Click **"Use Template"** to insert into prompt
- Create custom templates with **"+ New Template"**

---

## ⌨️ Keyboard Shortcuts Tour

**Press `?` in the app to see all shortcuts!**

### Must-Know Shortcuts

| Shortcut | Action |
|----------|--------|
| **Ctrl+K** | Open command palette (fastest way to do anything!) |
| **?** | View all keyboard shortcuts |
| **Ctrl+Enter** | Send your message |
| **Enter** | New line (multi-line mode) |
| **Shift+Enter** | Also sends message |
| **Ctrl+M** | Start voice input |
| **Ctrl+Shift+F** | Global search |
| **Ctrl+Shift+E** | Export modal |
| **Ctrl+Shift+T** | Templates library |
| **↑** / **↓** | Navigate prompt history |

---

## 💡 Tips & Tricks

### 1. **Markdown Formatting**

Use the formatting toolbar above the input:
- **B** — Bold text
- *I* — Italic text
- `</>` — Inline code
- 🔗 — Insert link
- **1.** — Start numbered list
- **•** — Start bullet list

### 2. **Chat-Specific Settings**

- Click **⚙️ icon** in chat header
- Configure:
  - System role (e.g., "You are a helpful coding assistant")
  - Custom instructions
  - Always include/exclude specific terms
  - Few-shot examples (input/output pairs)
  - Temperature & max tokens

### 3. **Multi-Line Mode**

- First **Enter** starts multi-line mode
- Continue pressing **Enter** for new lines
- Press **Ctrl+Enter** or **Shift+Enter** to send
- Hint appears: "📄 Multi-line (Enter: newline, Shift+Enter: send)"

### 4. **Copy PnR IDs**

- Each conversation has a unique ID shown as `#a1b2c3d4`
- Click the ID to copy it to clipboard
- Useful for referencing specific conversations

### 5. **Context Panel Mode**

- Click **"Context Panel"** toggle in header
- A side panel appears
- Add custom context that's included with every prompt
- Toggle individual panels active/inactive
- Perfect for:
  - Code snippets you reference often
  - Project requirements
  - Style guides

### 6. **Bulk Operations**

- Click checkboxes next to multiple chats
- Use **"Select All"** button at bottom
- Bulk actions appear: Archive, Delete
- Great for cleaning up old chats

### 7. **Export & Backup**

- Press **Ctrl+Shift+E** to open export modal
- Options:
  - Export current chat
  - Export multiple selected chats
  - **Export All Data** (full backup)
- Formats: Markdown, JSON, HTML, Plain Text

### 8. **Provider Per Chat**

- Each chat can use a different provider
- Click provider dropdown in chat header to switch
- Compare responses from different models
- Perfect for A/B testing prompts

### 9. **Token Counter & Cost**

- Live token count shown as you type
- Estimated cost per prompt
- View total chat stats (tokens, cost, message count)

### 10. **Theme Customization**

- Click **theme button** (🌙/☀️) in top bar
- Choose from 8 accent colors
- Adjust font size (Small/Medium/Large)
- Enable compact mode for more content

---

## 🆘 Need Help?

- **Documentation**: Check [docs/](../docs/) folder
- **Troubleshooting**: See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Features**: Full list in [FEATURES.md](FEATURES.md)
- **Issues**: [GitHub Issues](https://github.com/dhruvinrsoni/samvada-studio/issues)

---

## 🎯 Next Steps

Now that you're set up, explore these advanced features:

1. **Try different providers** — Compare GPT-4 vs Claude vs Gemini
2. **Create templates** — Save your favorite prompts
3. **Use command palette** — Learn to work without the mouse
4. **Customize themes** — Make it your own
5. **Organize with folders** — Keep your workspace clean

---

<div align="center">

**Happy conversing! 🗣️**

*"संवाद करें, सीखें, बढ़ें"* (Converse, Learn, Grow)

</div>
