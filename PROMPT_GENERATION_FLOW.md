# Prompt Generation Flow - Server Side

This document shows how prompts are generated on the server with all the information passed from the frontend.

## 1. AI-Based Prompt Generation

### Frontend Request
When using "Generate with AI", the frontend sends:
```typescript
// From AddProjectModal.tsx
const request: GeneratePromptsRequest = {
  brandName: brandName,
  website: websiteUrl,
  industry: industry,
  market: markets[0]?.country || 'United States',
  language: markets[0]?.languages?.[0] || 'English',
  keyBrandAttributes: attributes,
  competitors: competitors,
  shortDescription: description,
  fullDescription: analyzedData?.fullDescription || description,
  additionalInstructions: additionalInstructions.trim() || undefined
};
```

### Server Processing (Visibility Prompts Example)

#### System Prompt:
```
You are a market-research assistant who writes ultra-realistic, keyword-driven questions that everyday people type into AI assistants or Google.
```

#### User Prompt Template:
```
## USER
### Context:
- Website URL: ${websiteUrl}
- Keywords of the website, to reuse in prompt, but translated: ${keywords.join(', ')}
- Company/Brandname: ${brandName} in the ${industry} industry
- Market that needs to be targeted: ${market}
- Current date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
- Competitors: ${competitors.join(', ')}
- Additional Instructions: ${additionalInstructions} // Only if provided

### GOAL:
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
  • **Use a very casual, almost familiar and conversational tone, like most users talk to a LLM.**
  • **Use questions that force the LLM to list brands, companies, or products.**
  • **Without never mentioning any brand names, company names, use the competitors of the target brand to tailor the prompts.**

Example output for a Spanish online bike store (illustrative only, do NOT reuse):
  1. ¿Mejor marca bici eléctrica ciudad 2025?
  2. ¿Quién manda en bicis de montaña?
  3. ¿Garantía top para ebikes?
  4. ¿Qué bici pillo si soy novato?
  5. ¿Marca de bicis que mola en España?

## OUTPUT LANGUAGE:
**Language to generate prompts MUST BE ${language}**
```

## 2. Keyword-Based Prompt Generation

### Frontend Request
When using "Generate from Keywords", the frontend sends:
```typescript
const result = await generatePromptsFromKeywords({
  projectId: projectId,
  keywords: keywordList, // Array of keywords from textarea or CSV
  promptType: 'visibility',
  additionalInstructions: additionalInstructions.trim() || undefined,
  count: parseInt(promptCount),
}, token);
```

### Server Processing

The server creates a specialized prompt that incorporates the keywords:

```typescript
private createKeywordBasedPrompt(
  promptType: string,
  project: Project,
  keywords: string[],
  additionalInstructions: string | undefined,
  count: number,
): string {
  const baseContext = `
    Project Information:
    - Brand: ${project.brandName}
    - Website: ${project.website}
    - Industry: ${project.industry}
    - Market: ${project.market}
    - Language: ${project.language}
    - Keywords to incorporate: ${keywords.join(', ')}
    ${additionalInstructions ? `- Additional Instructions: ${additionalInstructions}` : ''}
  `;

  // For visibility prompts:
  return `${baseContext}
    
    Generate ${count} visibility prompts that:
    1. Incorporate the provided keywords naturally
    2. Focus on questions that would make AI assistants mention or list specific brands/companies
    3. Cover different stages of the customer journey (awareness, consideration, decision)
    4. Use casual, conversational language
    5. Never mention specific brand names in the prompts
    6. Keep prompts concise (max 20 words each)
    
    The prompts should be in ${project.language} and target the ${project.market} market.`;
}
```

## 3. Complete Example

### Example Project Data:
- Brand: Nike
- Website: nike.com
- Industry: Sports Apparel
- Market: United States
- Language: English
- Competitors: Adidas, Puma, Under Armour
- Keywords: running shoes, air max, jordan
- Additional Instructions: Focus on new running shoes products

### AI Generation would produce prompts like:
1. What are the best running shoes for marathons in 2025?
2. Which brands make the most comfortable athletic sneakers?
3. Who has the best warranty for sports shoes?
4. What shoe companies do professional runners recommend?
5. Which athletic brands have the best customer reviews?

### Keyword Generation would produce prompts like:
1. What are the top running shoes with air cushioning technology?
2. Which brands make the best basketball shoes like Jordan style?
3. Who sells quality air max type sneakers?
4. What companies make professional running shoes for athletes?
5. Which brands have the best lightweight running shoes?

## 4. Prompt Count Options

Based on the `PromptCountSelect` component:
- Visibility prompts: 12, 15, 30, or 50 prompts
- Other types (sentiment, alignment, competition): 3, 5, or 10 prompts

The system checks `maxSpontaneousPrompts` from the user's plan to determine if they need to upgrade.