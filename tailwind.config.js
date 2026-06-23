/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#f5f8ff',
        surface: '#ffffff',
        textPrimary: '#0f2a5e',
        textSecondary: '#64748b',
        accent: '#1a87e1',
        accentLight: 'rgba(26, 135, 225, 0.06)',
      }
    },
  },
  plugins: [],
}
