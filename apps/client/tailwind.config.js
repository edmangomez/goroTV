/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      'tv': '1024px',
      'tablet': {'min': '768px', 'max': '1023px'},
      'mobile': {'max': '767px'},
    },
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#131B2E',
        surfaceLight: '#1E293B',
        primary: '#3B82F6',
        primaryHover: '#2563EB',
        tvFocus: '#3B82F6',
      },
      boxShadow: {
        'tv-focus': '0 0 25px rgba(59, 130, 246, 0.5)',
      }
    },
  },
  plugins: [],
}
