import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Geist',
          'PingFang SC',
          'Noto Sans SC',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        mono: [
          '"Geist Mono"',
          '"JetBrains Mono"',
          'ui-monospace',
          'monospace',
        ],
      },
      colors: {
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        steel: 'rgb(var(--color-steel) / <alpha-value>)',
        whisper: 'rgb(var(--color-whisper) / <alpha-value>)',
        'whisper-soft': 'rgb(var(--color-whisper-soft) / <alpha-value>)',
        klein: {
          DEFAULT: 'rgb(var(--color-klein) / <alpha-value>)',
          deep: 'rgb(var(--color-klein-deep) / <alpha-value>)',
          soft: 'rgb(var(--color-klein-soft) / <alpha-value>)',
          tint: 'rgb(var(--color-klein-tint) / <alpha-value>)',
        },
        cyan: {
          signal: 'rgb(var(--color-cyan-signal) / <alpha-value>)',
        },
        emerald: {
          signal: 'rgb(var(--color-emerald-signal) / <alpha-value>)',
        },
        amber: {
          signal: 'rgb(var(--color-amber-signal) / <alpha-value>)',
        },
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
      borderRadius: {
        chip: '4px',
      },
    },
  },
  plugins: [],
} satisfies Config
