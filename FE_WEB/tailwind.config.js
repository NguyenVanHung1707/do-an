/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          active: '#1E40AF',
        },
        secondary: {
          DEFAULT: '#7C3AED',
          hover: '#6D28D9',
          active: '#5B21B6',
        },
        tertiary: '#6B7280',
        bgDocuforge: '#FAFAFA',
        success: '#16A34A',
        warning: '#CA8A04',
        error: '#DC2626',
        info: '#2563EB',
      },
      fontFamily: {
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        medium: '0 4px 12px 0 rgba(0, 0, 0, 0.06)',
        large: '0 12px 32px 0 rgba(0, 0, 0, 0.10)',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      }
    },
  },
  plugins: [],
}

