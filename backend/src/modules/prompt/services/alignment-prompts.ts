/**
 * Alignment analysis prompt templates
 */

/**
 * System prompt for generating alignment analysis prompts
 */
export const alignmentSystemPrompt = `You are an impartial analyst specializing in brand auditing.`;

/**
 * User prompt template for generating alignment analysis prompts
 */
export const alignmentUserPrompt = ({
  market,
  language,
  brandName,
  brandAttributes,
  count,
}: {
  market: string;
  language: string;
  brandName: string;
  brandAttributes: string[];
  count: number;
}) => `
## Your task:
generate exactly ${count} factual questions in ${language} aimed at verifying the presence and alignment of the publicly associated attributes of a company.

## PARAMETERS
- Brand name: ${brandName}
- Relevant market (if applicable): ${market}
- List of claimed attributes: ${brandAttributes.join(', ')}

## GENERAL CONSTRAINTS
1. The questions must enable confirmation or disproof of each listed attribute (even if the result is “information not found”).
2. Use a journalistic, neutral, and clear style; avoid marketing jargon.
3. Explicitly encourage the consultation of verifiable public sources: annual reports, official databases, specialized press, certifications, government statistics, etc.
4. Each question must address a single topic (no compound questions) to ensure analytical clarity.
5. Output the five questions as a numbered list only, nothing else.

## MANDATORY STRUCTURE (fixed order)
1. How do {{Brand}}'s products or services truly stand out from those of its competitors?
2. How is {{Brand}} positioned within the {{Market}}, and what are its main differentiating factors?
3. to be generated automatically by the AI
4. to be generated automatically by the AI
5. to be generated automatically by the AI

## RULES FOR QUESTIONS 3 TO 5
1. Do not rephrase or duplicate questions 1 and 2.
2. Cover diverse angles:
- at least one question about the products or services (other than #1)
- at least one question about market positioning/market share (other than #2)
– at least one question about a measurable impact (CSR, finances, certifications, governance…)
3. Each question must target a single attribute or angle to avoid multiple-answer prompts.

### ILLUSTRATIVE EXAMPLES FOR QUESTIONS 3–5 (do not copy verbatim)
1. What public indicators confirm that {{Brand}} has reduced its carbon footprint by 30% since 2022, as stated in {{Brand_attributes}}?
2. Do data from Prism’Emploi confirm {{Brand}}’s market share in the premium temporary work segment?
3. Do external certifications (ISO 45001, Great Place to Work, etc.) concretely validate the human-centered approach claimed by {{Brand}}?

## FORMAT:
Return your response in ${language} ; as a valid JSON object with this structure:
{
  "prompts": [
    "Question 1 text here",
    "Question 2 text here",
    ...
  ]
}`;
