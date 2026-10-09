/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./*.html",
    "./**/*.html",
    "./js/**/*.js",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'IBM Plex Sans Arabic'", "'Cairo'", "'Tajawal'", 'sans-serif'],
        cairo: ["'Cairo'", 'sans-serif'],
        tajawal: ["'Tajawal'", 'sans-serif'],
        ibm: ["'IBM Plex Sans Arabic'", 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#22553d',
          hover: '#19422e',
          light: '#eef5f1',
          primary: '#12372A',
          secondary: '#436850',
          canvas: '#FBFADA',
          accent: '#D4A373',
          dark: '#0A2018',
          soft: '#EAF1ED',
          gold: '#d6a950',
          legacy: '#1c5335',
          legacyDark: '#143e27',
          legacySoft: '#edf5f0',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(18, 55, 42, 0.05), 0 2px 6px -1px rgba(18, 55, 42, 0.03)',
        'card-hover': '0 12px 28px -4px rgba(18, 55, 42, 0.10), 0 6px 12px -2px rgba(18, 55, 42, 0.05)',
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
