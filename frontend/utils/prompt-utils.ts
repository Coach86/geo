/**
 * Map prompt type identifiers to user-friendly display names
 */
const promptTypeDisplayNames: Record<string, string> = {
  // New names
  visibility: 'Visibility',
  sentiment: 'Sentiment',
  alignment: 'Alignment',
  competition: 'Competition',
  // Old names for backward compatibility
  spontaneous: 'Visibility',
  direct: 'Sentiment',
  accuracy: 'Alignment',
  brandBattle: 'Competition',
  comparison: 'Comparison', // Removed but kept for backward compatibility
};

/**
 * Get the display name for a prompt type
 * @param promptType The prompt type identifier from the backend
 * @returns The user-friendly display name
 */
export function getPromptTypeFriendlyName(promptType: string): string {
  if (!promptType) {
    return 'Unknown';
  }

  return promptTypeDisplayNames[promptType] || promptType;
}

/**
 * Check if a prompt type is one of the old names
 * @param promptType The prompt type identifier
 * @returns true if it's an old name that should be migrated
 */
export function isOldPromptType(promptType: string): boolean {
  const oldTypes = ['spontaneous', 'direct', 'accuracy', 'brandBattle', 'comparison'];
  return oldTypes.includes(promptType);
}

/**
 * Convert old prompt type to new prompt type
 * @param oldType The old prompt type identifier
 * @returns The new prompt type identifier
 */
export function convertToNewPromptType(oldType: string): string {
  const conversionMap: Record<string, string> = {
    spontaneous: 'visibility',
    direct: 'sentiment',
    accuracy: 'alignment',
    brandBattle: 'competition',
    comparison: '', // Removed type
  };

  return conversionMap[oldType] || oldType;
}