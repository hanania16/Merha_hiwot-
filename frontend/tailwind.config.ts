import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111111',
        gold: '#D4AF37',
        paper: '#FFFFFF',
        mist: '#F5F5F5',
        slate: '#4B5563',
        status: {
          present: '#16A34A',
          absent: '#DC2626',
          permission: '#EAB308',
          warning: '#F97316',
          longabsence: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};
export default config;
