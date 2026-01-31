# 🎯 Compact Mode & Prompt Navigation - Feature Guide

## 📦 Compact Mode

### What is it?
Compact Mode reduces spacing and padding throughout the UI for a denser, more information-rich display.

### When to use:
- ✅ Small screens (mobile/tablet)
- ✅ Want to see more content at once
- ✅ Prefer minimal white space
- ✅ Power users who know the UI well

### How to enable:
1. Open **Settings** (⚙️)
2. Scroll to **Theme Customization**
3. Toggle **Compact Mode** ON

### What changes:
- Reduced padding/margins
- Smaller gaps between elements
- Tighter line heights
- More compact chat items
- Condensed sidebars

### CSS Implementation:
```css
/* Applied when compact mode is ON */
html.compact {
  /* Tighter spacing */
}
```

---

## ⌨️ Prompt Navigation

### What is it?
Navigate through your previous prompts and drafts using arrow keys (↑/↓), similar to terminal history.

### How it works:
1. **Focus** the prompt input box
2. **Press ↑** (Up Arrow) - Go to previous prompt
3. **Press ↓** (Down Arrow) - Go to next prompt or back to current text
4. **Type** - Exit navigation and edit normally

### History includes:
- ✅ All sent prompts from current chat
- ✅ All draft responses
- ✅ Chronological order (oldest → newest)

### Visual indicator:
When navigating, you'll see:
```
┌──────────────────────────────────┐
│ 📜 Navigating history (3/10)    │
│                                  │
│ [Previous prompt text here...]   │
└──────────────────────────────────┘
```

### Enable/Disable:
**Settings → Theme Customization → Prompt Navigation** (Toggle)

### Navigation Flow:
```
Current (empty or typing)
         ↑
    Most Recent
         ↑
       Older
         ↑
      Oldest
```

### Implementation Details:

**Hook:** `usePromptNavigation`
- Builds history from current chat
- Tracks navigation index
- Provides prev/next functions

**Usage in PromptInput:**
```typescript
const {
  isNavigating,
  navigateToPrevious,
  navigateToNext,
  resetNavigation
} = usePromptNavigation();

// On ArrowUp: navigateToPrevious()
// On ArrowDown: navigateToNext()
// On typing: resetNavigation()
```

### Keyboard Shortcuts:
| Key | Action |
|-----|--------|
| ↑ | Previous prompt (older) |
| ↓ | Next prompt (newer) |
| Any typing | Exit navigation |
| Ctrl+↑ | (No action - reserved) |

### Edge Cases:
- **Empty chat**: No history, arrows do nothing
- **At oldest**: ↑ does nothing
- **At newest**: ↓ returns to current text
- **Multiline input**: Only navigates when cursor at start (↑) or end (↓)

---

## 🔧 Settings Location

Both features are in: **Settings ⚙️ → Theme Customization**

```
┌─────────────────────────────────┐
│ Theme Customization             │
├─────────────────────────────────┤
│ Color Preset: [Royal Blue ▼]   │
│ Theme Mode:   [Auto ▼]          │
│ Font Size:    [XS S M L XL]     │
│                                 │
│ [✓] Compact Mode                │
│ [✓] Prompt Navigation           │
└─────────────────────────────────┘
```

---

## 💡 Tips

### Compact Mode:
- Try on desktop first to see if you like the denser layout
- Great for split-screen workflows
- Can be combined with smaller font size for maximum density

### Prompt Navigation:
- Works per-chat (each chat has its own history)
- Drafts are included (explore different response versions)
- Great for reusing similar prompts with small tweaks
- Press ↑ once to quickly get last prompt

---

## 🐛 Troubleshooting

**Compact Mode not applying?**
- Hard refresh: Ctrl+Shift+R
- Check if `.compact` class is on `<html>` element (F12 → Elements)

**Prompt Navigation not working?**
- Ensure it's enabled in settings
- Check if you're in an active chat (not sidebar)
- Make sure cursor is at start (↑) or end (↓) of input
- Shortcuts only work when prompt input is focused

**Arrow keys not responding?**
- Check if another modal/feature is open
- Try clicking in the input box first
- Ensure no other browser extension is intercepting keys

---

## 📊 Performance

Both features have **negligible** performance impact:
- **Compact Mode**: Pure CSS, no JS overhead
- **Prompt Navigation**: Memoized history, only runs on chat change

---

## 🎓 For Developers

### Adding Compact Mode Styles:
```css
/* In component CSS */
.my-component {
  padding: 1rem; /* Default */
}

html.compact .my-component {
  padding: 0.5rem; /* Compact */
}
```

### Using Prompt Navigation Hook:
```typescript
import { usePromptNavigation } from '@/hooks/usePromptNavigation';

const MyComponent = () => {
  const {
    navigationHistory,    // Full history array
    currentNavigationIndex, // Current position
    isNavigating,          // Boolean flag
    initializeNavigation,  // Set up with current text
    navigateToPrevious,    // Go back
    navigateToNext,        // Go forward
    resetNavigation        // Exit navigation mode
  } = usePromptNavigation();

  // Use in keyboard handlers
};
```

### State Structure:
```typescript
interface ThemeSettings {
  compactMode: boolean;              // Default: false
  promptNavigationEnabled: boolean;  // Default: true
  // ... other settings
}
```

---

## ✅ Best Practices

1. **Enable both** for optimal power-user experience
2. **Test compact mode** on your primary device first
3. **Use navigation** when crafting similar prompts
4. **Disable navigation** if you prefer typing freely
5. **Combine with keyboard shortcuts** for maximum efficiency

---

Last Updated: February 1, 2026
