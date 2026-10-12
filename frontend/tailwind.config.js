/** @type {import('tailwindcss').Config} */
function withOpacity(variableName, alphaVar) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(${variableName}) / ${opacityValue})`;
    }
    if (alphaVar) {
      return `rgb(var(${variableName}) / var(${alphaVar}, 1))`;
    }
    return `rgb(var(${variableName}))`;
  };
}

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Override colors completely to ban default palette (indigo, cyan, violet, etc.)
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      background: withOpacity('--color-background'),
      'background-subtle': withOpacity('--color-background-subtle'),
      surface: withOpacity('--color-surface'),
      'surface-raised': withOpacity('--color-surface-raised'),
      border: withOpacity('--color-border'),
      'border-strong': withOpacity('--color-border-strong'),
      foreground: withOpacity('--color-foreground'),
      'foreground-secondary': withOpacity('--color-foreground-secondary'),
      'foreground-muted': withOpacity('--color-foreground-muted'),
      primary: withOpacity('--color-primary'),
      'primary-hover': withOpacity('--color-primary-hover'),
      'primary-foreground': withOpacity('--color-primary-foreground'),
      accent: withOpacity('--color-accent'),
      'accent-strong': withOpacity('--color-accent-strong'),
      'accent-soft': withOpacity('--color-accent-soft', '--color-accent-soft-alpha'),
      'accent-border': withOpacity('--color-accent-border', '--color-accent-border-alpha'),
      'user-bubble': withOpacity('--color-user-bubble'),
      'user-bubble-foreground': withOpacity('--color-user-bubble-foreground'),
      ring: withOpacity('--color-ring'),
      highlight: withOpacity('--color-highlight', '--color-highlight-alpha'),
      overlay: withOpacity('--color-overlay', '--color-overlay-alpha'),
      success: withOpacity('--color-success'),
      warning: withOpacity('--color-warning'),
      danger: withOpacity('--color-danger'),
      info: withOpacity('--color-info'),
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'Noto Sans Tamil', 'Noto Sans Devanagari', 'Noto Sans Telugu', 'system-ui', 'sans-serif'],
        tamil: ['"Noto Sans Tamil"', 'sans-serif'],
        hindi: ['"Noto Sans Devanagari"', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'elevated': 'var(--shadow-soft)',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '0.8', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.02)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
