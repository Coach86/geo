import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Monochrome palette
        mono: {
          50: "#FFFFFF", // White
          100: "#F5F5F7", // Very light gray
          200: "#EEEEEE", // Light gray
          300: "#DDDDDD", // Gray
          400: "#8E8E93", // Medium gray
          500: "#636366", // Gray
          600: "#48484A", // Dark gray
          700: "#333333", // Very dark gray
          800: "#1C1C1E", // Almost black
          900: "#000000", // Black
        },

        // Accent color - Violet Blue
        accent: {
          50: "#F4F2FF", // Very light violet
          100: "#E2DDFF", // Light violet
          200: "#C5BBFF", // Soft violet
          300: "#A799FF", // Violet
          400: "#8F7AFF", // Medium violet
          500: "#7B61FF", // Primary violet-blue
          600: "#5B46CC", // Dark violet
          700: "#4A38A9", // Deeper violet
          800: "#382B85", // Very dark violet
          900: "#251D59", // Almost black violet
        },

        // Functional colors
        success: {
          50: "#E8F8EE",
          100: "#D1F2DF",
          500: "#34C759", // Success green
          600: "#2BA84A",
        },
        warning: {
          50: "#FFF9E6",
          100: "#FFF3CC",
          500: "#FFCC00", // Warning yellow
          600: "#E6B800",
        },
        destructive: {
          50: "#FFEBEA",
          100: "#FFD6D4",
          500: "#FF3B30", // Error red
          600: "#E6352B",
          foreground: "#FFFFFF",
        },

        // Legacy colors (keeping for compatibility)
        primary: {
          DEFAULT: "#7B61FF",
          foreground: "#FFFFFF",
          50: "#F4F2FF",
          100: "#E2DDFF",
          200: "#C5BBFF",
          300: "#A799FF",
          400: "#8F7AFF",
          500: "#7B61FF",
          600: "#5B46CC",
          700: "#4A38A9",
          800: "#382B85",
          900: "#251D59",
        },
        secondary: {
          DEFAULT: "#8E8E93",
          foreground: "#FFFFFF",
          50: "#F5F5F7",
          100: "#EEEEEE",
          200: "#DDDDDD",
          300: "#C7C7CC",
          400: "#8E8E93",
          500: "#636366",
          600: "#48484A",
          700: "#333333",
          800: "#1C1C1E",
          900: "#000000",
        },

        muted: {
          DEFAULT: "#F5F5F7",
          foreground: "#636366",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#333333",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#333333",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(0, 0, 0, 0.05)",
        sm: "0 2px 4px rgba(0, 0, 0, 0.05)",
        md: "0 4px 8px rgba(0, 0, 0, 0.05)",
        lg: "0 8px 16px rgba(0, 0, 0, 0.05)",
        xl: "0 12px 24px rgba(0, 0, 0, 0.05)",
        subtle: "0 2px 8px rgba(0, 0, 0, 0.05)",
        glow: "0 0 15px rgba(123, 97, 255, 0.15)",
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
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        gradient: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        scan: {
          "0%": { backgroundPosition: "0% 0%" },
          "100%": { backgroundPosition: "100% 0%" },
        },
        glow: {
          "0%": { boxShadow: "0 0 15px 0 rgba(123, 97, 255, 0.2)" },
          "50%": { boxShadow: "0 0 30px 5px rgba(123, 97, 255, 0.4)" },
          "100%": { boxShadow: "0 0 15px 0 rgba(123, 97, 255, 0.2)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "pulse-slow": "pulse 3s infinite",
        float: "float 6s ease-in-out infinite",
        gradient: "gradient 15s ease infinite alternate",
        scan: "scan 8s linear infinite",
        glow: "glow 4s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "dot-pattern": "radial-gradient(circle, rgba(123, 97, 255, 0.1) 1px, transparent 1px)",
        "grid-pattern":
          "linear-gradient(to right, #EEEEEE 1px, transparent 1px), linear-gradient(to bottom, #EEEEEE 1px, transparent 1px)",
        "scan-line": "linear-gradient(90deg, transparent, rgba(123, 97, 255, 0.2), transparent)",
        "network-pattern": "url('/network-pattern.png')",
      },
      backgroundSize: {
        "dot-pattern": "20px 20px",
        "grid-pattern": "24px 24px",
        "scan-line": "200% 100%",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-inconsolata)", "monospace"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config