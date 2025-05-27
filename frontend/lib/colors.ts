// Brand Color Palette
export const colors = {
  // Primary - Orange/Rust (#BE5103)
  primary: {
    50: '#FEF5ED',
    100: '#FCE7D2',
    200: '#F9CBA5',
    300: '#F5A66D',
    400: '#F17C35',
    500: '#BE5103', // Base
    600: '#A44703',
    700: '#883A02',
    800: '#6D2F02',
    900: '#572501',
  },
  
  // Secondary - Blue (#0474BF)
  secondary: {
    50: '#E6F3FB',
    100: '#CCE7F7',
    200: '#99CFEF',
    300: '#66B7E7',
    400: '#339FDF',
    500: '#0474BF', // Base
    600: '#035D99',
    700: '#024673',
    800: '#023959',
    900: '#012C46',
  },
  
  // Accent - Teal (#04BF91)
  accent: {
    50: '#E6FBF5',
    100: '#CCF7EB',
    200: '#99EFD7',
    300: '#66E7C3',
    400: '#33DFAF',
    500: '#04BF91', // Base
    600: '#039974',
    700: '#027357',
    800: '#025945',
    900: '#014634',
  },
  
  // Dark - Navy (#213340)
  dark: {
    50: '#E8EAEC',
    100: '#D1D5D9',
    200: '#A3ABB3',
    300: '#75818C',
    400: '#475766',
    500: '#213340', // Base
    600: '#1A2833',
    700: '#141E26',
    800: '#0D141A',
    900: '#070A0D',
  },
  
  // Semantic colors
  success: {
    light: '#CCF7EB',
    DEFAULT: '#04BF91',
    dark: '#027357',
  },
  
  warning: {
    light: '#FCE7D2',
    DEFAULT: '#BE5103',
    dark: '#883A02',
  },
  
  error: {
    light: '#FEE2E2',
    DEFAULT: '#DC2626',
    dark: '#991B1B',
  },
  
  info: {
    light: '#CCE7F7',
    DEFAULT: '#0474BF',
    dark: '#024673',
  },
}

// Tailwind class mappings
export const colorClasses = {
  primary: {
    bg: 'bg-[#BE5103]',
    bgHover: 'hover:bg-[#A44703]',
    text: 'text-[#BE5103]',
    border: 'border-[#BE5103]',
    ring: 'ring-[#BE5103]',
  },
  secondary: {
    bg: 'bg-[#0474BF]',
    bgHover: 'hover:bg-[#035D99]',
    text: 'text-[#0474BF]',
    border: 'border-[#0474BF]',
    ring: 'ring-[#0474BF]',
  },
  accent: {
    bg: 'bg-[#04BF91]',
    bgHover: 'hover:bg-[#039974]',
    text: 'text-[#04BF91]',
    border: 'border-[#04BF91]',
    ring: 'ring-[#04BF91]',
  },
  dark: {
    bg: 'bg-[#213340]',
    bgHover: 'hover:bg-[#1A2833]',
    text: 'text-[#213340]',
    border: 'border-[#213340]',
    ring: 'ring-[#213340]',
  },
}