/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  darkMode: 'media',
  variants: {
    typography: ['responsive'],
  },
  plugins: [require('@tailwindcss/typography')],
}
