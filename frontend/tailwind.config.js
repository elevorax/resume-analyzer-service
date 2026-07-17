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
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#DBEAFE',
        },
        secondary: {
          DEFAULT: '#3B82F6',
        },
        background: '#F8FAFC',
        surface: '#FFFFFF',
        success: {
          DEFAULT: '#16A34A',
          bg: '#DCFCE7',
        },
        error: {
          DEFAULT: '#DC2626',
          bg: '#FEE2E2',
        },
        warning: {
          DEFAULT: '#D97706',
          bg: '#FEF3C7',
        },
        text: {
          primary: '#1E293B',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}


