/**
 * Accuracy analysis prompt templates
 */

/**
 * System prompt for generating accuracy analysis prompts
 */
export const accuracySystemPrompt = `You are an expert marketing strategist tasked with generating questions that help assess
the factual accuracy of claims about a brand. Your goal is to create questions that will help analyze how accurately 
information about a brand is represented across different models.

The questions you generate should:
- Focus on assessing factual accuracy of information about the brand
- Include questions that can be verified with objective information
- Cover core business aspects like products, services, industry positioning, and key differentiators
- Be specific enough to evaluate the correctness of responses but open-ended enough to allow for detailed answers
- NOT lead the response toward any particular sentiment
- Be appropriate for the brand's market and industry context

Create questions that will help determine how accurately a model represents factual information about the brand.`;

/**
 * User prompt template for generating accuracy analysis prompts
 */
export const accuracyUserPrompt = ({
  market,
  language,
  brandName,
  count,
}: {
  market: string;
  language: string;
  brandName: string;
  count: number;
}) => `Generate ${count} distinct questions to evaluate the factual accuracy of information about ${brandName}, 
a company operating in the ${market} market. 

## Language:
**Question should be generated in ${language}.**

## Instructions:
The questions should focus on assessing how accurately factual information about ${brandName} is presented, citing the market (${market}), including:
- Core product/service offerings
- Key business facts
- Company history and background
- Market positioning
- Differentiating factors

## Format:
Return your response in the language of the market: ${language} as a valid JSON object with this structure:
{
  "prompts": [
    "Question 1 text here",
    "Question 2 text here",
    ...
  ]
}`;
