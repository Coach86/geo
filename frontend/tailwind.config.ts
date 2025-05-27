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

        // Primary - Orange/Rust (#BE5103)
        primary: {
          DEFAULT: "#BE5103",
          foreground: "#FFFFFF",
          50: '#FEF5ED',
          100: '#FCE7D2',
          200: '#F9CBA5',
          300: '#F5A66D',
          400: '#F17C35',
          500: '#BE5103',
          600: '#A44703',
          700: '#883A02',
          800: '#6D2F02',
          900: '#572501',
        },
        
        // Secondary - Blue (#0474BF)
        secondary: {
          DEFAULT: "#0474BF",
          foreground: "#FFFFFF",
          50: '#E6F3FB',
          100: '#CCE7F7',
          200: '#99CFEF',
          300: '#66B7E7',
          400: '#339FDF',
          500: '#0474BF',
          600: '#035D99',
          700: '#024673',
          800: '#023959',
          900: '#012C46',
        },
        
        // Accent - Teal (#04BF91)
        accent: {
          DEFAULT: "#04BF91",
          foreground: "#FFFFFF",
          50: '#E6FBF5',
          100: '#CCF7EB',
          200: '#99EFD7',
          300: '#66E7C3',
          400: '#33DFAF',
          500: '#04BF91',
          600: '#039974',
          700: '#027357',
          800: '#025945',
          900: '#014634',
        },
        
        // Dark - Navy (#213340)
        dark: {
          DEFAULT: "#213340",
          foreground: "#FFFFFF",
          50: '#E8EAEC',
          100: '#D1D5D9',
          200: '#A3ABB3',
          300: '#75818C',
          400: '#475766',
          500: '#213340',
          600: '#1A2833',
          700: '#141E26',
          800: '#0D141A',
          900: '#070A0D',
        },

        // Functional colors
        success: {
          50: "#E6FBF5",
          100: "#CCF7EB",
          500: "#04BF91", // Using accent color for success
          600: "#039974",
        },
        warning: {
          50: "#FEF5ED",
          100: "#FCE7D2",
          500: "#BE5103", // Using primary color for warning
          600: "#A44703",
        },
        destructive: {
          50: "#FFEBEA",
          100: "#FFD6D4",
          500: "#DC2626", // Keeping a true red for errors
          600: "#B91C1C",
          foreground: "#FFFFFF",
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