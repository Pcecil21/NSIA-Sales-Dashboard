/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0F1729", light: "#1E293B", border: "#334155" },
        ice: { DEFAULT: "#60A5FA", dark: "#2E75B6", light: "#EBF5FF" },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"DM Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
