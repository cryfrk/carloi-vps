import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#0f172a',
        muted: '#64748b',
        border: '#e2e8f0',
        accent: '#0f9aa8',
        accentSoft: '#ecfeff',
        success: '#16a34a',
        warning: '#f59e0b',
        danger: '#dc2626',
      },
      boxShadow: {
        dock: '0 24px 50px rgba(15, 23, 42, 0.16)',
        card: '0 18px 38px rgba(15, 23, 42, 0.08)',
      },
      backdropBlur: {
        dock: '18px',
      },
      maxWidth: {
        app: '1200px',
      },
      keyframes: {
        dockFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-2px)' },
        },
      },
      animation: {
        dockFloat: 'dockFloat 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
