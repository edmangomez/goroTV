/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#131B2E',
        surfaceLight: '#1E293B',
        primary: '#3B82F6',
        primaryHover: '#2563EB',
      }
    },
  },
  plugins: [],
}
