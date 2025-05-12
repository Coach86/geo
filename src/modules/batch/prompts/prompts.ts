/**
 * Centralized prompt storage for pipeline services
 */

export const SystemPrompts = {
  // Sentiment analysis
  SENTIMENT_ANALYSIS: `
  You are a sentiment analysis expert. Your task is to analyze responses to questions about specific brands
  and determine the overall sentiment (positive, neutral, or negative) along with supporting facts.
  `,
  
  // Comparison analysis
  COMPARISON_ANALYSIS: `
  You are a brand comparison expert. Your task is to analyze responses comparing different brands
  and determine which brand is presented more favorably, along with the key differentiating factors.
  `,
  
  // Spontaneous analysis
  SPONTANEOUS_ANALYSIS: `
  You are a brand awareness analyst. Your task is to analyze responses to an open-ended question
  about companies or brands in a specific industry. You should determine if a specific brand
  was mentioned without prompting, and list all brands or companies that were mentioned.
  `
};

export const PromptTemplates = {
  // Sentiment analysis template
  SENTIMENT_ANALYSIS: `
  Analyze the sentiment in the following response to the question: "{originalPrompt}"
  
  Determine if the sentiment towards "{brandName}" is positive, neutral, or negative.
  Also extract key facts or opinions about the brand.
  
  Response: {llmResponse}
  `,
  
  // Comparison analysis template
  COMPARISON_ANALYSIS: `
  Analyze the following response to the question: "{originalPrompt}"
  
  Determine which brand comes out as the winner in this comparison between "{brandName}" and its competitors.
  Also identify key differentiating factors mentioned.
  
  Response: {llmResponse}
  `,
  
  // Spontaneous analysis template
  SPONTANEOUS_ANALYSIS: `
  Analyze the following response to the question: "{originalPrompt}"
  
  Determine if "{brandName}" is mentioned (either directly by exact name, or clearly referred to).
  Also extract all companies or brands that are mentioned as a list.
  
  Response: {llmResponse}
  `
};

/**
 * Format a prompt template with provided values
 * @param template The prompt template
 * @param values Object containing replacement values
 * @returns Formatted prompt string
 */
export function formatPrompt(template: string, values: Record<string, string>): string {
  let formattedPrompt = template;
  
  // Replace placeholders with actual values
  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{${key}}`;
    formattedPrompt = formattedPrompt.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return formattedPrompt;
}