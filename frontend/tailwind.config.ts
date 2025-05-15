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
        primary: {
          DEFAULT: "#1976D2", // Bleu Carta
          foreground: "hsl(var(--primary-foreground))",
        },
        "primary-dark": "#0D47A1", // Bleu foncé Carta
        secondary: {
          DEFAULT: "#F57C00", // Orange Carta
          foreground: "#FFF3E0",
        },
        destructive: {
          DEFAULT: "#C62828", // Rouge Carta
          foreground: "#FFEBEE",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "#64B5F6", // Bleu clair Carta
          foreground: "#E3F2FD",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Nouvelle palette de couleurs professionnelle
        professional: {
          // Bleus profonds pour les valeurs positives/élevées
          positive: {
            light: "#E3F2FD",
            DEFAULT: "#2196F3",
            dark: "#0D47A1",
            text: "#0D47A1",
          },
          // Violets/indigos pour les valeurs neutres/moyennes
          neutral: {
            light: "#EDE7F6",
            DEFAULT: "#673AB7",
            dark: "#311B92",
            text: "#4527A0",
          },
          // Teintes de bordeaux pour les valeurs négatives/basses
          negative: {
            light: "#FCE4EC",
            DEFAULT: "#C2185B",
            dark: "#880E4F",
            text: "#AD1457",
          },
          // Teintes de gris pour les éléments neutres
          gray: {
            light: "#F5F5F5",
            DEFAULT: "#9E9E9E",
            dark: "#424242",
            text: "#616161",
          },
          // Teintes de teal pour les accents
          accent: {
            light: "#E0F2F1",
            DEFAULT: "#009688",
            dark: "#00695C",
            text: "#00796B",
          },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
} satisfies Config

export default config
