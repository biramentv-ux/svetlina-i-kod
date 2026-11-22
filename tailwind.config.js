/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)", surface: "var(--surface)", raised: "var(--raised)", hover: "var(--hover)",
        ink: "var(--ink)", fg: "var(--fg)", soft: "var(--soft)", mute: "var(--mute)", faint: "var(--faint)",
        accent: "var(--accent)", "accent-dim": "var(--accent-dim)", primary: "var(--primary)", "on-primary": "var(--on-primary)",
        second: "var(--second)", warn: "var(--warn)", danger: "var(--danger)", glow: "var(--glow)", line: "var(--line)", "line-strong": "var(--line-strong)", scrim: "var(--scrim)",
      },
      borderRadius: {
        xl: "var(--radius)", lg: "calc(var(--radius) - 4px)",
        md: "calc(var(--radius) - 6px)",
        sm: "calc(var(--radius) - 9px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
