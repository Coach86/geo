// System prompt for comparison prompts
export const comparisonSystemPrompt = `You are a prompt engineering expert specializing in creating comparison questions for market research.`;

type ComparisonUserPromptParams = {
  market: string;
  brandName: string;
  language: string;
  competitors: string[];
  industry: string;
  keyBrandAttributes: string[];
  count: number;
};
export function comparisonUserPrompt({
  market,
  brandName,
  language,
  competitors,
  industry,
  keyBrandAttributes,
  count,
}: ComparisonUserPromptParams): string {
  return `
      Generate ${count} different prompts to compare ${brandName} with its competitors in the ${industry} industry.
      
      ## Context:
      - Current date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      - Company Key Brand Attributes:
      ${keyBrandAttributes.map((f) => `- ${f}`).join('\n')}
      ### Competitors:
      ${competitors.map((c) => `- ${c}`).join('\n')}
            
      ## IMPORTANT GUIDELINES:
      1. Each prompt should compare ${brandName} to one or more competitors
      2. Include comparisons on different aspects: quality, price, service, innovation, etc.
      3. Each prompt should be phrased as a question
      4. Use the placeholder {PROJECT} instead of the actual project name
      5. Use the placeholder {COMPETITORS} when referring to all competitors together
      6. Make the questions sound casual, almost familiar and conversational, like something a regular person would ask online or to a friend. Avoid formal or consulting language.
      
      ## Examples of good prompts:
      - "Is {PROJECT} better than {COMPETITORS}?"
      - "How does {PROJECT} stack up against {COMPETITORS} "
      - "Who has better customer service, {PROJECT} or {COMPETITORS}?"

      ## OUTPUT LANGUAGE:
      **Language to generate prompts MUST BE ${language}**
    `;
}
