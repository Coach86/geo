// System prompt for spontaneous prompts
export const spontaneousSystemPrompt = `You are a market-research assistant who writes ultra-realistic, keyword-driven questions that everyday people type into AI assistants or Google.`;

// User prompt for spontaneous prompts
type SpontaneousUserPromptParams = {
  market: string;
  websiteUrl: string;
  industry: string;
  brandName: string;
  count: number;
};
export function spontaneousUserPrompt({
  market,
  websiteUrl,
  industry,
  brandName,
  count,
}: SpontaneousUserPromptParams): string {
  return `
      ## USER
      ### Context:
      - Website URL: ${websiteUrl}
      - Company/Brandname: ${brandName} in the ${industry} industry.
      -  Language to generate prompts in: ${market}
      
      GOAL:
      1. Think step-by-step (do NOT reveal this reasoning in the final answer):
        a) Identify the main industry and 1-2 sub-segments.
        b) Note the site language.
        c) Map typical consumer journey stages: Awareness, Consideration, Decision.
        d) Draft potential user intents for each stage (informational, comparative, transactional, etc.).

      2. Produce **exactly ${count} prompts** a human might ask an LLM *in the detected language*.
        • Focus on prompts that are likely to make the LLM mention or list specific brands or companies in its answer.
        • Favor questions that ask for recommendations, comparisons, or lists of brands, companies, or products.
        • Cover all three journey stages.
        • Use diverse phrasing: "Who are the best…", "Which companies…", "What brands…", "Compare…", etc.
        • **Never mention any brand names, company names, or the target URL in the prompt itself.** 
        • Keep prompts concise (max 20 words each).
        • Avoid duplicate meanings.
        • *Use a very casual, almost familiar and conversational tone, like most users talk to a LLM.*
        • *Use questions that force the LLM to list brands, companies, or products.*

      Example output for a Spanish online bike store (illustrative only, do NOT reuse):
        1. ¿Mejor marca bici eléctrica ciudad 2025?
        2. ¿Quién manda en bicis de montaña?
        3. ¿Garantía top para ebikes?
        4. ¿Qué bici pillo si soy novato?
        5. ¿Marca de bicis que mola en España?
    `;
}

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
      
      Company Key Features:
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

// System prompt for comparison prompts
export const comparisonSystemPrompt = `You are a prompt engineering expert specializing in creating comparison questions for market research.`;

type ComparisonUserPromptParams = {
  market: string;
  brandName: string;
  competitors: string[];
  industry: string;
  keyFeatures: string[];
  count: number;
};
export function comparisonUserPrompt({
  market,
  brandName,
  competitors,
  industry,
  keyFeatures,
  count,
}: ComparisonUserPromptParams): string {
  return `
      Generate ${count} different prompts to compare ${brandName} with its competitors in the ${industry} industry.
      
      Company Key Features:
      ${keyFeatures.map((f) => `- ${f}`).join('\n')}
      
      Competitors:
      ${competitors.map((c) => `- ${c}`).join('\n')}
            
      IMPORTANT GUIDELINES:
      1. Each prompt should compare ${brandName} to one or more competitors
      2. Include comparisons on different aspects: quality, price, service, innovation, etc.
      3. Each prompt should be phrased as a question
      4. Use the placeholder {COMPANY} instead of the actual company name
      5. Use the placeholder {COMPETITORS} when referring to all competitors together
      6. Make the questions sound casual, almost familiar and conversational, like something a regular person would ask online or to a friend. Avoid formal or consulting language.
      Examples of good prompts:
      - "Is {COMPANY} better than {COMPETITORS}?"
      - "How does {COMPANY} stack up against {COMPETITORS}?"
      - "Who has better customer service, {COMPANY} or {COMPETITORS}?"

      OUTPUT LANGUAGE:
      **Language to generate prompts MUST BE THE LANGUAGE OF THE MARKET: ${market}**
    `;
}
