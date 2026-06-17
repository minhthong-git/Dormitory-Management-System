/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
          900: '#0f172a',
          850: '#1e293b',
          800: '#334155',
          700: '#475569',
          400: '#94a3b8',
          100: '#f1f5f9',
        },
        primary: {
          DEFAULT: '#8b5cf6', // violet-500
          hover: '#7c3aed',   // violet-600
        },
        success: {
          DEFAULT: '#10b981', // green-500
          hover: '#059669',
        },
        warning: {
          DEFAULT: '#f59e0b', // yellow-500
          hover: '#d97706',
        },
        danger: {
          DEFAULT: '#ef4444', // red-500
          hover: '#dc2626',
        }
      }
    },
  },
  plugins: [],
}
