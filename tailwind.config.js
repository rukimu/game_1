/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        parchment: "#f1e7c8",
        ink: "#2b1d0e",
        brand: "#7a4a1c",
        gold: "#c89a3a",
        crimson: "#7c1d1d",
        forest: "#2d5a3d",
      },
      fontFamily: {
        retro: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
