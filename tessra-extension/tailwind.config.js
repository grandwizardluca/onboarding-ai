/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./*.html"],
  theme: {
    extend: {
      colors: {
        // Extension sidebar design tokens
        sidebar: {
          bg: "#0f0f1a",
          border: "#1e1e3a",
          header: "#13132a",
        },
        accent: "#6366f1",
        "accent-hover": "#4f46e5",
        "user-msg": "#1e1e3a",
        "assistant-msg": "transparent",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
