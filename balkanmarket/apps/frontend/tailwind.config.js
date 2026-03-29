/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#0d0f14",
        surface: "#161a24",
        border:  "#252a38",
        accent:  "#6366f1",
        green:   "#10b981",
        red:     "#ef4444",
        muted:   "#6b7280",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["DM Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
