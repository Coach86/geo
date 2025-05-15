// System prompt for direct brand prompts
export const directSystemPrompt = `You are a prompt engineering expert specializing in creating questions about specific brands.`;

type DirectUserPromptParams = {
  market: string;
  brandName: string;
  count: number;
};
export function directUserPrompt({ market, brandName, count }: DirectUserPromptParams): string {
  return `
      Translate the following prompts (${count}) to the language of the market: ${market}

      ### Prompts:
      - What do you think of ${brandName}?
      - What are the main strenghts and weaknesses of ${brandName}?
      - What do clients and reviews say about ${brandName}?
    `;
}
