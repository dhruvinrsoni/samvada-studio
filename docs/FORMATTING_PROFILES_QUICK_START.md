# 💎 Formatting Profiles - Quick Start Guide

**Formatting Profiles** control how AI responses are formatted for each chat. Think of it as a "response template" system.

## TL;DR - In 30 Seconds

1. **Open any chat** → Click ⚙️ **Settings** button
2. **Scroll down** to `💎 Formatting Profile` section
3. **Choose a preset** OR **create custom**
4. **Click Save**
5. **Send a prompt** → AI follows your formatting rules

---

## 📋 5 Built-in Presets

| Preset | Best For | Key Features |
|--------|----------|--------------|
| **Technical & Detailed** | Code reviews, API docs | Code blocks, type hints, security notes |
| **Concise Bullets** | Quick answers, lists | Bullet points, no fluff, action items |
| **Academic** | Essays, research | Formal tone, citations, structured sections |
| **Creative & Conversational** | Brainstorming, content | Warm tone, examples, dialogue-ready |
| **Code Only** | Code generation | Just the code, minimal comments |

---

## ✨ Custom Profiles

### Create a Custom Profile

```
1. Open Chat Settings (⚙️ button)
2. Find "💎 Formatting Profile" → Click ▶ to expand
3. Click "+ Create Custom Profile"
4. Edit:
   - Profile Name: "API Documentation"
   - Description: "For REST API docs"
   - Response Format: "Markdown"
   - Style Preferences: "Technical, include cURL examples"
5. Add Rules (optional):
   - "+ Add Rule" button
   - Choose type: Response Format / Always Include / Always Exclude / Style Guide
   - Enter details
6. Click "Save Settings"
```

### Rule Types Explained

| Rule Type | Purpose | Example |
|-----------|---------|---------|
| **Response Format** | How to structure response | "Use numbered list format" |
| **Always Include** | What MUST be in response | "Include security considerations" |
| **Always Exclude** | What to AVOID | "Don't include basic explanations" |
| **Style Guide** | Writing style/tone | "Use professional, technical tone" |

---

## 🎯 Quick Use Cases

### Use Case 1: Code Review Chat
```
Profile: "Technical & Detailed"
Custom Rule:
  - Type: Always Include
  - Value: "Performance implications, security vulnerabilities, best practices"
```

### Use Case 2: Quick Reference
```
Profile: "Concise Bullets"
(No custom rules needed)
```

### Use Case 3: Blog Writing
```
Profile: "Creative & Conversational"
Custom Rule:
  - Type: Style Guide
  - Value: "Friendly, engaging tone. Include real-world examples. Start with hook."
```

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Chat Settings | Click ⚙️ button |
| Save Settings | Click "Save Settings" button |
| Toggle Formatting Section | Click ▶/▼ arrow |

---

## ❓ FAQ

### Q: Do profiles persist between sessions?
**A:** Yes! Profiles are saved with your chat in localStorage.

### Q: Can I copy a preset and modify it?
**A:** Yes! Select a preset, then edit any field. It becomes a custom profile.

### Q: Will the profile affect old messages?
**A:** No, only new messages follow the profile. Old messages stay as-is.

### Q: Can I use multiple profiles in one chat?
**A:** No, each chat has one active profile. But you can quickly switch!

### Q: What if I add rules but they don't work?
**A:** 
- Check if the rule is enabled (checkbox)
- Make sure you clicked "Save Settings"
- Some LLMs may ignore complex rules; try simpler wording
- Check your API key is valid in Admin Settings

---

## 📚 Full Documentation

For detailed information, theory, and advanced usage:
→ Read [FORMATTING_PROFILES_GUIDE.md](FORMATTING_PROFILES_GUIDE.md) (comprehensive guide with 500+ lines)

---

## 🎓 Examples to Try

### Example 1: Meeting Notes Assistant
```
Profile: Concise Bullets
Add Rule:
  - Always Include: "Action items with owners, Decisions made, Timeline"
Prompt: "Summarize the meeting notes"
```

### Example 2: Code Tutor
```
Profile: Technical & Detailed
Add Rules:
  - Always Include: "Explain the concept, Show example code, Common pitfalls"
  - Style Guide: "Assume beginner level, use comments in code"
Prompt: "How do callbacks work in JavaScript?"
```

### Example 3: Tweet Generator
```
Profile: Creative & Conversational
Add Rules:
  - Always Exclude: "Jargon, corporate speak"
  - Style Guide: "Snappy, conversational, include emoji, max 280 chars"
Prompt: "Generate a tweet about..."
```

---

**💡 Pro Tip:** Save different custom profiles for different projects. Then switch between them per-chat!
