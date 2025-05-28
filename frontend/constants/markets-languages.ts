// Map of countries to their default languages
export const countryToLanguage: Record<string, string[]> = {
  "United States": ["English"],
  "United Kingdom": ["English"],
  Canada: ["English", "Français"],
  Australia: ["English"],
  France: ["Français"],
  Germany: ["Deutsch"],
  Japan: ["日本語"],
  China: ["中文"],
  India: ["English", "हिन्दी"],
  Brazil: ["Português"],
  Mexico: ["Español"],
  Spain: ["Español"],
  Italy: ["Italiano"],
  Netherlands: ["Nederlands"],
  Sweden: ["Svenska"],
  Switzerland: ["Deutsch", "Français", "Italiano"],
  Singapore: ["English", "中文"],
  "South Korea": ["한국어"],
  Russia: ["Русский"],
  "South Africa": ["English"],
};

// List of countries with their flags
export const countries = [
  { value: "United States", label: "🇺🇸 United States" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "France", label: "🇫🇷 France" },
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "Japan", label: "🇯🇵 Japan" },
  { value: "China", label: "🇨🇳 China" },
  { value: "India", label: "🇮🇳 India" },
  { value: "Brazil", label: "🇧🇷 Brazil" },
  { value: "Mexico", label: "🇲🇽 Mexico" },
  { value: "Spain", label: "🇪🇸 Spain" },
  { value: "Italy", label: "🇮🇹 Italy" },
  { value: "Netherlands", label: "🇳🇱 Netherlands" },
  { value: "Sweden", label: "🇸🇪 Sweden" },
  { value: "Switzerland", label: "🇨🇭 Switzerland" },
  { value: "Singapore", label: "🇸🇬 Singapore" },
  { value: "South Korea", label: "🇰🇷 South Korea" },
  { value: "Russia", label: "🇷🇺 Russia" },
  { value: "South Africa", label: "🇿🇦 South Africa" },
];

// List of languages with their flags
export const languages = [
  { value: "English", label: "🇬🇧 English" },
  { value: "Français", label: "🇫🇷 Français" },
  { value: "Español", label: "🇪🇸 Español" },
  { value: "Deutsch", label: "🇩🇪 Deutsch" },
  { value: "Italiano", label: "🇮🇹 Italiano" },
  { value: "Português", label: "🇵🇹 Português" },
  { value: "Nederlands", label: "🇳🇱 Nederlands" },
  { value: "Svenska", label: "🇸🇪 Svenska" },
  { value: "日本語", label: "🇯🇵 日本語" },
  { value: "中文", label: "🇨🇳 中文" },
  { value: "한국어", label: "🇰🇷 한국어" },
  { value: "Русский", label: "🇷🇺 Русский" },
  { value: "العربية", label: "🇸🇦 العربية" },
  { value: "हिन्दी", label: "🇮🇳 हिन्दी" },
];

// Convert language values to language codes for API
export const languageToCode: Record<string, string> = {
  English: "en",
  Français: "fr",
  Español: "es",
  Deutsch: "de",
  Italiano: "it",
  Português: "pt",
  Nederlands: "nl",
  Svenska: "sv",
  日本語: "ja",
  中文: "zh",
  한국어: "ko",
  Русский: "ru",
  العربية: "ar",
  हिन्दी: "hi",
};

// Convert language codes to language values for display
export const codeToLanguage: Record<string, string> = Object.entries(languageToCode).reduce(
  (acc, [lang, code]) => ({ ...acc, [code]: lang }),
  {}
);