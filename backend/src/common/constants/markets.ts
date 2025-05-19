/**
 * Shared constants for market definitions with their corresponding flags
 * This file can be imported by both frontend and backend code
 */

export interface Market {
  name: string;
  flag: string;
  locale: string;
}

export const MARKETS: Record<string, Market> = {
  'United States': { name: 'United States', flag: '🇺🇸', locale: 'en-US' },
  'United Kingdom': { name: 'United Kingdom', flag: '🇬🇧', locale: 'en-GB' },
  'Canada': { name: 'Canada', flag: '🇨🇦', locale: 'en-CA' },
  'Australia': { name: 'Australia', flag: '🇦🇺', locale: 'en-AU' },
  'France': { name: 'France', flag: '🇫🇷', locale: 'fr-FR' },
  'Germany': { name: 'Germany', flag: '🇩🇪', locale: 'de-DE' },
  'Japan': { name: 'Japan', flag: '🇯🇵', locale: 'ja-JP' },
  'China': { name: 'China', flag: '🇨🇳', locale: 'zh-CN' },
  'India': { name: 'India', flag: '🇮🇳', locale: 'en-IN' },
  'Brazil': { name: 'Brazil', flag: '🇧🇷', locale: 'pt-BR' },
  'Mexico': { name: 'Mexico', flag: '🇲🇽', locale: 'es-MX' },
  'Spain': { name: 'Spain', flag: '🇪🇸', locale: 'es-ES' },
  'Italy': { name: 'Italy', flag: '🇮🇹', locale: 'it-IT' },
  'Netherlands': { name: 'Netherlands', flag: '🇳🇱', locale: 'nl-NL' },
  'Sweden': { name: 'Sweden', flag: '🇸🇪', locale: 'sv-SE' },
  'Switzerland': { name: 'Switzerland', flag: '🇨🇭', locale: 'de-CH' },
  'Singapore': { name: 'Singapore', flag: '🇸🇬', locale: 'en-SG' },
  'South Korea': { name: 'South Korea', flag: '🇰🇷', locale: 'ko-KR' },
  'Russia': { name: 'Russia', flag: '🇷🇺', locale: 'ru-RU' },
  'South Africa': { name: 'South Africa', flag: '🇿🇦', locale: 'en-ZA' },
  'Global': { name: 'Global', flag: '🌍', locale: 'en-US' },
};

/**
 * Helper function to get a market flag by market name
 * Returns a default flag if market not found
 */
export function getMarketFlag(marketName: string): string {
  return MARKETS[marketName]?.flag || '🌍';
}

/**
 * Helper function to get market info by market name
 * Returns a default market if not found
 */
export function getMarketInfo(marketName: string): Market {
  return MARKETS[marketName] || MARKETS['Global'];
}

/**
 * Get a list of all available markets
 */
export function getAllMarkets(): Market[] {
  return Object.values(MARKETS);
}

/**
 * Get a list of all market names
 */
export function getAllMarketNames(): string[] {
  return Object.keys(MARKETS);
}

/**
 * Get a market name by flag
 */
export function getMarketNameByFlag(flag: string): string | undefined {
  const market = Object.values(MARKETS).find(m => m.flag === flag);
  return market?.name;
}