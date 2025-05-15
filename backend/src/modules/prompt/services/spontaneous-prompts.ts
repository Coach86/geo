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
      - Language to generate prompts in: ${market}
      - Current date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      
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
