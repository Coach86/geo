export * from './markets';

/**
 * Language definitions for identity card creation
 */
export interface Language {
  code: string;
  name: string;
  flag: string;
}

export const LANGUAGES: Record<string, Language> = {
  'en': { code: 'en', name: 'English', flag: '🇺🇸' },
  'fr': { code: 'fr', name: 'French', flag: '🇫🇷' },
  'de': { code: 'de', name: 'German', flag: '🇩🇪' },
  'es': { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  'it': { code: 'it', name: 'Italian', flag: '🇮🇹' },
  'pt': { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  'nl': { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  'sv': { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  'ko': { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  'ja': { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  'zh': { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  'ru': { code: 'ru', name: 'Russian', flag: '🇷🇺' },
};

/**
 * Get formatted language display with flag
 */
export function getFormattedLanguage(languageCode: string): string {
  const language = LANGUAGES[languageCode];
  if (!language) return `🌐 ${languageCode || 'en'}`;
  return `${language.flag} ${language.name}`;
}

/**
 * Get all available languages
 */
export function getAllLanguages(): Language[] {
  return Object.values(LANGUAGES);
}

/**
 * Get all language codes
 */
export function getAllLanguageCodes(): string[] {
  return Object.keys(LANGUAGES);
}