import type { ThemePreset, ColorPalette } from '../types';

// Predefined theme presets with industry-standard colors
export const THEME_PRESETS: Record<string, ThemePreset> = {
  'royal-blue': {
    id: 'royal-blue',
    name: 'Royal Blue',
    description: 'Professional blue theme inspired by modern interfaces',
    colors: {
      light: {
        primary: '217 91 67',       // blue-500 in HSL
        primaryHover: '221 83 53',  // blue-600 in HSL
        primaryLight: '214 100 97', // blue-50 in HSL
        primaryDark: '224 76 36',   // blue-700 in HSL
        secondary: '213 96 85',     // blue-300 in HSL
        accent: '212 96 77',        // blue-400 in HSL
      },
      dark: {
        primary: '217 91 67',        // blue-500 in HSL
        primaryHover: '212 96 77',  // blue-400 in HSL
        primaryLight: '222 84 20',   // blue-900 in HSL
        primaryDark: '221 83 53',    // blue-600 in HSL
        secondary: '224 76 36',      // blue-700 in HSL
        accent: '213 96 85',         // blue-300 in HSL
      },
    },
    preview: {
      primary: '#3b82f6',
      secondary: '#1e40af',
    },
  },
  'emerald': {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'Fresh and natural green theme',
    colors: {
      light: {
        primary: '160 84 39',       // emerald-500 in HSL
        primaryHover: '162 84 28',  // emerald-600 in HSL
        primaryLight: '152 81 95',  // emerald-50 in HSL
        primaryDark: '164 85 20',   // emerald-700 in HSL
        secondary: '156 85 66',     // emerald-300 in HSL
        accent: '158 84 49',        // emerald-400 in HSL
      },
      dark: {
        primary: '160 84 39',       // emerald-500 in HSL
        primaryHover: '158 84 49',  // emerald-400 in HSL
        primaryLight: '170 85 8',   // emerald-950 in HSL
        primaryDark: '162 84 28',   // emerald-600 in HSL
        secondary: '164 85 20',     // emerald-700 in HSL
        accent: '156 85 66',        // emerald-300 in HSL
      },
    },
    preview: {
      primary: '#10b981',
      secondary: '#047857',
    },
  },
  'rose': {
    id: 'rose',
    name: 'Rose Pink',
    description: 'Warm and inviting pink theme',
    colors: {
      light: {
        primary: '341 75 55',       // rose-500 in HSL
        primaryHover: '343 81 43',  // rose-600 in HSL
        primaryLight: '346 77 95',  // rose-50 in HSL
        primaryDark: '344 84 32',   // rose-700 in HSL
        secondary: '339 83 75',     // rose-300 in HSL
        accent: '25 95 53',         // orange-300 in HSL (complement)
      },
      dark: {
        primary: '341 75 55',       // rose-500 in HSL
        primaryHover: '339 83 75',  // rose-300 in HSL
        primaryLight: '320 73 15',  // rose-950 in HSL
        primaryDark: '343 81 43',   // rose-600 in HSL
        secondary: '344 84 32',     // rose-700 in HSL
        accent: '25 95 53',         // orange-300 in HSL
      },
    },
    preview: {
      primary: '#f43f5e',
      secondary: '#be185d',
    },
  },
  'indigo': {
    id: 'indigo',
    name: 'Deep Indigo',
    description: 'Rich and sophisticated purple-blue theme',
    colors: {
      light: {
        primary: '243 75 59',       // indigo-500 in HSL
        primaryHover: '245 83 52',  // indigo-600 in HSL
        primaryLight: '238 100 98', // indigo-50 in HSL
        primaryDark: '247 83 40',   // indigo-700 in HSL
        secondary: '239 84 74',     // indigo-300 in HSL
        accent: '241 81 65',        // indigo-400 in HSL
      },
      dark: {
        primary: '243 75 59',       // indigo-500 in HSL
        primaryHover: '241 81 65',  // indigo-400 in HSL
        primaryLight: '250 85 15',  // indigo-950 in HSL
        primaryDark: '245 83 52',   // indigo-600 in HSL
        secondary: '247 83 40',     // indigo-700 in HSL
        accent: '239 84 74',        // indigo-300 in HSL
      },
    },
    preview: {
      primary: '#6366f1',
      secondary: '#4338ca',
    },
  },
  'teal': {
    id: 'teal',
    name: 'Ocean Teal',
    description: 'Calming teal theme inspired by ocean depths',
    colors: {
      light: {
        primary: '178 84 41',       // teal-500 in HSL
        primaryHover: '180 84 28',  // teal-600 in HSL
        primaryLight: '166 76 95',  // teal-50 in HSL
        primaryDark: '181 84 19',   // teal-700 in HSL
        secondary: '174 77 67',     // teal-300 in HSL
        accent: '176 83 50',        // teal-400 in HSL
      },
      dark: {
        primary: '178 84 41',       // teal-500 in HSL
        primaryHover: '176 83 50',  // teal-400 in HSL
        primaryLight: '183 87 8',   // teal-950 in HSL
        primaryDark: '180 84 28',   // teal-600 in HSL
        secondary: '181 84 19',     // teal-700 in HSL
        accent: '174 77 67',        // teal-300 in HSL
      },
    },
    preview: {
      primary: '#14b8a6',
      secondary: '#0f766e',
    },
  },
  'amber': {
    id: 'amber',
    name: 'Golden Amber',
    description: 'Warm amber theme with golden accents',
    colors: {
      light: {
        primary: '38 92 50',        // amber-500 in HSL
        primaryHover: '32 95 44',   // amber-600 in HSL
        primaryLight: '48 96 89',   // amber-50 in HSL
        primaryDark: '26 83 35',    // amber-700 in HSL
        secondary: '43 96 64',      // amber-300 in HSL
        accent: '36 90 55',         // amber-400 in HSL
      },
      dark: {
        primary: '38 92 50',        // amber-500 in HSL
        primaryHover: '36 90 55',   // amber-400 in HSL
        primaryLight: '17 10 3',    // amber-950 in HSL
        primaryDark: '32 95 44',    // amber-600 in HSL
        secondary: '26 83 35',      // amber-700 in HSL
        accent: '43 96 64',         // amber-300 in HSL
      },
    },
    preview: {
      primary: '#f59e0b',
      secondary: '#b45309',
    },
  },
  'violet': {
    id: 'violet',
    name: 'Mystic Violet',
    description: 'Magical violet theme with purple tones',
    colors: {
      light: {
        primary: '262 83 58',       // violet-500 in HSL
        primaryHover: '263 84 48',  // violet-600 in HSL
        primaryLight: '251 91 95',  // violet-50 in HSL
        primaryDark: '264 84 39',   // violet-700 in HSL
        secondary: '257 83 73',     // violet-300 in HSL
        accent: '260 83 65',        // violet-400 in HSL
      },
      dark: {
        primary: '262 83 58',       // violet-500 in HSL
        primaryHover: '260 83 65',  // violet-400 in HSL
        primaryLight: '265 89 12',  // violet-950 in HSL
        primaryDark: '263 84 48',   // violet-600 in HSL
        secondary: '264 84 39',     // violet-700 in HSL
        accent: '257 83 73',        // violet-300 in HSL
      },
    },
    preview: {
      primary: '#8b5cf6',
      secondary: '#6d28d9',
    },
  },
  'sunset': {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Vibrant sunset theme with warm orange tones',
    colors: {
      light: {
        primary: '24 95 53',        // orange-500 in HSL
        primaryHover: '20 83 43',   // orange-600 in HSL
        primaryLight: '33 100 96',  // orange-50 in HSL
        primaryDark: '17 77 35',    // orange-700 in HSL
        secondary: '29 100 66',     // orange-300 in HSL
        accent: '22 93 58',         // orange-400 in HSL
      },
      dark: {
        primary: '24 95 53',        // orange-500 in HSL
        primaryHover: '22 93 58',   // orange-400 in HSL
        primaryLight: '12 76 15',   // orange-950 in HSL
        primaryDark: '20 83 43',    // orange-600 in HSL
        secondary: '17 77 35',      // orange-700 in HSL
        accent: '29 100 66',        // orange-300 in HSL
      },
    },
    preview: {
      primary: '#f97316',
      secondary: '#c2410c',
    },
  },
  'forest': {
    id: 'forest',
    name: 'Forest Green',
    description: 'Deep forest theme with natural green tones',
    colors: {
      light: {
        primary: '142 76 36',       // green-600 in HSL
        primaryHover: '142 69 26',  // green-700 in HSL
        primaryLight: '138 62 82',  // green-100 in HSL
        primaryDark: '142 71 19',   // green-800 in HSL
        secondary: '141 85 61',     // green-400 in HSL
        accent: '142 76 46',        // green-500 in HSL
      },
      dark: {
        primary: '142 76 36',       // green-600 in HSL
        primaryHover: '142 76 46',  // green-500 in HSL
        primaryLight: '143 85 8',   // green-950 in HSL
        primaryDark: '142 69 26',   // green-700 in HSL
        secondary: '142 71 19',     // green-800 in HSL
        accent: '141 85 61',        // green-400 in HSL
      },
    },
    preview: {
      primary: '#16a34a',
      secondary: '#14532d',
    },
  },
  'ocean': {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Deep ocean theme with cool blue tones',
    colors: {
      light: {
        primary: '199 89 48',       // cyan-600 in HSL
        primaryHover: '201 96 32',  // cyan-700 in HSL
        primaryLight: '193 82 77',  // cyan-100 in HSL
        primaryDark: '202 83 24',   // cyan-800 in HSL
        secondary: '197 92 61',     // cyan-400 in HSL
        accent: '198 89 53',        // cyan-500 in HSL
      },
      dark: {
        primary: '199 89 48',       // cyan-600 in HSL
        primaryHover: '198 89 53',  // cyan-500 in HSL
        primaryLight: '202 91 8',   // cyan-950 in HSL
        primaryDark: '201 96 32',   // cyan-700 in HSL
        secondary: '202 83 24',     // cyan-800 in HSL
        accent: '197 92 61',        // cyan-400 in HSL
      },
    },
    preview: {
      primary: '#0891b2',
      secondary: '#164e63',
    },
  },
  'lavender': {
    id: 'lavender',
    name: 'Lavender Dream',
    description: 'Soft lavender theme with gentle purple tones',
    colors: {
      light: {
        primary: '264 64 51',       // purple-500 in HSL
        primaryHover: '266 85 42',  // purple-600 in HSL
        primaryLight: '270 91 95',  // purple-50 in HSL
        primaryDark: '267 84 32',   // purple-700 in HSL
        secondary: '262 83 58',     // purple-300 in HSL
        accent: '263 70 50',        // purple-400 in HSL
      },
      dark: {
        primary: '264 64 51',       // purple-500 in HSL
        primaryHover: '263 70 50',  // purple-400 in HSL
        primaryLight: '270 91 8',   // purple-950 in HSL
        primaryDark: '266 85 42',   // purple-600 in HSL
        secondary: '267 84 32',     // purple-700 in HSL
        accent: '262 83 58',        // purple-300 in HSL
      },
    },
    preview: {
      primary: '#a855f7',
      secondary: '#7c3aed',
    },
  },
};

// Utility functions for theme management
export const getThemeColors = (presetId: string, mode: 'light' | 'dark'): ColorPalette => {
  const preset = THEME_PRESETS[presetId];
  if (!preset) {
    return THEME_PRESETS['royal-blue'].colors[mode];
  }
  return preset.colors[mode];
};

export const getThemePreset = (presetId: string): ThemePreset | null => {
  return THEME_PRESETS[presetId] || null;
};

export const getAllThemePresets = (): ThemePreset[] => {
  return Object.values(THEME_PRESETS);
};

// CSS custom property names for theme colors
export const THEME_CSS_VARS = {
  primary: '--theme-primary',
  primaryHover: '--theme-primary-hover',
  primaryLight: '--theme-primary-light',
  primaryDark: '--theme-primary-dark',
  secondary: '--theme-secondary',
  accent: '--theme-accent',
} as const;

// Apply theme colors to CSS custom properties
export const applyThemeColors = (colors: ColorPalette): void => {
  const root = document.documentElement;

  // Convert space-separated HSL values to comma-separated format for CSS
  const convertHsl = (hsl: string): string => {
    const parts = hsl.split(' ');
    if (parts.length === 3) {
      return `${parts[0]}, ${parts[1]}%, ${parts[2]}%`;
    }
    return hsl;
  };

  root.style.setProperty(THEME_CSS_VARS.primary, convertHsl(colors.primary));
  root.style.setProperty(THEME_CSS_VARS.primaryHover, convertHsl(colors.primaryHover));
  root.style.setProperty(THEME_CSS_VARS.primaryLight, convertHsl(colors.primaryLight));
  root.style.setProperty(THEME_CSS_VARS.primaryDark, convertHsl(colors.primaryDark));
  root.style.setProperty(THEME_CSS_VARS.secondary, convertHsl(colors.secondary));
  root.style.setProperty(THEME_CSS_VARS.accent, convertHsl(colors.accent));
};

// Convert hex color to HSL string (for CSS custom properties)
export const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Generate color palette from a base color
export const generateColorPalette = (baseColor: string): ColorPalette => {
  const hsl = hexToHsl(baseColor);
  const [h, s, l] = hsl.split(' ').map((v, i) => {
    if (i === 0) return parseInt(v);
    return parseInt(v.replace('%', ''));
  });

  return {
    primary: `${h} ${s}% ${l}%`,
    primaryHover: `${h} ${Math.min(s + 10, 100)}% ${Math.max(l - 10, 20)}%`,
    primaryLight: `${h} ${Math.max(s - 30, 10)}% ${Math.min(l + 40, 95)}%`,
    primaryDark: `${h} ${Math.min(s + 20, 100)}% ${Math.max(l - 20, 10)}%`,
    secondary: `${h} ${Math.max(s - 20, 5)}% ${Math.min(l + 20, 90)}%`,
    accent: `${(h + 30) % 360} ${Math.min(s + 15, 100)}% ${Math.min(l + 10, 85)}%`,
  };
};