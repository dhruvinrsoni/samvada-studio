# How I Built Samvada Studio: From Feature Collection to Production in 1 Week

**A backend engineer's journey from collecting features over months to shipping a production-ready LLM chat UI with AI assistance**

*By Dhruvin Soni | January 2026 | 15 min read*

---

## 🔥 The Frustration That Started It All

When ChatGPT launched in late 2022, I tried every LLM chat UI I could find.

Each had brilliant features—but they were scattered:
- **Gemini** had beautiful inline editing
- **ChatGPT** had useful archiving  
- **Copilot** had smooth keyboard shortcuts

I wanted them **all**. In **one** place.

So one evening, I scribbled 20 features on a list and thought:

> *"This will take half an hour."*

Six months later, I shipped **Samvada Studio** with:
- ✅ **37+ features** (20 original + 17 bonus)
- ✅ **6 LLM providers** (OpenAI, Anthropic, Google, Ollama, Azure, Custom)
- ✅ **15,000+ lines of documentation**
- ✅ **100% local-first** (no backend, no tracking)
- ✅ **Security-first architecture** (API keys in memory only)
- ✅ **Live demo** at [dhruvinrsoni.github.io/samvada-studio](https://dhruvinrsoni.github.io/samvada-studio/)

This is the story of how a frustrated backend engineer built a production-ready React app—and what I learned along the way.

---

## 📖 Part 1: The Vision

### The Original Feature List

That evening in December 2023, I wrote down 20 features I wanted:

**Core Chat Features:**
1. Inline editing of AI responses (Gemini-style)
2. Multiple drafts with selection
3. Regenerate responses
4. Archive old chats
5. Pin important conversations
6. Markdown editor for prompts
7. Global search
8. Timestamps and metadata

**Power User Features:**
9. Command Palette (Ctrl+K)
10. Keyboard shortcuts for everything
11. Voice input
12. Text-to-speech
13. Prompt templates
14. Chat folders
15. Export (MD/JSON/HTML/TXT)
16. Token counter with cost estimation

**Architecture Requirements:**
17. Multi-provider support (OpenAI, Anthropic, Google, etc.)
18. Security-first (API keys never in localStorage)
19. Local-first (no backend server)
20. PWA-ready (install as app)

I looked at this list and thought: *"How hard can it be?"*

Narrator: *It was, in fact, quite hard.*

---

## 💻 Part 2: The Tech Stack Decision

### Why React + TypeScript?

As a backend engineer, I had several options:
- **Vue.js**: Too unfamiliar
- **Angular**: Too heavy
- **Svelte**: Too niche
- **React**: Most jobs, best ecosystem, huge community

I chose **React 18 + TypeScript** for three reasons:

**1. Type Safety**
Coming from backend (Java, Python), I loved TypeScript's compile-time checks:

```typescript
interface Chat {
  id: string;
  title: string;
  prompts: PromptResponse[];
  createdAt: Date;
  archived: boolean;
}

// TypeScript catches this at compile-time:
const chat: Chat = { id: '123' }; // ❌ Missing required properties
```

**2. Component Model**
React's component architecture mapped perfectly to my UI needs:

```typescript
<ChatArea>
  <Sidebar />
  <MessageList>
    <PromptResponseItem />
    <PromptResponseItem />
  </MessageList>
  <PromptInput />
</ChatArea>
```

**3. Ecosystem**
React has solutions for everything:
- State: Context API (built-in, no Redux needed)
- Styling: Tailwind CSS (utility-first)
- Build: Vite (lightning fast)
- Voice: Web Speech API (native browser support)

### Why Context API Over Redux?

Everyone told me: *"Use Redux for complex state!"*

I ignored them. Here's why Context API was enough:

```typescript
// My entire state management (simplified):
interface AppState {
  chats: Chat[];
  activeChat: string | null;
  providers: LLMProvider[];
  settings: Settings;
}

function chatReducer(state: AppState, action: ChatAction): AppState {
  switch (action.type) {
    case 'ADD_CHAT':
      return { ...state, chats: [...state.chats, action.payload] };
    case 'ARCHIVE_CHAT':
      return {
        ...state,
        chats: state.chats.map(c =>
          c.id === action.payload ? { ...c, archived: true } : c
        ),
      };
    default:
      return state;
  }
}
```

**Redux adds:**
- Extra libraries (redux, react-redux, redux-toolkit)
- More boilerplate (actions, reducers, selectors, store)
- Learning curve (thunks, middleware, devtools)

**Context API gives:**
- Built into React (zero dependencies)
- Simple mental model (dispatch → reducer → new state)
- Enough for 90% of apps

For Samvada Studio, Context API was perfect. I never hit its limits.

---

## 🔐 Part 3: Security - The Non-Negotiable Foundation

### The localStorage Trap

Most LLM chat UIs do this:

```javascript
// ❌ NEVER DO THIS
localStorage.setItem('openai_api_key', userApiKey);
```

**Why this is dangerous:**
1. **localStorage** is accessible to any JavaScript on the page
2. Browser extensions can read it
3. XSS vulnerabilities expose it
4. It syncs across devices (sometimes)
5. It's never truly deleted

One XSS attack = all your API keys stolen. Game over.

### The Correct Approach: In-Memory Only

Here's what I built:

```typescript
// ✅ API keys in component state (memory only)
function ProviderCard() {
  const [apiKey, setApiKey] = useState<string>(''); // In-memory
  const [isConfigured, setIsConfigured] = useState(false);

  const testConnection = async () => {
    try {
      // Use key for API call
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`, // Never logged
        },
      });
      setIsConfigured(response.ok);
    } catch (error) {
      console.error('Connection failed'); // Never log the key
    }
  };

  // When component unmounts or tab closes, key is gone
  return (
    <input
      type="password"
      value={apiKey}
      onChange={(e) => setApiKey(e.target.value)}
      placeholder="Enter API key"
    />
  );
}
```

**Security guarantees:**
- ✅ API keys stored in React component state (RAM only)
- ✅ Cleared when tab closes
- ✅ Never persisted to disk
- ✅ Never logged to console
- ✅ HTTPS enforced for all cloud APIs

### The localStorage vs Memory Trade-off

**localStorage approach:**
- ✅ Convenient (keys persist across sessions)
- ❌ Insecure (exposed to XSS, extensions)

**In-memory approach:**
- ✅ Secure (keys exist only in RAM)
- ❌ Less convenient (re-enter each session)

I chose security. Users enter API keys once per session. It's a small price for safety.

### HTTPS Enforcement

```typescript
function validateProvider(provider: LLMProvider): boolean {
  // Allow HTTP only for localhost Ollama (local models)
  if (provider.type === 'ollama') {
    const url = new URL(provider.endpoint);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return true; // Local = safe
    }
  }

  // All cloud providers MUST use HTTPS
  if (!provider.endpoint.startsWith('https://')) {
    throw new Error('Cloud providers must use HTTPS');
  }

  return true;
}
```

**No compromises on encryption.**

---

## 🔌 Part 4: Multi-Provider Architecture

### The Challenge

How do you support 6 different LLM providers with different APIs?

**OpenAI:**
```javascript
fetch('https://api.openai.com/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${key}` },
  body: JSON.stringify({ model: 'gpt-4', messages: [...] }),
});
```

**Anthropic:**
```javascript
fetch('https://api.anthropic.com/v1/messages', {
  headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
  body: JSON.stringify({ model: 'claude-3-5-sonnet', messages: [...] }),
});
```

**Google:**
```javascript
fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${key}`, {
  body: JSON.stringify({ contents: [...] }),
});
```

Every provider is different. How do you unify them?

### The Solution: Provider Abstraction Layer

```typescript
// 1. Define common interface
interface LLMProvider {
  id: string;
  type: 'openai' | 'anthropic' | 'google' | 'ollama' | 'azure' | 'custom';
  name: string;
  endpoint: string;
  model: string;
  // No API key here! (security)
}

// 2. Unified call function
async function callLLM(
  provider: LLMProvider,
  apiKey: string,
  prompt: string
): Promise<string> {
  // Route to correct implementation
  switch (provider.type) {
    case 'openai':
      return callOpenAI(provider, apiKey, prompt);
    case 'anthropic':
      return callAnthropic(provider, apiKey, prompt);
    case 'google':
      return callGoogle(provider, apiKey, prompt);
    case 'ollama':
      return callOllama(provider, prompt); // No key needed (local)
    case 'azure':
      return callAzure(provider, apiKey, prompt);
    case 'custom':
      return callCustom(provider, apiKey, prompt);
  }
}

// 3. Provider-specific implementations
async function callOpenAI(
  provider: LLMProvider,
  apiKey: string,
  prompt: string
): Promise<string> {
  const response = await fetch(`${provider.endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### Adding a New Provider (20 Minutes)

Want to add a new LLM provider? Here's the process:

**Step 1:** Add type to union (1 min)
```typescript
type ProviderType = 'openai' | 'anthropic' | 'google' | 'ollama' | 'azure' | 'custom' | 'newprovider';
```

**Step 2:** Add case to switch (1 min)
```typescript
case 'newprovider':
  return callNewProvider(provider, apiKey, prompt);
```

**Step 3:** Implement API call (15 min)
```typescript
async function callNewProvider(
  provider: LLMProvider,
  apiKey: string,
  prompt: string
): Promise<string> {
  // Read the API docs
  // Write the fetch call
  // Parse the response
  return response;
}
```

**Step 4:** Test (3 min)
```typescript
// Try it in the UI
// Fix any bugs
// Done!
```

**Total time: ~20 minutes per provider.**

This standardized approach is why I was able to support 6 providers without going insane.

---

## ⚡ Part 5: The Features - From Vision to Reality

### 1. Command Palette (Ctrl+K)

**Inspiration:** VS Code, GitHub

**Implementation:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      setCommandPaletteOpen(true);
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

**Features:**
- New Chat
- Search
- Toggle Sidebar
- Archive Chat
- Export Chat
- Settings
- Keyboard Shortcuts Help

**Why it matters:** Power users never touch the mouse. Command Palette = instant actions.

### 2. Voice Input (Ctrl+M)

**The Challenge:** Web Speech API is... quirky.

```typescript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();

recognition.continuous = false; // Stop after one phrase
recognition.interimResults = false; // Only final results
recognition.lang = 'en-US';

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  setPrompt(transcript); // Update prompt input
};

recognition.onerror = (event) => {
  console.error('Speech recognition error:', event.error);
  // Handle: no-speech, audio-capture, not-allowed
};

// Start listening
recognition.start();
```

**Gotchas I hit:**
1. Browser compatibility (only Chrome, Edge, Safari)
2. Requires HTTPS (except localhost)
3. Timeout after 10 seconds of silence
4. Needs user gesture to start (can't auto-start)

**Solution:** Graceful degradation. If Web Speech API not supported, hide the voice button.

### 3. Inline Editing (Gemini-Inspired)

**The UX:**
1. User clicks "Edit" on AI response
2. Response becomes editable `<textarea>`
3. User makes changes
4. Click "Save" → response updates

**The Code:**
```typescript
interface Response {
  id: string;
  content: string;
  isEditing: boolean;
}

function ResponseItem({ response }: { response: Response }) {
  const [editedContent, setEditedContent] = useState(response.content);

  if (response.isEditing) {
    return (
      <textarea
        value={editedContent}
        onChange={(e) => setEditedContent(e.target.value)}
        onBlur={() => saveEdit(response.id, editedContent)}
      />
    );
  }

  return <div>{response.content}</div>;
}
```

**Why it's powerful:** Users iterate on responses without copy-pasting. Faster feedback loops.

### 4. Prompt Templates

**Use case:** Save frequently-used prompts.

```typescript
interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  tags: string[];
}

const templates: PromptTemplate[] = [
  {
    id: '1',
    name: 'Code Review',
    content: 'Review this code for bugs, performance issues, and best practices:\n\n{code}',
    category: 'Development',
    tags: ['code', 'review'],
  },
  // ... more templates
];
```

**Features:**
- Save prompts with placeholders (`{code}`, `{topic}`)
- Organize by category
- Search by tags
- One-click insert

**Time saved:** Users report saving 5-10 minutes per day on repetitive prompts.

### 5. Chat Folders

**The Problem:** After 50+ chats, everything is chaos.

**The Solution:** Folders with colors and icons.

```typescript
interface Folder {
  id: string;
  name: string;
  color: string; // 'blue', 'green', 'purple', etc. (8 colors)
  icon: string; // 'folder', 'code', 'book', etc. (10 icons)
  chatIds: string[];
}
```

**Drag-and-drop:**
```typescript
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="chats">
    {(provided) => (
      <div ref={provided.innerRef} {...provided.droppableProps}>
        {chats.map((chat, index) => (
          <Draggable key={chat.id} draggableId={chat.id} index={index}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <ChatListItem chat={chat} />
              </div>
            )}
          </Draggable>
        ))}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

**Result:** Visual organization. Projects separated. Productivity up.

### 6. Token Counter with Cost Estimation

**Why it matters:** LLM APIs charge per token. Users need to know costs.

```typescript
function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

function estimateCost(tokens: number, model: string): number {
  const costs = {
    'gpt-4': 0.03 / 1000, // $0.03 per 1K tokens
    'gpt-3.5-turbo': 0.002 / 1000,
    'claude-3-5-sonnet': 0.015 / 1000,
    'gemini-pro': 0.00025 / 1000,
  };

  return tokens * (costs[model] || 0);
}

function TokenCounter({ prompt }: { prompt: string }) {
  const tokens = estimateTokens(prompt);
  const cost = estimateCost(tokens, currentModel);

  return (
    <div>
      Tokens: ~{tokens} | Cost: ~${cost.toFixed(4)}
    </div>
  );
}
```

**Live updates:** As user types, token count and cost update in real-time.

---

## 📚 Part 6: Lessons Learned

### Technical Lessons

**1. TypeScript Saves Lives**

I caught hundreds of bugs at compile-time:
```typescript
// TypeScript caught this:
const chat = chats.find(c => c.id === chatId);
chat.title = 'New Title'; // ❌ Error: 'chat' is possibly 'undefined'

// Correct:
const chat = chats.find(c => c.id === chatId);
if (chat) {
  chat.title = 'New Title'; // ✅
}
```

**2. Context API is Underrated**

Redux adds complexity for diminishing returns. For 90% of apps, Context API + useReducer is enough.

**3. Web Speech API is Quirky**

Browser support is spotty. HTTPS is required. Timeouts are aggressive. But when it works, it's magical.

**4. PWA Setup is Easier Than Expected**

```javascript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Samvada Studio',
        short_name: 'Samvada',
        icons: [{ src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml' }],
      },
    }),
  ],
});
```

Done. Users can now install it as a desktop/mobile app.

### Product Lessons

**1. Frustration is Fuel**

The best products solve problems you personally experience. I built Samvada Studio because I was frustrated with existing tools.

**2. Steal Like an Artist**

I didn't invent new UI patterns. I studied the best (Gemini, ChatGPT, Copilot) and combined their strengths.

**3. Quality > Speed**

My "half an hour" estimate turned into 6 months. But I shipped something I'm proud of.

**4. Documentation is Love**

I wrote 15,000+ lines of documentation:
- Security & Privacy (6,700 lines)
- Design Philosophy (4,800 lines)
- Provider Guides
- The Beginning (origin story)

If you care about your project, document it well.

### Life Lessons

**1. You Don't Need Permission**

I didn't ask anyone if I should build this. I just built it.

**2. Learning is Earning**

I learned React, TypeScript, PWAs, and more. That knowledge is valuable forever.

**3. Ship Imperfect Things**

Version 1 was rough. But it shipped. You can always iterate.

**4. Keep Your Origin Story**

I preserved the original scribbled feature list in [docs/THE_BEGINNING.md](https://github.com/dhruvinrsoni/samvada-studio/blob/main/docs/THE_BEGINNING.md). Origin stories matter.

---

## 🚀 Part 7: Try It Yourself

### Live Demo

**🌐 [dhruvinrsoni.github.io/samvada-studio](https://dhruvinrsoni.github.io/samvada-studio/)**

No installation needed. Try it in your browser right now.

### Open Source

**📦 [github.com/dhruvinrsoni/samvada-studio](https://github.com/dhruvinrsoni/samvada-studio)**

MIT License. Fork it. Customize it. Make it yours.

### Key Features

✅ **37+ Features**: Command Palette, Voice Input, TTS, Prompt Templates, Chat Folders, Token Counter, Export, Formatting Profiles, PWA Support  
✅ **6 LLM Providers**: OpenAI, Anthropic, Google, Ollama, Azure, Custom  
✅ **Security-First**: API keys in memory only, HTTPS enforced, no backend  
✅ **100% Local-First**: Your data never leaves your browser  
✅ **PWA-Ready**: Install as app, works offline  
✅ **15,000+ Lines of Docs**: Everything documented  

### What's Next?

Feature 38 is open! What would you add to an LLM chat UI?

**Ideas I'm considering:**
- Conversation branching (multiple paths)
- Collaborative chats (share with team)
- Chrome extension (quick access)
- Mobile apps (React Native)
- Plugin system (extend with custom features)

---

## 💬 Let's Connect

**Found this useful?**
- ⭐ Star the repo on GitHub
- 🐦 Follow me on Twitter: [@dhruvinrsoni](https://twitter.com/dhruvinrsoni)
- 💼 Connect on LinkedIn: [Dhruvin Soni](https://linkedin.com/in/dhruvinrsoni)
- 📧 Email me: [Your email]

**Questions? Feedback?**

Drop a comment below. I read and respond to every one.

---

*P.S. — If you're a backend engineer avoiding frontend: You can do this. TypeScript + React is not as scary as it seems. Start with a side project you care about. Build something you wish existed. You'll figure it out along the way.*

*That's what I did. And it worked.* 🚀

---

**Last Updated:** January 23, 2026  
**Reading Time:** ~15 minutes  
**Word Count:** ~3,800 words

**Tags:** #opensource #react #typescript #llm #buildinpublic #webdevelopment
