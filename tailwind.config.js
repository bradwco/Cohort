/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0d0e18',
          deeper: '#08090f',
          panel: 'rgba(232, 227, 216, 0.02)',
        },
        ink: {
          DEFAULT: '#e8e3d8',
          dim: 'rgba(232, 227, 216, 0.65)',
          faint: 'rgba(232, 227, 216, 0.4)',
        },
        line: {
          DEFAULT: 'rgba(232, 227, 216, 0.08)',
          mid: 'rgba(232, 227, 216, 0.15)',
        },
        amber: {
          DEFAULT: '#E8A87C',
          dim: 'rgba(232, 168, 124, 0.5)',
        },
        cool: {
          blue: '#7CB0E8',
          purple: '#B89AE8',
          green: '#9CE8A8',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        pulse2: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.7', transform: 'scale(0.95)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        flash: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        pulse2: 'pulse2 2.4s ease-in-out infinite',
        'pulse-fast': 'pulse2 1.4s ease-in-out infinite',
        breathe: 'breathe 3s ease-in-out infinite',
        flash: 'flash 0.3s ease-in-out 3',
        fadeUp: 'fadeUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) backwards',
        fadeIn: 'fadeIn 0.3s',
      },
    },
  },
  plugins: [],
};
