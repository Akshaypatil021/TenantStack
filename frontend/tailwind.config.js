/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Gilroy', 'Inter', 'sans-serif'],
        nexover: ['Plus Jakarta Sans', 'Gilroy', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Gilroy', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

