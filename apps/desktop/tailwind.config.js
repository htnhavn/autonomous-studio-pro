/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0d0f14',
          panel: '#141721',
          panelHeader: '#1a1e2b',
          border: '#272c3d',
          accent: '#3b82f6',
          accentHover: '#2563eb',
        },
      },
    },
  },
  plugins: [],
};

