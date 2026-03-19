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
        'tdil-blue': '#016a91',
        'tdil-dark': '#003e63',
        'tdil-yellow': '#f6ed17',
        // Override Tailwind blue with brand palette so all blue-* classes use brand colors
        blue: {
          50:  '#e6f2f8',
          100: '#cce5f1',
          200: '#99cbe4',
          300: '#66b0d6',
          400: '#3396c9',
          500: '#005577',  // mid accent
          600: '#006991',  // primary buttons, links, active states
          700: '#005577',  // button hover
          800: '#003e63',  // dark link hover
          900: '#002a44',
          950: '#001530',
        },
        // Override green so green buttons also use brand color
        green: {
          50:  '#e6f4f1',
          100: '#cce8e3',
          200: '#99d1c7',
          300: '#66baab',
          400: '#33a38f',
          500: '#006991',  // brand — same as blue-600
          600: '#006991',  // bg-green-600 buttons → brand color
          700: '#005577',  // hover
          800: '#003e63',
          900: '#002a44',
        },
      }
    },
  },
  plugins: [],
}
