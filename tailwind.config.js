/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dynamic theme colors using CSS custom properties
        theme: {
          primary: 'hsl(var(--theme-primary) / <alpha-value>)',
          'primary-hover': 'hsl(var(--theme-primary-hover) / <alpha-value>)',
          'primary-light': 'hsl(var(--theme-primary-light) / <alpha-value>)',
          'primary-dark': 'hsl(var(--theme-primary-dark) / <alpha-value>)',
          secondary: 'hsl(var(--theme-secondary) / <alpha-value>)',
          accent: 'hsl(var(--theme-accent) / <alpha-value>)',
        },
        // Legacy primary colors (keeping for backward compatibility)
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          100: '#1e1e2e',
          200: '#1a1a2e',
          300: '#16162a',
          400: '#121226',
          500: '#0e0e22',
        },
        light: {
          100: '#ffffff',
          200: '#f8fafc',
          300: '#f1f5f9',
          400: '#e2e8f0',
          500: '#cbd5e1',
        }
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['var(--font-size-base)', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
    },
  },
  plugins: [],
}
