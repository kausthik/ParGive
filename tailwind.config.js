/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          50:  '#f0f9f4',
          100: '#d9f0e4',
          200: '#b3e0ca',
          300: '#7ec9a8',
          400: '#47aa80',
          500: '#1a6b4a',
          600: '#15573c',
          700: '#10432e',
          800: '#0b2f20',
          900: '#061b12',
        },
        gold: {
          100: '#fdf3da',
          200: '#fae7b5',
          400: '#d4a843',
          600: '#a07c2a',
        },
      },
      borderRadius: {
        DEFAULT: '10px',
      },
    },
  },
  plugins: [],
}
