// System prompt for visibility prompts
export const visibilitySystemPrompt = `You are a market-research assistant who writes ultra-realistic, keyword-driven questions that everyday people type into AI assistants or Google.`;

// User prompt for visibility prompts
type VisibilityUserPromptParams = {
  market: string;
  language: string;
  websiteUrl: string;
  industry: string;
  brandName: string;
  count: number;
  competitors: string[];
  keywords: string[];
  additionalInstructions?: string;
};
export function visibilityUserPrompt({
  market,
  language,
  websiteUrl,
  industry,
  brandName,
  count,
  competitors,
  keywords,
  additionalInstructions,
}: VisibilityUserPromptParams): string {
  const prompt = `
      ## USER
      ### Context:
      - Website URL: ${websiteUrl}${keywords && keywords.length > 0 ? `\n      - Keywords of the website, to reuse in prompt, but translated: ${keywords.join(', ')}` : ''}
      - Company/Brandname: ${brandName} in the ${industry} industry
      - Market that needs to be targeted: ${market}
      - Current date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      - Competitors: ${competitors.join(', ')}
      ${additionalInstructions ? `\n      ### IMPORTANT ADDITIONAL INSTRUCTIONS:\n      ${additionalInstructions}\n      You MUST incorporate these instructions into the generated prompts.\n` : ''}
      ### GOAL:
      1. Think step-by-step (do NOT reveal this reasoning in the final answer):
        a) Identify the main industry and 1-2 sub-segments.
        b) Note the site language.
        c) Map typical consumer journey stages: Awareness, Consideration, Decision.
        d) Draft potential user intents for each stage (informational, comparative, transactional, etc.).

      2. Produce **exactly ${count} prompts** a human might ask an LLM *in the detected language*.
        ${additionalInstructions ? `• **CRITICAL: The prompts MUST be about: ${additionalInstructions}**
        • At least 80% of the prompts should directly relate to the topic mentioned in the additional instructions` : ''}
        • Focus on prompts that are likely to make the LLM mention or list specific brands or companies in its answer.
        • Favor questions that ask for recommendations, comparisons, or lists of brands, companies, or products.
        • Cover all three journey stages${additionalInstructions ? ' while staying focused on the specified topic' : ''}.
        • Use diverse phrasing: "Who are the best…", "Which companies…", "What brands…", "Compare…", etc.
        • **Never mention any brand names, company names, or the target URL in the prompt itself.**
        • Keep prompts concise (max 20 words each).
        • Avoid duplicate meanings.
        • **Use a very casual, almost familiar and conversational tone, like most users talk to a LLM.**
        • **Use questions that force the LLM to list brands, companies, or products.**
        • **Without never mentioning any brand names, company names, use the competitors of the target brand to tailor the prompts.**

      ${additionalInstructions ? 
        `Example: If the instruction is "focus on new electric mountain bikes", the prompts should be like:
        - Which brands have the best new electric mountain bikes?
        - Who makes reliable e-MTB models this year?
        - What companies offer good warranties on electric mountain bikes?
        Remember: Apply this same focus to "${additionalInstructions}"` :
        `Example output for a Spanish online bike store (illustrative only, do NOT reuse):
        1. ¿Mejor marca bici eléctrica ciudad 2025?
        2. ¿Quién manda en bicis de montaña?
        3. ¿Garantía top para ebikes?
        4. ¿Qué bici pillo si soy novato?
        5. ¿Marca de bicis que mola en España?`}

      ## OUTPUT LANGUAGE:
      **Language to generate prompts MUST BE ${language}**
    `;
  return prompt;
}
