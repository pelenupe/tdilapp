/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
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
