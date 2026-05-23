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
        canvas: '#FAFAFA',
        surface: '#FFFFFF',
        ink: '#0A0A0A',
        steel: '#525252',
        whisper: '#E5E5E5',
        'whisper-soft': '#F5F5F5',
        klein: {
          DEFAULT: '#0040FF',
          deep: '#0033CC',
          soft: '#3D5AFE',
          tint: '#EEF2FF',
        },
        cyan: {
          signal: '#06B6D4',
        },
        emerald: {
          signal: '#10B981',
        },
        amber: {
          signal: '#F59E0B',
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
