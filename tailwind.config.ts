import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0c10",
        panel: "#0f1118",
        card: "#121526",
        "accent-green": "#46e6a6",
        "accent-blue": "#6ea8ff",
        "accent-violet": "#a78bfa",
        warning: "#ffd166",
        danger: "#ff5c7a",
        muted: "#9aa3b2",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "radial-blue": "radial-gradient(ellipse at top left, rgba(110,168,255,0.12) 0%, transparent 60%)",
        "radial-violet": "radial-gradient(ellipse at top right, rgba(167,139,250,0.10) 0%, transparent 60%)",
        "radial-green": "radial-gradient(ellipse at bottom, rgba(70,230,166,0.07) 0%, transparent 60%)",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.4)",
        glow: "0 0 24px rgba(70,230,166,0.2)",
        "glow-blue": "0 0 24px rgba(110,168,255,0.2)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
