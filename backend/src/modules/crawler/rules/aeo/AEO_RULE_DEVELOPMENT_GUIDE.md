# AEO Rule Development Guide

This guide explains how to create AEO (Answer Engine Optimization) rules for the Mint AI platform. These rules evaluate web pages against specific criteria to determine their optimization for AI-driven search engines.

## Overview

AEO rules analyze web content to assess how well it's optimized for AI systems like ChatGPT, Claude, and other LLMs that power answer engines. Each rule focuses on a specific aspect of optimization (e.g., case studies, FAQ pages, technical SEO).

## Rule Structure

### Basic Rule Template

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../base-aeo.rule';
import { AEORuleResult, PageContent, AEOCategory } from '../../../interfaces/aeo-rule.interface';

@Injectable()
export class YourRule extends BaseAEORule {
  private readonly logger = new Logger(YourRule.name);
  
  // Define all constants at the top of the class
  private static readonly SCORE_EXCELLENT = 100;
  private static readonly SCORE_GOOD = 80;
  private static readonly SCORE_POOR = 40;
  private static readonly SCORE_NOT_PRESENT = 0;
  
  constructor() {
    super(
      'rule_id',              // Unique identifier (snake_case)
      'Rule Display Name',    // Human-readable name
      'CONTENT' as AEOCategory, // Category: TECHNICAL, CONTENT, AUTHORITY, or MONITORING_KPI
      {
        impactScore: 3,       // 1-3, where 3 is highest impact
        pageTypes: ['blog_article', 'faq'],  // Applicable page types
        isDomainLevel: false  // true if rule applies to entire domain
      }
    );
  }

  async evaluate(url: string, content: PageContent): Promise<AEORuleResult> {
    const evidence: string[] = [];
    let score = 0;
    
    // Your evaluation logic here
    
    return this.createResult(score, evidence);
  }
}
```

## LLM-Backed Rules

For rules requiring LLM analysis (like CaseStudiesRule), follow this pattern:

### 1. Define Zod Schemas

```typescript
import { z } from 'zod';

const ItemSchema = z.object({
  description: z.string().describe('Brief summary INCLUDING key details'),
  excerpt: z.string().describe('Direct quote from content (50-150 chars) that best represents this item'),
  keyMetric: z.string().optional().describe('Most important metric or result'),
  // Boolean fields for evaluation criteria
  hasCriteria1: z.boolean().describe('Clear description of what to check'),
  hasCriteria2: z.boolean().describe('Another specific criterion'),
});

const AnalysisSchema = z.object({
  items: z.array(ItemSchema).describe('Array of items found'),
  analysis: z.string().describe('Overall summary of findings')
});

type Analysis = z.infer<typeof AnalysisSchema>;
```

### 2. Add LLM Service Dependency

```typescript
import { LlmService } from '../../../../llm/services/llm.service';
import { LlmProvider } from '../../../../llm/interfaces/llm-provider.enum';

@Injectable()
export class YourLLMRule extends BaseAEORule {
  private readonly logger = new Logger(YourLLMRule.name);
  
  // LLM Configuration Constants
  private static readonly LLM_TEMPERATURE = 0.2;
  private static readonly LLM_MAX_TOKENS = 2000;
  private static readonly MAX_CONTENT_LENGTH = 15000;
  private static readonly MIN_CONTENT_LENGTH = 100;
  
  // Provider fallback chain (document rationale)
  private static readonly LLM_PROVIDERS: Array<{ provider: LlmProvider; model: string }> = [
    { provider: LlmProvider.OpenAI, model: 'gpt-4o-mini' },     // Cheapest
    { provider: LlmProvider.OpenAI, model: 'gpt-4o' },          // Reliable
    { provider: LlmProvider.Anthropic, model: 'claude-3-haiku-20240307' }, // Alternative
  ];
  
  constructor(
    private readonly llmService: LlmService
  ) {
    super(/* ... */);
  }
}
```

### 3. Create Clear, Specific Prompts

```typescript
const prompt = `Analyze the provided website content to identify [specific items].

IMPORTANT DEFINITIONS:
- [Item Type]: A clear definition of what qualifies
- NOT a [Item Type]: Examples of what doesn't qualify

EVALUATION CRITERIA:
1. **Criterion 1**: Specific requirement with examples
   ACCEPT: "increased revenue by 47%", "saved $125,000"
   REJECT: "significant improvement", "better results"
2. **Criterion 2**: Another specific requirement
3. **Criterion 3**: Third requirement

EDGE CASES:
- How to handle partial matches
- What to do with ambiguous content
- Special cases to consider

IMPORTANT: For each item found, you MUST provide:
- An exact excerpt (direct quote) from the content
- Focus excerpts on key metrics or important details
- Keep excerpts between 50-150 characters

Based on your analysis, extract all qualifying items.
Return empty array if none found.

URL: ${url}

Website Content:
${contentForAnalysis}`;
```

### 4. Implement Evaluation Logic

```typescript
async evaluate(url: string, content: PageContent): Promise<AEORuleResult> {
  const evidence: string[] = [];
  let score = 0;
  
  const cleanText = content.cleanContent || '';
  const contentForAnalysis = cleanText.substring(0, YourLLMRule.MAX_CONTENT_LENGTH);
  
  // Validate content
  if (!contentForAnalysis || contentForAnalysis.trim().length < YourLLMRule.MIN_CONTENT_LENGTH) {
    evidence.push('✗ Insufficient content to analyze');
    return this.createResult(YourLLMRule.SCORE_NOT_PRESENT, evidence);
  }
  
  // Check LLM availability
  if (!this.llmService) {
    throw new Error('LlmService is required for YourLLMRule evaluation');
  }
  
  try {
    // Try providers in order
    let llmResponse: Analysis;
    let successfulProvider: string | null = null;
    let lastError: Error | null = null;
    
    for (const { provider, model } of YourLLMRule.LLM_PROVIDERS) {
      try {
        if (this.llmService.isProviderAvailable(provider)) {
          llmResponse = await this.llmService.getStructuredOutput(
            provider,
            prompt,
            AnalysisSchema,
            { 
              model,
              temperature: YourLLMRule.LLM_TEMPERATURE,
              maxTokens: YourLLMRule.LLM_MAX_TOKENS
            }
          );
          successfulProvider = `${provider}/${model}`;
          this.logger.log(`Successfully used ${successfulProvider}`);
          break;
        }
      } catch (error) {
        this.logger.error(`Provider ${provider}/${model} failed:`, error);
        lastError = new Error(`${provider}/${model} failed: ${error.message}`);
        continue;
      }
    }
    
    if (!llmResponse!) {
      throw lastError || new Error('All LLM providers failed');
    }
    
    // Process results and calculate score
    // ... scoring logic ...
    
    // Generate detailed evidence with excerpts
    llmResponse.items.forEach((item, index) => {
      evidence.push('');
      evidence.push(`Item #${index + 1}: ${item.description}`);
      
      if (item.keyMetric) {
        evidence.push(`  📊 Key Result: ${item.keyMetric}`);
      }
      
      // Add the exact excerpt provided by LLM
      if (item.excerpt) {
        evidence.push(`  📝 Excerpt: "${item.excerpt}"`);
      }
    });
    
  } catch (error) {
    throw new Error(`Failed to analyze: ${error.message}`);
  }
  
  return this.createResult(score, evidence);
}
```

## Pattern-Based Rules

For simpler rules that don't require LLM analysis:

```typescript
async evaluate(url: string, content: PageContent): Promise<AEORuleResult> {
  const evidence: string[] = [];
  let score = 0;
  
  const html = content.html || '';
  const cleanText = content.cleanContent || '';
  
  // Pattern matching
  const patterns = [
    /pattern1/gi,
    /pattern2/gi,
  ];
  
  let matchCount = 0;
  patterns.forEach(pattern => {
    const matches = cleanText.match(pattern);
    if (matches) {
      matchCount += matches.length;
      // Cite specific matches
      matches.slice(0, 3).forEach(match => {
        evidence.push(`  📝 Found: "${this.truncateText(match, 100)}"`);
      });
    }
  });
  
  // Scoring based on matches
  if (matchCount >= 5) {
    score = YourRule.SCORE_EXCELLENT;
    evidence.push(`✓ Found ${matchCount} instances`);
  } else if (matchCount >= 2) {
    score = YourRule.SCORE_GOOD;
    evidence.push(`○ Found ${matchCount} instances`);
  } else {
    score = YourRule.SCORE_NOT_PRESENT;
    evidence.push('✗ No patterns found');
  }
  
  return this.createResult(score, evidence);
}
```

## Best Practices

### 1. Constants Definition
- Define ALL numeric values as static readonly constants at the top
- Group related constants with comments
- Document the rationale for thresholds and limits

### 2. Evidence Quality
- Always include specific excerpts from the content (provided by LLM, not extracted via code)
- Use emojis sparingly but consistently (✓, ✗, ○, 📝, 📊, 💡)
- Provide actionable feedback for improvements
- Show what was found AND what's missing
- Never use hardcoded keyword extraction for multilingual content

### 3. Error Handling
- Validate input content before processing
- Provide detailed error messages with context
- Log all provider failures with specific details
- Throw errors for missing dependencies (no silent failures)

### 4. Prompt Engineering
- Define clear acceptance/rejection criteria
- Include specific examples of good/bad content
- Handle edge cases explicitly
- Use structured output (Zod schemas) for consistency

### 5. Scoring Philosophy
- 100 (Excellent): Exceeds best practices significantly
- 80 (Good): Meets most requirements well
- 40 (Poor): Basic implementation present
- 0 (Not Present): Missing or completely inadequate

### 6. Registration
Add your rule to `aeo-rule-registry.service.ts`:

```typescript
// In registerAllRules() method
this.register(new YourRule()); // For simple rules
this.register(new YourLLMRule(this.llmService)); // For LLM-backed rules
```

## Testing Your Rule

1. **Unit Test**: Test evaluation logic with mock content
2. **Integration Test**: Test with real LLM service
3. **Edge Cases**: Test with minimal content, empty content, malformed HTML
4. **Performance**: Ensure evaluation completes within reasonable time

## Common Pitfalls to Avoid

1. **Vague Prompts**: Be extremely specific about what to accept/reject
2. **Hidden Constants**: All numbers should be defined as constants
3. **Missing Citations**: Always show evidence from the actual content
4. **Silent Failures**: Throw errors or provide clear feedback
5. **Overly Complex Logic**: Keep evaluation logic clear and maintainable

## Example Rules to Reference

- `CaseStudiesRule`: LLM-backed rule with structured output
- `MainHeadingRule`: Pattern-based rule with HTML parsing
- `HttpsSecurityRule`: Technical rule checking security status
- `ContentFreshnessRule`: Rule analyzing temporal signals

## Questions to Ask Before Implementation

1. Does this rule require understanding context/meaning? → Use LLM
2. Can it be evaluated with patterns/structure? → Use pattern matching
3. What specific evidence will help users improve?
4. What are the edge cases?
5. How will scoring thresholds be justified?