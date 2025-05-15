// System prompt for direct brand prompts
export const directSystemPrompt = `You are a prompt engineering expert specializing in creating questions about specific brands.`;

type DirectUserPromptParams = {
  market: string;
  brandName: string;
  industry: string;
  keyFeatures: string[];
  count: number;
};
export function directUserPrompt({
  market,
  brandName,
  industry,
  keyFeatures,
  count,
}: DirectUserPromptParams): string {
  return `
      Generate ${count} different prompts to directly assess opinions and knowledge about ${brandName} in the ${industry} industry.
      
      ### Context:
      - Current date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      - Company Key Features:
      ${keyFeatures.map((f) => `- ${f}`).join('\n')}
      
      IMPORTANT GUIDELINES:
      1. The prompts MUST explicitly mention "${brandName}" by name
      2. Include a mix of questions about sentiment, reputation, and knowledge of products/services
      3. Each prompt should be phrased as a question
      4. Make prompts varied and diverse in wording 
      5. Each prompt should be 10-15 words long
      6. Use the placeholder {COMPANY} instead of the actual company name
      7. Make the questions sound casual, almost familiar and conversational, like something a regular person would ask online or to a friend. Avoid formal or consulting language.

      Examples of good prompts:
      - "Is {COMPANY} any good for tech stuff?"
      - "Do people like {COMPANY} in healthcare?"
      - "What does {COMPANY} actually do?"

      OUTPUT LANGUAGE:
      **Language to generate prompts MUST BE THE LANGUAGE OF THE MARKET: ${market}**
    `;
}
