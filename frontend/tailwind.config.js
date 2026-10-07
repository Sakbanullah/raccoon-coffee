/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#101b2d",
          light: "#1b2b45",
        },
        cream: {
          DEFAULT: "#f6f1e7",
          dark: "#e5e0d5",
        },
        moss: {
          DEFAULT: "#5c6b53",
          light: "#7d8b70",
        },
        coffee: {
          DEFAULT: "#6f4e37",
          light: "#8a6a53",
        },
        gold: "#c69a4e",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      maxWidth: {
        editorial: "72rem",
      },
    },
  },
  plugins: [],
};
