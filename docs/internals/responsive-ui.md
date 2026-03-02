# Responsive UI Design System

> **Status**: ✅ Implemented  
> **Last Updated**: February 2026

## Overview

Samvada Studio implements a comprehensive mobile-first responsive design system that ensures optimal user experience across all device sizes from 320px mobile screens to 2560px+ ultrawide displays.

---

## Breakpoint System

| Breakpoint | Min Width | Target Devices |
|------------|-----------|----------------|
| `xs` | 480px | Large phones (landscape) |
| `sm` | 640px | Small tablets, large phones |
| `md` | 768px | Tablets (portrait) |
| `lg` | 1024px | Tablets (landscape), small laptops |
| `xl` | 1280px | Laptops, desktops |
| `2xl` | 1536px | Large desktops, ultrawide |

### Custom Breakpoint (Tailwind Config)
```javascript
// tailwind.config.js
screens: {
  'xs': '480px',
  // ... default breakpoints
}
```

---

## Core Design Principles

### 1. Mobile-First Approach
All styles start from mobile and scale up using responsive prefixes.

```css
/* Mobile first - base style */
.element { padding: 0.5rem; }

/* Scale up for larger screens */
@screen sm { .element { padding: 0.75rem; } }
@screen md { .element { padding: 1rem; } }
```

### 2. Touch-Friendly Targets
Minimum touch target size of **44px** (iOS HIG compliant).

```css
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

### 3. Safe Area Support
Support for notched devices (iPhone X+, etc.).

```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
}

.h-screen-safe {
  height: calc(100vh - var(--safe-area-inset-top) - var(--safe-area-inset-bottom));
}
```

### 4. No Horizontal Overflow
Prevent horizontal scrolling at the root level.

```css
html, body, #root {
  overflow-x: hidden;
  max-width: 100vw;
}
```

---

## Responsive Patterns

### Modal Widths
```jsx
// Graduated modal sizing
className="max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl"
```

### Padding Scale
```jsx
// Consistent padding progression
className="p-2 sm:p-3 md:p-4"        // Standard
className="p-3 sm:p-4 md:p-6"        // Generous
className="p-1 xs:p-2 sm:p-4"        // Compact
```

### Text Sizing
```jsx
// Readable at all sizes
className="text-xs sm:text-sm md:text-base"      // Body text
className="text-sm sm:text-base md:text-lg"      // Headings
className="text-[10px] sm:text-xs"               // Micro text
```

### Icon Sizing
```jsx
// Proportional icons
className="w-4 h-4 sm:w-5 sm:h-5"                // Standard
className="w-5 h-5 sm:w-6 sm:h-6"                // Medium
className="w-3.5 h-3.5 sm:w-4 sm:h-4"            // Small
```

### Button Sizing
```jsx
// Touch-friendly buttons
className="min-w-[32px] min-h-[32px] sm:min-w-[36px] sm:min-h-[36px]"  // Standard
className="min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px]"  // Compact
className="min-h-[36px] sm:min-h-[40px]"         // Form buttons
```

### Gap/Spacing
```jsx
// Consistent spacing
className="gap-1 sm:gap-2 md:gap-3"
className="gap-1.5 sm:gap-2"
```

---

## Responsive Visibility

### Conditional Display
```jsx
// Show/hide based on screen size
className="hidden xs:inline"          // Hidden on very small, show on xs+
className="hidden sm:block"           // Hidden on mobile, show on sm+
className="hidden md:flex"            // Hidden until tablet
className="lg:hidden"                 // Hide on large screens
className="hidden lg:block"           // Desktop only
```

### Truncated Labels
```jsx
// Short labels on mobile, full on desktop
<span className="hidden xs:inline">Full Label</span>
<span className="xs:hidden">Short</span>
```

---

## Component-Specific Patterns

### Sidebar
```jsx
// Mobile: 85% viewport width, max 320px
className="w-[85vw] max-w-[320px]"

// Desktop: fixed width
className="lg:w-72 xl:w-80"
```

### Modals
```jsx
// Full-width on mobile, constrained on desktop
className="w-full max-w-[98vw] sm:max-w-xl md:max-w-2xl"

// Height constraints
className="max-h-[95vh] sm:max-h-[90vh] md:max-h-[85vh]"
```

### Forms
```jsx
// Stacked on mobile, row on desktop
className="flex flex-col xs:flex-row"
className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3"
```

### Navigation Tabs
```jsx
// Horizontal scroll on mobile
className="flex overflow-x-auto scroll-touch"
```

---

## Utility Classes

### Defined in `index.css`

| Class | Purpose |
|-------|---------|
| `.touch-target` | 44px minimum touch size |
| `.scroll-touch` | Smooth momentum scrolling on mobile |
| `.h-screen-safe` | Safe area aware height |
| `.truncate-safe` | Text truncation with ellipsis |
| `.break-safe` | Word break for long content |
| `.modal-responsive` | Standard modal sizing |

---

## Components Updated

| Component | Responsive Features |
|-----------|---------------------|
| `App.tsx` | Top bar, brand name, search |
| `Sidebar.tsx` | Mobile width, touch buttons |
| `ChatArea.tsx` | Header, provider selector |
| `PromptInput.tsx` | Toolbar, textarea |
| `VoiceInput.tsx` | Button sizing |
| `TokenCounter.tsx` | Abbreviated labels |
| `PromptResponseItem.tsx` | Name editing, actions |
| `GlobalSearch.tsx` | Modal, input, results |
| `ExportModal.tsx` | Format buttons, footer |
| `CommandPalette.tsx` | Positioning, command list |
| `KeyboardShortcuts.tsx` | Grid, kbd elements |
| `AdminPanel.tsx` | Tabs, dialogs |
| `TemplatesLibrary.tsx` | Search, cards, form |
| `StarredModal.tsx` | Message cards |
| `ChatListItem.tsx` | Actions visibility |
| `FoldersSection.tsx` | Folder form |
| `ThemeSettingsModal.tsx` | All sections, preview panel |

---

## Testing Checklist

### Device Sizes
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone X/12/13)
- [ ] 414px (iPhone Plus models)
- [ ] 768px (iPad portrait)
- [ ] 1024px (iPad landscape)
- [ ] 1280px (Laptop)
- [ ] 1920px (Desktop)
- [ ] 2560px (Ultrawide)

### Functionality
- [ ] No horizontal scroll
- [ ] Touch targets accessible
- [ ] Modals don't overflow
- [ ] Text remains readable
- [ ] Buttons are tappable
- [ ] Forms are usable

---

## Best Practices for Future Development

1. **Always start mobile-first** - Base styles for smallest screen
2. **Use responsive prefixes** - `sm:`, `md:`, `lg:` for scaling up
3. **Minimum touch target** - 32px compact, 44px important actions
4. **Test on real devices** - Emulators don't catch everything
5. **Avoid fixed widths** - Use max-width with percentage fallback
6. **Horizontal scroll for tabs** - `overflow-x-auto scroll-touch`
7. **Flex-shrink-0 on fixed elements** - Prevent squishing
8. **min-w-0 on truncating elements** - Allow text truncation

---

## Related Documentation

- [BRAND.md](./BRAND.md) - Brand guidelines
- [README.md](../README.md) - Project overview
