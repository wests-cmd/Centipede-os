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
        // Strict 3 Primary Color Tokens + Grayscale Utilities
        // Color 1: Primary Dark Background (#020617 / slate-950)
        // Color 2: System Active Accent (#2563eb / blue-600)
        // Color 3: Security Critical Alert (#dc2626 / red-600)
        brand: {
          dark: '#020617',
          active: '#2563eb',
          alert: '#dc2626',
        }
      }
    },
  },
  plugins: [],
}
