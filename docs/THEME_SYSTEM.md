# Samvada Studio - Theme System Documentation

## Overview

Samvada Studio features a comprehensive, dynamic theming system that allows users to customize the application's appearance with different accent colors while maintaining full dark/light mode support. The system is built on CSS custom properties and Tailwind CSS, providing a future-proof, plug-and-play architecture.

## Architecture

### 1. Theme Presets (`src/utils/theme.ts`)

Six pre-defined color themes are available:

| Preset ID | Name | Primary Color |
|-----------|------|---------------|
| `royal-blue` | Royal Blue | Blue tones |
| `emerald` | Emerald | Green tones |
| `rose` | Rose | Pink/Red tones |
| `indigo` | Indigo | Purple-Blue tones |
| `teal` | Teal | Blue-Green tones |
| `amber` | Amber | Orange-Yellow tones |

Each preset defines colors for both light and dark modes:
- `primary` - Main accent color
- `primaryHover` - Hover state for buttons
- `primaryLight` - Light backgrounds
- `primaryDark` - Dark emphasis
- `secondary` - Secondary accents
- `accent` - Complementary accent

### 2. CSS Custom Properties (`src/index.css`)

Theme colors are exposed as CSS custom properties using **space-separated HSL format** (required by Tailwind CSS v3+):

```css
:root {
  --theme-primary: 217 91% 67%;       /* HSL values - SPACE-SEPARATED */
  --theme-primary-hover: 221 83% 53%;
  --theme-primary-light: 214 100% 97%;
  --theme-primary-dark: 224 76% 36%;
  --theme-secondary: 213 96% 85%;
  --theme-accent: 212 96% 77%;
}
```

⚠️ **Critical Note**: CSS custom properties must use **space-separated** HSL values (`H S L`), not comma-separated (`H, S%, L%`). This is required for Tailwind CSS v3+'s modern HSL syntax.

### 3. Tailwind Configuration (`tailwind.config.js`)

Custom theme colors are mapped to Tailwind classes:

```javascript
theme: {
  extend: {
    colors: {
      theme: {
        primary: 'hsl(var(--theme-primary) / <alpha-value>)',
        'primary-hover': 'hsl(var(--theme-primary-hover) / <alpha-value>)',
        'primary-light': 'hsl(var(--theme-primary-light) / <alpha-value>)',
        'primary-dark': 'hsl(var(--theme-primary-dark) / <alpha-value>)',
        secondary: 'hsl(var(--theme-secondary) / <alpha-value>)',
        accent: 'hsl(var(--theme-accent) / <alpha-value>)',
      }
    }
  }
}
```

## Usage Guide

### Available Theme Classes

Use these Tailwind classes for theme-aware styling:

| Class | Usage |
|-------|-------|
| `bg-theme-primary` | Primary button backgrounds, active states |
| `bg-theme-primary-hover` | Button hover states |
| `bg-theme-primary-light` | Light backgrounds, badges |
| `bg-theme-primary/10` | Subtle backgrounds with opacity |
| `text-theme-primary` | Primary text, links |
| `border-theme-primary` | Active borders, focus states |
| `ring-theme-primary` | Focus rings |

### Button Patterns

```tsx
// Primary Button
<button className="bg-theme-primary hover:bg-theme-primary-hover text-white">
  Click Me
</button>

// Secondary/Outline Button
<button className="border-2 border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white">
  Secondary
</button>

// Ghost Button
<button className="text-theme-primary hover:bg-theme-primary/10">
  Ghost
</button>
```

### Focus States

```tsx
// Input with focus
<input className="focus:border-theme-primary focus:ring-theme-primary" />

// Focusable element
<div className="focus-visible:ring-2 focus-visible:ring-theme-primary" />
```

### Active/Selected States

```tsx
// Active tab
<button className={`${isActive ? 'bg-theme-primary text-white' : 'text-gray-600'}`}>
  Tab
</button>

// Selected item
<div className={`${isSelected ? 'bg-theme-primary/20 border-theme-primary' : 'border-transparent'}`}>
  Item
</div>
```

### Badges and Indicators

```tsx
// Active indicator
<span className="bg-theme-primary/20 text-theme-primary px-2 py-1 rounded">
  Active
</span>

// Light badge (works in both modes)
<span className="bg-theme-primary-light text-theme-primary-dark">
  Badge
</span>
```

### Links

```tsx
<a className="text-theme-primary hover:text-theme-primary-hover underline">
  Link Text
</a>
```

## Semantic Colors (Do NOT Replace)

Keep these semantic colors for their intended purposes:

| Color | Usage |
|-------|-------|
| `text-red-*`, `bg-red-*` | Errors, destructive actions, warnings |
| `text-green-*`, `bg-green-*` | Success states, positive feedback |
| `text-yellow-*`, `bg-yellow-*` | Warnings, caution states |
| `text-gray-*`, `bg-gray-*` | Neutral UI, disabled states |
| Toast `info` type | Uses blue for semantic meaning |

## Dark Mode Integration

The theme system works seamlessly with dark mode:

```tsx
// Theme colors automatically adapt - no need for dark: prefix
<button className="bg-theme-primary text-white">
  Works in both modes
</button>

// For non-theme colors, use dark: prefix
<div className={isDark ? 'bg-dark-200 text-gray-200' : 'bg-light-200 text-gray-800'}>
  Manual dark mode handling
</div>
```

## How Theme Switching Works

1. User selects a theme preset in Theme Settings
2. `applyThemeColors()` is called from `theme.ts`
3. CSS custom properties are updated on the document root using `convertHsl()`
4. All `theme-*` classes automatically reflect the new colors

```typescript
// From theme.ts - convertHsl() function
const convertHsl = (hsl: string): string => {
  const parts = hsl.split(' ');
  if (parts.length === 3) {
    // CRITICAL: Must return SPACE-SEPARATED format for Tailwind CSS v3+
    return `${parts[0]} ${parts[1]}% ${parts[2]}%`; // "217 91% 67%" not "217, 91%, 67%"
  }
  return hsl;
};

// applyThemeColors() function
export const applyThemeColors = (colors: ColorPalette): void => {
  const root = document.documentElement;
  root.style.setProperty('--theme-primary', convertHsl(colors.primary));
  root.style.setProperty('--theme-primary-hover', convertHsl(colors.primaryHover));
  // ... etc
};
```

### The Critical Bug (Fixed February 2026)

**Root Cause**: The `convertHsl()` function was outputting comma-separated HSL format (`"217, 91%, 67%"`) but Tailwind CSS v3+ requires space-separated format (`"217 91% 67%"`).

**Impact**: All theme colors appeared as white/transparent because CSS custom properties were invalid.

**Fix**: Changed `convertHsl()` to return space-separated values, ensuring compatibility with Tailwind's modern HSL syntax: `hsl(H S L / alpha)`.

## Adding New Theme Presets

To add a new theme preset:

1. Add the preset to `THEME_PRESETS` in `theme.ts`:

```typescript
'custom-theme': {
  id: 'custom-theme',
  name: 'Custom Theme',
  colors: {
    light: {
      primary: '180 50 50',        // H S L values
      primaryHover: '180 55 40',
      primaryLight: '180 30 95',
      primaryDark: '180 60 30',
      secondary: '180 25 80',
      accent: '210 60 60',
    },
    dark: {
      // Same structure with dark-mode optimized values
    }
  }
}
```

2. The preset will automatically appear in Theme Settings modal.

## Migration from Legacy Colors

If you find legacy color classes, replace them as follows:

| Legacy Class | Theme-Aware Class |
|--------------|-------------------|
| `bg-primary-600` | `bg-theme-primary` |
| `hover:bg-primary-700` | `hover:bg-theme-primary-hover` |
| `bg-primary-500` | `bg-theme-primary` |
| `bg-primary-100` | `bg-theme-primary-light` |
| `text-primary-600` | `text-theme-primary` |
| `text-primary-400` | `text-theme-primary` |
| `border-primary-500` | `border-theme-primary` |
| `ring-primary-500` | `ring-theme-primary` |
| `focus:ring-primary-500` | `focus:ring-theme-primary` |

## Smooth Transitions

Theme transitions are smooth thanks to CSS:

```css
/* In index.css */
.bg-theme-primary,
.text-theme-primary,
.border-theme-primary {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

## Technical Deep Dive: HSL Format Compatibility

### The Evolution of HSL in CSS

**Legacy HSL Syntax (CSS Color Module Level 3)**:
```css
/* Comma-separated - OLD format */
color: hsl(217, 91%, 67%);
background: hsl(217, 91%, 67%, 0.5); /* with alpha */
```

**Modern HSL Syntax (CSS Color Module Level 4)**:
```css
/* Space-separated - NEW format (Tailwind CSS v3+) */
color: hsl(217 91% 67%);
background: hsl(217 91% 67% / 0.5); /* alpha separated by slash */
```

### Why This Matters for Theme Systems

1. **Tailwind CSS v3+** uses the modern syntax: `hsl(var(--theme-primary) / <alpha-value>)`
2. **CSS Custom Properties** must match the expected format
3. **Mismatch causes invalid colors** → white/transparent appearance

### The Bug Propagation

```
Theme Preset Data → convertHsl() → CSS Custom Property → Tailwind → Component
     "217 91 67"  →  "217, 91%, 67%"  →  --theme-primary  →  hsl(var(--theme-primary) / 0.5)
                                      ❌ Invalid format   ❌ Not recognized
```

**Result**: All `bg-theme-primary`, `text-theme-primary`, etc. classes rendered as transparent/white.

### The Fix

```typescript
// BEFORE (broken)
const convertHsl = (hsl: string): string => {
  const parts = hsl.split(' ');
  return `${parts[0]}, ${parts[1]}%, ${parts[2]}%`; // ❌ Comma-separated
};

// AFTER (fixed)
const convertHsl = (hsl: string): string => {
  const parts = hsl.split(' ');
  return `${parts[0]} ${parts[1]}% ${parts[2]}%`; // ✅ Space-separated
};
```

### Lesson Learned

Always verify CSS format compatibility when upgrading CSS frameworks. Modern CSS specifications introduce breaking changes in color syntax that can silently break theming systems.

## Files Updated

The following components now use theme-aware colors:

### Core Components
- `App.tsx` - Header, navigation, branding
- `Sidebar.tsx` - New chat button, dropdowns
- `ChatArea.tsx` - Provider selector, settings

### Chat Components
- `PromptInput.tsx` - Send button, formatting toolbar, indicators
- `PromptResponseItem.tsx` - User avatar, edit buttons, quote button
- `MessageContent.tsx` - Links, code blocks, blockquotes
- `ChatSettings.tsx` - Buttons, toggles, badges

### Modal Components
- `ExportModal.tsx` - Format selection, export button
- `StarredModal.tsx` - Header accent, badges
- `TemplatesLibrary.tsx` - Buttons, category pills
- `ThemeSettingsModal.tsx` - Preview elements

### Admin Components
- `AdminPanel.tsx` - Tabs, add provider button
- `ProviderForm.tsx` - Submit button, selection states
- `ProviderCard.tsx` - Active states, links
- `DeveloperTools.tsx` - Run button, badges
- `LocalNetworkAccess.tsx` - Grant buttons, info boxes
- `PWAStatusPanel.tsx` - Install button, tips

### Common Components
- `CommandPalette.tsx` - Selected item highlight
- `ConnectionStatus.tsx` - Reconnect button
- `SearchBar.tsx` - Focus states
- `GlobalSearch.tsx` - Loading spinner, matches
- `ContextPanel.tsx` - Add button, active states

### Sidebar Components
- `ChatListItem.tsx` - Active/selected states, checkbox
- `FoldersSection.tsx` - Add folder button, focus rings

### Global Styles
- `index.css` - Selection color, focus rings, prose code

## Version History

- **v1.1 - February 2026** - Critical HSL format bug fix
  - Fixed `convertHsl()` function to use space-separated HSL format
  - Resolved theme colors appearing white/transparent
  - Updated documentation with modern CSS HSL syntax requirements
  - Added technical deep-dive section on HSL format evolution

- **v1.0** - Initial theme system implementation with 6 presets
- All components migrated from hardcoded `primary-*` and `blue-*` colors to theme-aware classes
