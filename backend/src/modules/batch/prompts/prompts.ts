/**
 * Centralized prompt storage for pipeline services
 */

export const SystemPrompts = {
  // Sentiment analysis
  SENTIMENT_ANALYSIS: `
  You are a sentiment analysis expert. Your task is to analyze responses to questions about specific brands
  and determine the overall sentiment (positive, neutral, or negative) along with supporting keywords.
  `,

  // Accuracy analysis (new)
  ACCURACY_ANALYSIS: `
  You are an accuracy analysis expert. Your task is to analyze responses to questions about specific brands
  and determine how accurate the facts presented are, along with extracting key statements.
  Focus on verifiability, consistency, and plausibility of facts presented about the brand.
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
  `,
};

export const PromptTemplates = {
  // Sentiment analysis template
  SENTIMENT_ANALYSIS: `
  Analyze the sentiment in the following response to the question: "{originalPrompt}"
  
  Determine if the sentiment towards "{brandName}" is positive, neutral, or negative.
  Also extract *the most important* key words (1 to 3 words) about the brand, negative (max 3) or positive (max 3).
  
  Response: {llmResponse}
  `,

  // Accuracy analysis template (new)
  ACCURACY_ANALYSIS: `
  Analyze the accuracy of information in the following response to the question: "{originalPrompt}"
  
  The known key attributes of "{brandName}" are: "{keyBrandAttributes}"
  
  Individually evaluate each key brand attribute for how well it's addressed in the response.
  For each attribute, provide:
  1. A score from 0 to 1 representing alignment/closeness/compliance between the response and this specific attribute
  2. A brief explanation of why you gave this score
  
  Your response must follow this JSON format exactly:
  {
    "attributeScores": [
      {
        "attribute": "Attribute 1",
        "score": 0.8,
        "evaluation": "Brief explanation for this score"
      },
      // One entry for each key attribute
    ]
  }
  
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
  **Also extract all companies or brands that are mentioned, as a list, even if they are not "{brandName}". The list should be empty if no brand was mentioned.**

  When extracting brand names, always use the most common, official, or canonical name for each brand.
  Do not return spelling variations, abbreviations, or partial names—normalize all mentions to the standard brand name (e.g., always extract "Manpower Group" for any mention like "Manpower", "Manpower Grp", or "ManpowerGroup").
  
  Response: {llmResponse}
  `,
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
