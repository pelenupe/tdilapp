/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-gradient-to-br',
    'from-tdil-dark',
    'via-tdil-blue', 
    'to-tdil-dark',
    'text-tdil-yellow',
    'text-tdil-blue',
    'bg-tdil-dark',
    'bg-tdil-blue',
    'bg-tdil-yellow',
    'border-tdil-dark',
    'border-tdil-blue',
    'border-tdil-yellow',
    'hover:bg-tdil-dark',
    'hover:bg-tdil-blue',
    'hover:text-tdil-yellow',
  ],
  theme: {
    extend: {
      colors: {
        'tdil-blue': '#016991',
        'tdil-dark': '#1d1d36', 
        'tdil-yellow': '#f6ed17',
      }
    },
  },
  plugins: [],
}
