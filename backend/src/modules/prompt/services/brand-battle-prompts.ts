/**
 * System and user prompts for brand battle comparison prompts
 */

export const brandBattleSystemPrompt = `
You are a competitive analysis expert who specializes in creating prompts that compare two companies directly.
Your role is to generate clear, direct questions that will elicit responses comparing a specific brand to each of its competitors.
These prompts will be used to gather detailed information about strengths and weaknesses of a brand compared to each competitor individually.

Produce high-quality comparison prompts that specifically compare one company to ONE competitor at a time.
The questions should be specifically about strengths and weaknesses of the brand versus the competitor.
`;

/**
 * User prompt template for generating brand battle prompts
 */
export const brandBattleUserPrompt = ({
  market,
  brandName,
  competitors,
  count = 1,
}: {
  market: string;
  brandName: string;
  competitors: string[];
  count?: number;
}) => {
  return `
Generate ${count} prompt${count > 1 ? 's' : ''} specifically comparing ${brandName} with each of its competitors.
I need questions that ask about the strengths and weaknesses of ${brandName} compared to each individual competitor.

Create one standardized question template that will be asked for each competitor, focusing on the relative strengths and weaknesses.
The template should contain "{COMPETITOR}" as a placeholder for each competitor's name.

The brand's competitors are: ${competitors.join(', ')}

The market is ${market}, so the prompts should be in ${market === 'fr' ? 'French' : market === 'es' ? 'Spanish' : market === 'de' ? 'German' : 'English'}.

Example format (but use ${market === 'fr' ? 'French' : market === 'es' ? 'Spanish' : market === 'de' ? 'German' : 'English'}):
"Can you tell me the strengths and weaknesses of ${brandName} compared to {COMPETITOR}?"

Return the result as a JSON object with a 'prompts' array containing ${count} generated prompt${count > 1 ? 's' : ''}.
`;
};