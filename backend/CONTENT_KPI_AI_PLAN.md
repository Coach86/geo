# Content KPI AI Implementation Plan

## Overview
Transform the current static content analyzers to use LLMs for intelligent, context-aware scoring of web content across 5 dimensions. Each dimension will be scored 0-100 based on specific criteria.

## Architecture

### 1. LLM Integration Layer
- Create a new `ContentKPILLMService` that interfaces with the existing LLM module
- Use structured prompts to analyze content and return scores with explanations
- Implement retry logic and fallback mechanisms

### 2. Model Selection Strategy

#### Primary Models (for accurate, unbiased scoring):
- **Claude 3 Opus/Sonnet**: Best for nuanced content analysis, understanding context and brand voice
- **GPT-4 Turbo**: Strong at structured data extraction and technical SEO analysis
- **Gemini Pro**: Good for web content understanding and schema validation

#### Fallback Models:
- **Claude 3 Haiku**: Fast, cost-effective for simpler scoring tasks
- **GPT-3.5 Turbo**: Backup for basic content analysis
- **Mistral Medium**: Alternative for European data compliance

#### Model Assignment by Dimension:
1. **Authority & Evidence**: Claude 3 Opus (primary) / GPT-4 Turbo (fallback)
   - Best at identifying credibility signals and citation quality
2. **Freshness**: Any model (straightforward date extraction)
3. **Structure/Schema**: GPT-4 Turbo (primary) / Gemini Pro (fallback)
   - Superior at technical HTML/schema analysis
4. **Snippet Extractability**: Claude 3 Sonnet (primary) / Gemini Pro (fallback)
   - Excellent at understanding content structure for snippets
5. **Brand Alignment**: Claude 3 Opus (primary) / GPT-4 Turbo (fallback)
   - Best at understanding brand voice and messaging consistency

## Implementation Steps

### Phase 1: Core AI Service (Week 1)

#### 1.1 Create AI-Powered Analyzers
```typescript
// backend/src/modules/crawler/analyzers/ai/authority-ai.analyzer.ts
export class AuthorityAIAnalyzer {
  async analyze(html: string, url: string): Promise<AuthorityResult> {
    const prompt = this.buildAuthorityPrompt(html, url);
    const llmResponse = await this.llmService.analyze(prompt, 'claude-3-opus');
    return this.parseAuthorityResponse(llmResponse);
  }
}
```

#### 1.2 Structured Prompts for Each Dimension

**Authority & Evidence Prompt Template:**
```
Analyze this webpage for authority and evidence signals. Score 0-100 based on:

Scoring Criteria:
- 20: No authority signals
- 40: Little trust; generic links; vague author
- 60: Moderate authority (niche site) or 1 credible citation
- 80: Any two of the above
- 100: High-authority domain, strong credentials and ≥2 reputable citations

Analyze for:
1. Author credentials and bio presence
2. Number and quality of outbound citations
3. Domain authority indicators
4. E-E-A-T signals

Content: [HTML content]
URL: [URL]

Return JSON:
{
  "score": number,
  "hasAuthor": boolean,
  "authorCredentials": string,
  "outboundCitations": number,
  "trustedCitations": number,
  "domainAuthority": "high" | "medium" | "low",
  "issues": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "description": string,
      "recommendation": string
    }
  ],
  "explanation": string
}
```

**Freshness Prompt Template:**
```
Analyze this webpage for content freshness. Score 0-100 based on:

Scoring Criteria:
- 20: No date signals
- 40: >365 days old
- 60: 181-365 days old
- 80: 91-180 days old
- 100: ≤90 days old

Extract:
1. Publication date
2. Last modified date
3. Date signals in content
4. Schema.org datePublished/dateModified

Content: [HTML content]

Return JSON:
{
  "score": number,
  "publishDate": string | null,
  "modifiedDate": string | null,
  "daysSinceUpdate": number | null,
  "hasDateSignals": boolean,
  "dateSource": string,
  "issues": [...],
  "explanation": string
}
```

**Structure/Schema/Readability Prompt Template:**
```
Analyze webpage structure, schema markup, and readability. Score 0-100:

Scoring Criteria:
- 20: No meaningful structure or schema
- 40: Multiple H1s, messy HTML, minimal schema; avg >30 words/sentence
- 60: Some hierarchy issues, basic schema; avg ≤30 words/sentence
- 80: Minor heading gaps, partial schema; avg ≤25 words/sentence
- 100: Perfect hierarchy, full Article schema; avg ≤20 words/sentence

Analyze:
1. Heading hierarchy (H1-H6 structure)
2. Schema.org markup completeness
3. Average sentence length
4. HTML semantic structure

Content: [HTML content]

Return JSON:
{
  "score": number,
  "h1Count": number,
  "headingHierarchy": "perfect" | "good" | "issues" | "poor",
  "schemaTypes": string[],
  "avgSentenceWords": number,
  "schemaCompleteness": "full" | "partial" | "basic" | "none",
  "issues": [...],
  "explanation": string
}
```

**Snippet Extractability Prompt Template:**
```
Analyze content for featured snippet and AI extraction potential. Score 0-100:

Scoring Criteria:
- 20: Wall of text; no lists, headings, or question patterns
- 40: Long paragraphs with few lists/Q&A
- 60: Some lists or Q&A, but large chunks dominate
- 80: At least one strong extractable block, minor issues
- 100: Multiple direct-answer blocks, ≤25-word sentences

Analyze:
1. Paragraph length and structure
2. Lists, tables, Q&A sections
3. Direct answer patterns
4. Featured snippet opportunities

Content: [HTML content]

Return JSON:
{
  "score": number,
  "avgSentenceWords": number,
  "listCount": number,
  "qaBlockCount": number,
  "extractableBlocks": number,
  "snippetOpportunities": string[],
  "issues": [...],
  "explanation": string
}
```

**Brand Alignment Prompt Template:**
```
Analyze brand alignment and messaging consistency. Score 0-100:

Scoring Criteria:
- 20: Completely off-brand
- 40: Significant mismatch
- 60: Some outdated or missing elements
- 80: Minor tone/terminology drift
- 100: Flawless alignment

Brand context:
- Brand name: [BRAND]
- Key attributes: [ATTRIBUTES]
- Current features/products: [FEATURES]
- Target messaging: [MESSAGING]

Content: [HTML content]

Return JSON:
{
  "score": number,
  "brandKeywordMatches": number,
  "outdatedTermsFound": string[],
  "missingElements": string[],
  "toneAlignment": "perfect" | "good" | "drift" | "mismatch",
  "brandConsistency": number,
  "issues": [...],
  "explanation": string
}
```

### Phase 2: Integration & Optimization (Week 2)

#### 2.1 Batch Processing Optimization
- Implement concurrent LLM calls (5-10 pages at once)
- Use streaming responses where supported
- Cache LLM responses for 24 hours

#### 2.2 Cost Optimization
```typescript
class ContentKPICostOptimizer {
  async selectModel(dimension: string, contentLength: number): Promise<string> {
    // Use cheaper models for simpler tasks
    if (dimension === 'freshness' && contentLength < 5000) {
      return 'claude-3-haiku';
    }
    // Use premium models for complex analysis
    if (dimension === 'authority' || dimension === 'brand') {
      return 'claude-3-opus';
    }
    return 'gpt-3.5-turbo';
  }
}
```

#### 2.3 Progress Tracking
- Emit detailed progress events
- Log each LLM call with timing and cost
- Provide real-time updates via WebSocket

### Phase 3: Error Handling & Reliability (Week 3)

#### 3.1 Fallback Strategy
```typescript
async analyzeWithFallback(content: string, dimension: string): Promise<Result> {
  const models = this.getModelPriority(dimension);
  
  for (const model of models) {
    try {
      return await this.analyzeWithModel(content, dimension, model);
    } catch (error) {
      this.logger.warn(`Model ${model} failed for ${dimension}, trying next...`);
    }
  }
  
  // Final fallback to hybrid approach
  return this.hybridAnalysis(content, dimension);
}
```

#### 3.2 Hybrid Analysis
- Combine LLM insights with static analysis
- Use static analyzers when LLMs are unavailable
- Weighted scoring: 80% LLM, 20% static

### Phase 4: Testing & Validation (Week 4)

#### 4.1 Scoring Calibration
- Test against 100 sample pages
- Compare scores across different models
- Adjust prompts for consistency

#### 4.2 Performance Metrics
- Target: 50-100 pages analyzed in <5 minutes
- Cost target: <$0.10 per page analyzed
- Accuracy: 90% agreement with human reviewers

## Implementation Files

### New Files to Create:
```
backend/src/modules/crawler/analyzers/ai/
├── authority-ai.analyzer.ts
├── freshness-ai.analyzer.ts
├── structure-ai.analyzer.ts
├── snippet-ai.analyzer.ts
├── brand-ai.analyzer.ts
├── base-ai.analyzer.ts
└── prompts/
    ├── authority.prompt.ts
    ├── freshness.prompt.ts
    ├── structure.prompt.ts
    ├── snippet.prompt.ts
    └── brand.prompt.ts

backend/src/modules/crawler/services/
├── content-kpi-llm.service.ts
├── content-kpi-cost-optimizer.service.ts
└── content-kpi-cache.service.ts
```

### Modified Files:
- `content-analyzer.service.ts` - Add AI analyzer integration
- `crawler-pipeline.service.ts` - Add LLM progress tracking
- `crawler.module.ts` - Register new services

## Configuration

### Environment Variables:
```env
# Model Selection
CONTENT_KPI_PRIMARY_MODEL=claude-3-opus
CONTENT_KPI_FALLBACK_MODEL=gpt-3.5-turbo
CONTENT_KPI_MAX_CONCURRENT_LLM=5
CONTENT_KPI_LLM_TIMEOUT=30000

# Cost Controls
CONTENT_KPI_MAX_COST_PER_PAGE=0.10
CONTENT_KPI_USE_CACHE=true
CONTENT_KPI_CACHE_TTL=86400

# Feature Flags
CONTENT_KPI_USE_AI=true
CONTENT_KPI_HYBRID_MODE=true
CONTENT_KPI_AI_WEIGHT=0.8
```

## Monitoring & Logging

### Metrics to Track:
1. **Performance Metrics:**
   - Pages analyzed per minute
   - Average analysis time per page
   - LLM response times by model
   - Cache hit rate

2. **Cost Metrics:**
   - Cost per page by dimension
   - Total cost per crawl
   - Model usage distribution

3. **Quality Metrics:**
   - Score distribution by dimension
   - Issues identified per page
   - Scoring consistency across runs

### Log Format:
```
[ANALYZER-AI] Starting AI analysis for authority dimension
[ANALYZER-AI] Model selected: claude-3-opus (cost: $0.015)
[ANALYZER-AI] LLM call completed in 2.3s
[ANALYZER-AI] Authority score: 60/100 (1 author found, 0 citations)
[ANALYZER-AI] Cost for page: $0.018
```

## Rollout Strategy

### Phase 1: Shadow Mode (Week 1-2)
- Run AI analyzers alongside static analyzers
- Compare results but use static scores
- Collect data for calibration

### Phase 2: Hybrid Mode (Week 3-4)
- Use weighted combination of AI and static scores
- Monitor for anomalies
- Gradually increase AI weight

### Phase 3: Full AI Mode (Week 5+)
- Use AI as primary scorer
- Static analyzers as fallback only
- Continuous monitoring and optimization

## Success Criteria

1. **Accuracy**: 90% correlation with manual expert scoring
2. **Performance**: Analyze 100 pages in <5 minutes
3. **Cost**: Average <$0.05 per page
4. **Reliability**: <1% failure rate with fallbacks
5. **Consistency**: <10% variance in repeated analyses

## Next Steps

1. Review and approve plan
2. Set up development environment with LLM API keys
3. Implement Phase 1 core AI analyzers
4. Create test dataset of 100 representative pages
5. Begin shadow mode testing