/**
 * Brand Intelligence Report color scheme - based on original design
 */

// Primary colors
export const colors = {
  primary: {
    DEFAULT: "#1976D2",
    dark: "#0D47A1",
    light: "#64B5F6",
    ultraLight: "#E3F2FD"
  },
  secondary: {
    DEFAULT: "#F57C00",
    foreground: "#FFF3E0"
  },
  destructive: {
    DEFAULT: "#C62828",
    foreground: "#FFEBEE"
  },
  // Status colors
  status: {
    positive: {
      light: "#E3F2FD",
      DEFAULT: "#2196F3",
      dark: "#0D47A1",
      text: "#0D47A1"
    },
    neutral: {
      light: "#EDE7F6",
      DEFAULT: "#673AB7",
      dark: "#311B92",
      text: "#4527A0"
    },
    negative: {
      light: "#FCE4EC",
      DEFAULT: "#C2185B",
      dark: "#880E4F",
      text: "#AD1457"
    }
  },
  // Accent colors
  accent: {
    light: "#E0F2F1",
    DEFAULT: "#009688",
    dark: "#00695C",
    text: "#00796B"
  },
  // Grayscale
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827"
  }
};

// Helper functions
export const getSentimentColor = (status: 'green' | 'yellow' | 'red' | string): string => {
  return status === "green" 
    ? colors.status.positive.text
    : status === "yellow" 
      ? colors.status.neutral.text
      : colors.status.negative.text;
};

export const getSentimentBgColor = (status: 'green' | 'yellow' | 'red' | string): string => {
  return status === "green" 
    ? colors.status.positive.light
    : status === "yellow" 
      ? colors.status.neutral.light
      : colors.status.negative.light;
};

export default colors;