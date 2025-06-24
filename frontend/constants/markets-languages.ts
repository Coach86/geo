// Map of countries to their default languages
export const countryToLanguage: Record<string, string[]> = {
  // North America
  "United States": ["English"],
  Canada: ["English", "Français"],
  Mexico: ["Español"],
  
  // Europe
  "United Kingdom": ["English"],
  France: ["Français"],
  Germany: ["Deutsch"],
  Spain: ["Español"],
  Italy: ["Italiano"],
  Netherlands: ["Nederlands"],
  Sweden: ["Svenska"],
  Switzerland: ["Deutsch", "Français", "Italiano"],
  Russia: ["Русский"],
  Poland: ["Polski"],
  Austria: ["Deutsch"],
  Belgium: ["Nederlands", "Français"],
  Denmark: ["Dansk"],
  Finland: ["Suomi"],
  Norway: ["Norsk"],
  Portugal: ["Português"],
  Greece: ["Ελληνικά"],
  "Czech Republic": ["Čeština"],
  Hungary: ["Magyar"],
  Romania: ["Română"],
  Bulgaria: ["Български"],
  Croatia: ["Hrvatski"],
  Slovakia: ["Slovenčina"],
  Slovenia: ["Slovenščina"],
  Lithuania: ["Lietuvių"],
  Latvia: ["Latviešu"],
  Estonia: ["Eesti"],
  Ireland: ["English"],
  Iceland: ["Íslenska"],
  Luxembourg: ["Français", "Deutsch"],
  Malta: ["English"],
  Cyprus: ["Ελληνικά", "English"],
  
  // Asia
  Japan: ["日本語"],
  China: ["中文"],
  India: ["English", "हिन्दी"],
  Singapore: ["English", "中文"],
  "South Korea": ["한국어"],
  
  // Oceania
  Australia: ["English"],
  "New Zealand": ["English"],
  
  // South America
  Brazil: ["Português"],
  Argentina: ["Español"],
  
  // Africa
  "South Africa": ["English"],
};

// List of countries with their flags
export const countries = [
  // North America
  { value: "United States", label: "🇺🇸 United States" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Mexico", label: "🇲🇽 Mexico" },
  
  // Europe (alphabetical order)
  { value: "Austria", label: "🇦🇹 Austria" },
  { value: "Belgium", label: "🇧🇪 Belgium" },
  { value: "Bulgaria", label: "🇧🇬 Bulgaria" },
  { value: "Croatia", label: "🇭🇷 Croatia" },
  { value: "Cyprus", label: "🇨🇾 Cyprus" },
  { value: "Czech Republic", label: "🇨🇿 Czech Republic" },
  { value: "Denmark", label: "🇩🇰 Denmark" },
  { value: "Estonia", label: "🇪🇪 Estonia" },
  { value: "Finland", label: "🇫🇮 Finland" },
  { value: "France", label: "🇫🇷 France" },
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "Greece", label: "🇬🇷 Greece" },
  { value: "Hungary", label: "🇭🇺 Hungary" },
  { value: "Iceland", label: "🇮🇸 Iceland" },
  { value: "Ireland", label: "🇮🇪 Ireland" },
  { value: "Italy", label: "🇮🇹 Italy" },
  { value: "Latvia", label: "🇱🇻 Latvia" },
  { value: "Lithuania", label: "🇱🇹 Lithuania" },
  { value: "Luxembourg", label: "🇱🇺 Luxembourg" },
  { value: "Malta", label: "🇲🇹 Malta" },
  { value: "Netherlands", label: "🇳🇱 Netherlands" },
  { value: "Norway", label: "🇳🇴 Norway" },
  { value: "Poland", label: "🇵🇱 Poland" },
  { value: "Portugal", label: "🇵🇹 Portugal" },
  { value: "Romania", label: "🇷🇴 Romania" },
  { value: "Russia", label: "🇷🇺 Russia" },
  { value: "Slovakia", label: "🇸🇰 Slovakia" },
  { value: "Slovenia", label: "🇸🇮 Slovenia" },
  { value: "Spain", label: "🇪🇸 Spain" },
  { value: "Sweden", label: "🇸🇪 Sweden" },
  { value: "Switzerland", label: "🇨🇭 Switzerland" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  
  // Asia
  { value: "China", label: "🇨🇳 China" },
  { value: "India", label: "🇮🇳 India" },
  { value: "Japan", label: "🇯🇵 Japan" },
  { value: "Singapore", label: "🇸🇬 Singapore" },
  { value: "South Korea", label: "🇰🇷 South Korea" },
  
  // Oceania
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "New Zealand", label: "🇳🇿 New Zealand" },
  
  // South America
  { value: "Argentina", label: "🇦🇷 Argentina" },
  { value: "Brazil", label: "🇧🇷 Brazil" },
  
  // Africa
  { value: "South Africa", label: "🇿🇦 South Africa" },
];

// List of languages with their flags
export const languages = [
  // Major languages
  { value: "English", label: "🇬🇧 English" },
  { value: "Français", label: "🇫🇷 Français" },
  { value: "Español", label: "🇪🇸 Español" },
  { value: "Deutsch", label: "🇩🇪 Deutsch" },
  { value: "Italiano", label: "🇮🇹 Italiano" },
  { value: "Português", label: "🇵🇹 Português" },
  { value: "Nederlands", label: "🇳🇱 Nederlands" },
  { value: "Русский", label: "🇷🇺 Русский" },
  
  // Nordic languages
  { value: "Svenska", label: "🇸🇪 Svenska" },
  { value: "Dansk", label: "🇩🇰 Dansk" },
  { value: "Norsk", label: "🇳🇴 Norsk" },
  { value: "Suomi", label: "🇫🇮 Suomi" },
  { value: "Íslenska", label: "🇮🇸 Íslenska" },
  
  // Eastern European languages
  { value: "Polski", label: "🇵🇱 Polski" },
  { value: "Čeština", label: "🇨🇿 Čeština" },
  { value: "Magyar", label: "🇭🇺 Magyar" },
  { value: "Română", label: "🇷🇴 Română" },
  { value: "Български", label: "🇧🇬 Български" },
  { value: "Hrvatski", label: "🇭🇷 Hrvatski" },
  { value: "Slovenčina", label: "🇸🇰 Slovenčina" },
  { value: "Slovenščina", label: "🇸🇮 Slovenščina" },
  
  // Baltic languages
  { value: "Lietuvių", label: "🇱🇹 Lietuvių" },
  { value: "Latviešu", label: "🇱🇻 Latviešu" },
  { value: "Eesti", label: "🇪🇪 Eesti" },
  
  // Other European languages
  { value: "Ελληνικά", label: "🇬🇷 Ελληνικά" },
  
  // Asian languages
  { value: "日本語", label: "🇯🇵 日本語" },
  { value: "中文", label: "🇨🇳 中文" },
  { value: "한국어", label: "🇰🇷 한국어" },
  { value: "हिन्दी", label: "🇮🇳 हिन्दी" },
  
  // Other languages
  { value: "العربية", label: "🇸🇦 العربية" },
];

// Convert language values to language codes for API
export const languageToCode: Record<string, string> = {
  // Major languages
  English: "en",
  Français: "fr",
  Español: "es",
  Deutsch: "de",
  Italiano: "it",
  Português: "pt",
  Nederlands: "nl",
  Русский: "ru",
  
  // Nordic languages
  Svenska: "sv",
  Dansk: "da",
  Norsk: "no",
  Suomi: "fi",
  Íslenska: "is",
  
  // Eastern European languages
  Polski: "pl",
  Čeština: "cs",
  Magyar: "hu",
  Română: "ro",
  Български: "bg",
  Hrvatski: "hr",
  Slovenčina: "sk",
  Slovenščina: "sl",
  
  // Baltic languages
  Lietuvių: "lt",
  Latviešu: "lv",
  Eesti: "et",
  
  // Other European languages
  Ελληνικά: "el",
  
  // Asian languages
  日本語: "ja",
  中文: "zh",
  한국어: "ko",
  हिन्दी: "hi",
  
  // Other languages
  العربية: "ar",
};

// Convert language codes to language values for display
export const codeToLanguage: Record<string, string> = Object.entries(languageToCode).reduce(
  (acc, [lang, code]) => ({ ...acc, [code]: lang }),
  {}
);