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
        background: "#1E1E1E",
        surface: "#2A2A2A",
        "surface-elevated": "#333333",
        border: "#3A3A3A",
        "text-primary": "#FFFFFF",
        "text-secondary": "#A0A0A0",
        "text-muted": "#666666",
        accent: "#C8F135",
        "accent-hover": "#D4F557",
        danger: "#FF4444",
        success: "#22C55E",
        warning: "#F59E0B",
      },
      borderRadius: {
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Display", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
