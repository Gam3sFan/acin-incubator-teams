/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{html,js,jsx,ts,tsx}',
    './src/main/**/*.{tsx,ts}' // aggiungi altre cartelle se servono
  ],
  theme: { extend: {} },
  plugins: []
}
