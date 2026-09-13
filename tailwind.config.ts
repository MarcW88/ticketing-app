import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0B0D12",
        surface: "#14161F",
        panel: "#1A1D28",
        border: "#272A37",
        accent: "#6366F1",
        ink: "#E9EAF2",
        petrol: { DEFAULT: "#6366F1", deep: "#4338CA" },
        tweed: { DEFAULT: "#8B90A7", deep: "#4B5068" },
        copper: "#6366F1",
        sand: "#E9EAF2",
        cream: "#F8F8FC",
        washBlue: "#1A1D28",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        hauntedPulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
        cursedGlitch: {
          "0%, 94%, 100%": { transform: "translateX(0)", filter: "hue-rotate(0deg)" },
          "95%": { transform: "translateX(-3px)", filter: "hue-rotate(40deg)" },
          "96%": { transform: "translateX(3px)", filter: "hue-rotate(-40deg)" },
          "97%": { transform: "translateX(-1px)" },
          "98%": { transform: "translateX(0)" },
        },
        xpFloat: {
          "0%": { opacity: "0", transform: "translateY(0) scale(0.8)" },
          "20%": { opacity: "1", transform: "translateY(-8px) scale(1.1)" },
          "100%": { opacity: "0", transform: "translateY(-48px) scale(0.9)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        scanIn: {
          "0%": { opacity: "0", transform: "scaleX(0)" },
          "100%": { opacity: "1", transform: "scaleX(1)" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.1)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideRight: {
          "0%": { transform: "translateX(120%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        slideOut: {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(120%)", opacity: "0" },
        },
      },
      animation: {
        "haunted-pulse": "hauntedPulse 2.8s ease-in-out infinite",
        "cursed-glitch": "cursedGlitch 3.5s infinite",
        "xp-float": "xpFloat 1.4s ease-out forwards",
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "scan-in": "scanIn 0.3s ease-out",
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-right": "slideRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-out": "slideOut 0.35s ease-in forwards",
      },
      backgroundSize: {
        "200%": "200%",
      },
    },
  },
  plugins: [],
};

export default config;
