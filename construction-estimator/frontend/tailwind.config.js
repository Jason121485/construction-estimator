/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:   { DEFAULT: '#0f3460', dark: '#0a2444', light: '#1a4a80' },
        accent: { DEFAULT: '#e94560', dark: '#c23351', light: '#ff6680' },
        surface:{ DEFAULT: '#16213e', dark: '#0d1a30' },
        base:   { DEFAULT: '#1a1a2e' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
