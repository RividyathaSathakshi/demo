/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        panel: token('panel'),
        'panel-alt': token('panel-alt'),
        ink: token('ink'),
        muted: token('muted'),
        gold: token('gold'),
        rose: token('rose'),
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        line: 'var(--border)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        display: ['3rem', { lineHeight: '3.5rem', letterSpacing: '-0.015em' }],
        h1: ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.01em' }],
        h2: ['1.75rem', { lineHeight: '2.25rem' }],
        h3: ['1.375rem', { lineHeight: '1.875rem' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        body: ['1rem', { lineHeight: '1.625rem' }],
        label: ['0.875rem', { lineHeight: '1.25rem' }],
        caption: ['0.75rem', { lineHeight: '1rem' }],
      },
      maxWidth: {
        content: '72rem',
      },
    },
  },
  plugins: [],
};
