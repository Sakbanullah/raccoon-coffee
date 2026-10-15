/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // shadcn semantic tokens, mapped onto the Raccoon palette so
        // components under components/ui style correctly.
        background: "#171A18",
        surface: "#222824",
        "surface-elevated": "#292F2A",
        "brand-primary": "#025244",
        "brand-primary-hover": "#036653",
        "brand-accent": "#B5601B",
        foreground: "#E8E4DA",
        "muted-foreground": "#A6ADA6",
        border: "#39423B",
        input: "#292F2A",
        destructive: "#C65D53",
        // Preserve existing palette for other parts of site
        primary: { DEFAULT: "#174D3D", foreground: "#F4EBDD" },
        secondary: { DEFAULT: "#E6D9C5", foreground: "#1F261F" },
        muted: { DEFAULT: "#E6D9C5", foreground: "#5c6b53" },
        accent: { DEFAULT: "#E6D9C5", foreground: "#1F261F" },
        ring: "#C69A4E",
        forest: { DEFAULT: "#174D3D", deep: "#10382D", light: "#1E5A4A" },
        navy: { DEFAULT: "#174D3D", deep: "#10382D", light: "#1E5A4A" },
        cream: { DEFAULT: "#F4EBDD", dark: "#E6D9C5", paper: "#F9F1E3" },
        moss: { DEFAULT: "#5c6b53", light: "#7d8b70" },
        coffee: { DEFAULT: "#6F4E37", light: "#8a6a53" },
        gold: { DEFAULT: "#C69A4E", light: "#D8B06A", muted: "#B8923A" },
        ink: { DEFAULT: "#1F261F", muted: "#2E3830" },
        // Warm editorial neutrals adapted from the Kario reference palette.
        sand: "#DFDBD3",
        bark: "#483827",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        script: ["var(--font-script)", "cursive"],
        body: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      maxWidth: { editorial: "72rem" },
    },
  },
  plugins: [],
};
