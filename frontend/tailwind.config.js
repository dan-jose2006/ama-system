/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* IBM Blue — primary actions, focus rings, links */
        brand: {
          50:  '#eef4ff',
          100: '#d8e9ff',
          200: '#bad4ff',
          300: '#8ab8ff',
          400: '#4d8eff',
          500: '#0F62FE', // IBM Blue primary
          600: '#0353e9',
          700: '#0043ce',
          800: '#002d9c',
          900: '#001d6c',
          950: '#001141',
        },
        /* Teal — accent, success, highlights */
        accent: {
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14B8A6',
          600: '#0d9488',
          700: '#0f766e',
        },
        /* Zinc neutral — surfaces, borders, text */
        surface: {
          50:  '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#0F0F13', /* App background */
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.35s ease both',
        'slide-up': 'slideUp 0.35s ease both',
        'scale-in': 'scaleIn 0.25s ease both',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      borderRadius: {
        xl:  '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
