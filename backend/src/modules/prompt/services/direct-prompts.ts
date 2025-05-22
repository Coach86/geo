// System prompt for direct brand prompts
export const directSystemPrompt = `You are a prompt engineering expert specializing in creating questions about specific brands.`;

type DirectUserPromptParams = {
  market: string;
  language: string;
  brandName: string;
  count: number;
  websiteUrl: string;
};
export function directUserPrompt({
  market,
  language,
  brandName,
  count,
  websiteUrl,
}: DirectUserPromptParams): string {
  return `
      Translate the following prompts (${count}) to ${language}.
      Use a conversational, everyday language.

      ### Prompts:
      - What do you think of ${brandName}?
      - What are the main strenghts and weaknesses of ${brandName}?
      - What do clients and reviews say about ${brandName} and it's products/services?
    `;
}
