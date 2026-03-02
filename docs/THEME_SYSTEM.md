# Theme System

## Color Presets

Six presets defined in `src/utils/theme.ts`:

| ID | Name |
|----|------|
| `royal-blue` | Royal Blue |
| `emerald` | Emerald |
| `rose` | Rose |
| `indigo` | Indigo |
| `teal` | Teal |
| `amber` | Amber |

Each preset has `light` and `dark` variants with six HSL values: `primary`, `primaryHover`, `primaryLight`, `primaryDark`, `secondary`, `accent`.

## CSS Custom Properties

Colors are applied as space-separated HSL values on `:root` (`src/index.css`):

```css
:root {
  --theme-primary: 217 91% 67%;
  --theme-primary-hover: 221 83% 53%;
  --theme-primary-light: 214 100% 97%;
  --theme-primary-dark: 224 76% 36%;
  --theme-secondary: 213 96% 85%;
  --theme-accent: 212 96% 77%;
}
```

**Critical**: values must be space-separated (`H S% L%`), not comma-separated. Tailwind v3 uses `hsl(var(--theme-primary) / <alpha-value>)` which only works with this format.

## Tailwind Classes

```javascript
// tailwind.config.js
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
```

Usage: `bg-theme-primary`, `text-theme-primary`, `border-theme-primary`, `bg-theme-primary/10`, etc.

## Dark Mode

Applied via `html.dark` class. Use `dark:` Tailwind variants for non-theme colors:

```tsx
<div className={isDark ? 'bg-dark-200 text-gray-200' : 'bg-light-200 text-gray-800'}>
```

Theme colors (`bg-theme-primary` etc.) adapt automatically — no `dark:` prefix needed.

## Compact Mode

Applied via `html.compact` class when the user enables Compact Mode in Theme Settings.

A custom Tailwind variant is registered in `tailwind.config.js`:

```javascript
require('tailwindcss/plugin')(function({ addVariant }) {
  addVariant('compact', 'html.compact &');
})
```

This generates CSS like:
```css
/* compact:p-1.5 → */
html.compact .compact\:p-1\.5 { padding: 0.375rem; }
```

Use `compact:` prefix directly in JSX alongside responsive variants:

```tsx
<div className="p-3 sm:p-4 compact:p-1.5">
<div className="space-y-3 compact:space-y-1">
<div className="gap-2 compact:gap-1">
```

**Specificity**: `html.compact .compact\:class` = 0-2-0, which beats `sm:class` inside a media query (0-1-0). Compact wins without needing `!important`.

**Never use** `html.compact .my-component { ... }` in CSS files — use the `compact:` Tailwind variant in JSX instead.

## Adding a New Preset

Add to `THEME_PRESETS` in `src/utils/theme.ts`:

```typescript
'custom': {
  id: 'custom',
  name: 'Custom',
  colors: {
    light: {
      primary: '180 50 50',      // H S L (no % symbols in data)
      primaryHover: '180 55 40',
      primaryLight: '180 30 95',
      primaryDark: '180 60 30',
      secondary: '180 25 80',
      accent: '210 60 60',
    },
    dark: { /* same keys */ }
  }
}
```

The preset appears automatically in Theme Settings.

## How Switching Works

1. User picks a preset in Theme Settings
2. `applyThemeColors()` (`src/utils/theme.ts`) calls `convertHsl()` on each value
3. `convertHsl()` outputs `"H S% L%"` (space-separated with percent signs)
4. Values are set via `document.documentElement.style.setProperty('--theme-primary', ...)`
5. All `theme-*` classes update instantly
