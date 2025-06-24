/**
 * Centralized prompt storage for pipeline services
 */

export const SystemPrompts = {
  // Sentiment analysis
  SENTIMENT_ANALYSIS: `
  You are a sentiment analysis expert. Your task is to analyze responses to questions about specific brands
  and determine the overall sentiment (positive, neutral, or negative) along with supporting keywords.
  `,

  // Alignment analysis (formerly accuracy)
  ALIGNMENT_ANALYSIS: `
  You are an accuracy analysis expert. Your task is to analyze responses to questions about specific brands
  and determine how accurate the facts presented are, along with extracting key statements.
  Focus on verifiability, consistency, and plausibility of facts presented about the brand.
  `,

  // Keep old name for backward compatibility
  ACCURACY_ANALYSIS: `
  You are an accuracy analysis expert. Your task is to analyze responses to questions about specific brands
  and determine how accurate the facts presented are, along with extracting key statements.
  Focus on verifiability, consistency, and plausibility of facts presented about the brand.
  `,

  // Competition analysis (formerly comparison)
  COMPETITION_ANALYSIS: `
  You are a brand competition analyst. Your task is to analyze responses comparing a specific brand
  to one of its competitors. Extract the brand's strengths and weaknesses compared to this competitor.
  Each strength or weakness should be concise (3-10 words) and specific.
  `,

  // Keep old name for backward compatibility
  COMPARISON_ANALYSIS: `
  You are a brand competition analyst. Your task is to analyze responses comparing a specific brand
  to one of its competitors. Extract the brand's strengths and weaknesses compared to this competitor.
  Each strength or weakness should be concise (3-10 words) and specific.
  `,

  // Brand battle analysis
  BRAND_BATTLE_ANALYSIS: `
  You are a brand competition analyst. Your task is to analyze responses comparing a specific brand
  to one of its competitors. Extract the brand's strengths and weaknesses compared to this competitor.
  Each strength or weakness should be concise (3-10 words) and specific.
  `,

  // Visibility analysis (formerly spontaneous)
  VISIBILITY_ANALYSIS: `
  You are a brand awareness analyst. Your task is to analyze responses to an open-ended question
  about companies or brands in a specific industry. You should determine if a specific brand
  was mentioned without prompting, and list all brands or companies that were mentioned.
  `,

  // Keep old name for backward compatibility
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

  // Alignment analysis template (formerly accuracy)
  ALIGNMENT_ANALYSIS: `
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

  // Keep old name for backward compatibility
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

  // Competition analysis template (formerly comparison)
  COMPETITION_ANALYSIS: `
  Analyze the following comparison between "{brandName}" and "{competitor}".

  Original prompt: "{originalPrompt}"

  Extract:
  1. Strengths of "{brandName}" compared to "{competitor}"
  2. Weaknesses of "{brandName}" compared to "{competitor}"

  Return each strength and weakness as concise phrases (3-10 words).

  Response: {llmResponse}
  `,

  // Keep old name for backward compatibility
  COMPARISON_ANALYSIS: `
  Analyze the following comparison between "{brandName}" and "{competitor}".

  Original prompt: "{originalPrompt}"

  Extract:
  1. Strengths of "{brandName}" compared to "{competitor}"
  2. Weaknesses of "{brandName}" compared to "{competitor}"

  Return each strength and weakness as concise phrases (3-10 words).

  Response: {llmResponse}
  `,

  // Brand battle analysis template
  BRAND_BATTLE_ANALYSIS: `
  Analyze the following comparison between "{brandName}" and "{competitor}".

  Original prompt: "{originalPrompt}"

  Extract:
  1. Strengths of "{brandName}" compared to "{competitor}"
  2. Weaknesses of "{brandName}" compared to "{competitor}"

  Return each strength and weakness as concise phrases (3-10 words).

  Response: {llmResponse}
  `,

  // Visibility analysis template (formerly spontaneous)
  VISIBILITY_ANALYSIS: `
  Analyze the following response to the question: "{originalPrompt}"

  Our brand: {brandWithId}
  Competitors: {competitors}

  Extract all companies or brands that are mentioned and classify each one as:
  - 'ourbrand': if it matches our brand
  - 'competitor': if it matches one of the competitors listed above
  - 'other': if it's any other brand or company

  Return a JSON object with a "topOfMind" array containing objects with 'name', 'type', and optionally 'id' properties.

  # CRITICAL RULES:
  1. For our brand: If the response mentions our brand (even with variations), return the EXACT name and id from the brand object above with type: "ourbrand"
  2. For competitors: If the response mentions any competitor (even with variations like "Free Mobile" for "Free"), map it to the EXACT name and id from the competitors list above with type: "competitor"
  3. For other brands: Use the most common/official name with type: "other" and id: null
  4. The "id" field must be the exact id string for "ourbrand" and "competitor" types, and must be null for "other" types

  # MATCHING EXAMPLES:
  - If competitors contains {{"name": "Free", "id": "free"}} and response mentions "Free Mobile" or "Iliad Free", return: {{"name": "Free", "id": "free", "type": "competitor"}}
  - If our brand is {{"name": "Orange", "id": "orange"}} and response mentions "Orange S.A.", return: {{"name": "Orange", "id": "orange", "type": "ourbrand"}}
  - If response mentions "Apple" (not in our lists), return: {{"name": "Apple", "type": "other", "id": null}}

  Response: {llmResponse}
  `,

  // Keep old name for backward compatibility
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
