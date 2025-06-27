# Revised Content KPI AI Implementation Plan

## Critical Issues with Original Plan

The original plan has been thoroughly analyzed and found to have fundamental flaws:

1. **Cost Mathematics Are Wrong**: Original $0.05-0.10/page target is impossible with premium models (actual cost would be $1.40/page)
2. **Performance Impossible**: 100 pages in 5 minutes requires unrealistic concurrency levels
3. **Over-Engineering**: 5 separate LLM calls per page wastes tokens and creates consistency problems
4. **Model Selection Overkill**: Using multiple premium models introduces unnecessary variance

## Revised Approach: Single-Pass Unified Analysis

### Core Strategy
- **One LLM call per page** instead of 5 separate calls
- **Token optimization** through HTML pre-processing
- **Realistic cost target**: $0.003-0.01 per page
- **Performance target**: 100 pages in 3-5 minutes

### Architecture Changes

#### 1. Page Signal Extraction Service
```typescript
// New service to pre-extract structured data
export class PageSignalExtractor {
  extract(html: string, metadata: any): PageSignals {
    // Use Readability.js-like extraction
    // Extract heading hierarchy, author info, dates, etc.
    // Return structured data for LLM consumption
  }
}

interface PageSignals {
  content: {
    title: string;
    cleanText: string; // Boilerplate-free content
    wordCount: number;
    avgSentenceLength: number;
  };
  structure: {
    h1Count: number;
    headingHierarchy: string[];
    listCount: number;
    schemaTypes: string[];
  };
  authority: {
    authorElements: string[];
    outboundLinks: string[];
    citationCandidates: string[];
  };
  freshness: {
    publishDate?: string;
    modifiedDate?: string;
    dateSignals: string[];
  };
}
```

#### 2. Unified KPI Analyzer
```typescript
export class UnifiedKPIAnalyzer {
  async analyze(pageSignals: PageSignals, project: any): Promise<AllKPIResult> {
    const prompt = this.buildUnifiedPrompt(pageSignals, project);
    
    const response = await this.llmService.call({
      model: 'gpt-3.5-turbo-0125', // Cheap but effective
      temperature: 0,
      seed: 42, // For consistency
      prompt,
      maxTokens: 1000, // Structured JSON response
    });
    
    return this.parseUnifiedResponse(response);
  }
}
```

### Cost Optimization

#### Realistic Cost Breakdown (per page):
- **HTML Preprocessing**: ~3K tokens (down from 6-7K)
- **Unified Prompt**: ~400 tokens
- **Completion**: ~400 tokens
- **Total**: ~3.8K tokens

**GPT-3.5-Turbo Cost**: 
- Input: 3.4K × $0.0005 = $0.0017
- Output: 0.4K × $0.0015 = $0.0006
- **Total: $0.0023/page** (with 25% safety margin = **$0.003/page**)

### Performance Optimization

#### Concurrency Strategy:
- **Page-level parallelism**: 10-15 concurrent pages
- **Respect rate limits**: 90 RPM for GPT-3.5-Turbo
- **Realistic timing**: 100 pages in 4-5 minutes

#### Token Reduction:
1. **HTML Cleaning**: Remove scripts, styles, navigation
2. **Content Extraction**: Use Readability.js equivalent
3. **Truncation**: Limit to first 10KB of meaningful content
4. **Preprocessing**: Extract signals before LLM call

### Unified Prompt Template

```
You are an expert content analyst. Analyze this webpage and score it across 5 dimensions (0-100 each).

PRE-EXTRACTED SIGNALS:
{pageSignals as JSON}

RAW CONTENT (truncated):
{cleanHtml}

BRAND CONTEXT:
- Brand: {brandName}
- Key attributes: {keyBrandAttributes}
- Competitors: {competitors}

SCORING CRITERIA:

AUTHORITY (0-100):
- 20: No authority signals
- 40: Little trust; generic links; vague author  
- 60: Moderate authority OR 1 credible citation
- 80: Named expert author + domain authority OR 2+ citations
- 100: High-authority domain + credentialed author + 2+ citations

FRESHNESS (0-100):
- 20: No date signals
- 40: >365 days old
- 60: 181-365 days old  
- 80: 91-180 days old
- 100: ≤90 days old

STRUCTURE (0-100):
- 20: No meaningful structure or schema
- 40: Multiple H1s, messy HTML, minimal schema; avg >30 words/sentence
- 60: Some hierarchy issues, basic schema; avg ≤30 words/sentence
- 80: Minor gaps, partial schema; avg ≤25 words/sentence
- 100: Perfect hierarchy, full schema; avg ≤20 words/sentence

SNIPPET EXTRACTABILITY (0-100):
- 20: Wall of text; no lists/headings/Q&A
- 40: Long paragraphs, few lists/Q&A
- 60: Some lists/Q&A but large chunks dominate
- 80: At least one strong extractable block, minor issues
- 100: Multiple direct-answer blocks, ≤25-word sentences

BRAND ALIGNMENT (0-100):
- 20: Completely off-brand
- 40: Significant mismatch
- 60: Some outdated/missing elements
- 80: Minor tone/terminology drift
- 100: Flawless alignment

Return JSON:
{
  "scores": {
    "authority": number,
    "freshness": number,
    "structure": number,
    "snippetExtractability": number,
    "brandAlignment": number
  },
  "details": {
    "authority": { "hasAuthor": boolean, "citationCount": number, ... },
    "freshness": { "daysSinceUpdate": number, "hasDateSignals": boolean, ... },
    "structure": { "h1Count": number, "avgSentenceWords": number, ... },
    "snippet": { "extractableBlocks": number, "listCount": number, ... },
    "brand": { "brandMentions": number, "alignmentIssues": string[], ... }
  },
  "issues": [
    {
      "dimension": "authority|freshness|structure|snippet|brand",
      "severity": "critical|high|medium|low",
      "description": "specific issue",
      "recommendation": "actionable fix"
    }
  ],
  "explanation": "Brief explanation of scoring rationale"
}
```

## Implementation Plan (Revised)

### Phase 0: Validation (2 days)
- [ ] Implement `PageSignalExtractor` service
- [ ] Test token counting on 20 representative pages
- [ ] Validate $0.003/page cost projection
- [ ] Measure actual processing time

### Phase 1: Core Implementation (1 week)
- [ ] Create `UnifiedKPIAnalyzer` class
- [ ] Implement unified prompt template
- [ ] Add JSON schema validation with Zod
- [ ] Test accuracy against existing static analyzers

### Phase 2: Integration (1 week)
- [ ] Integrate into `ContentAnalyzerService`
- [ ] Add concurrency semaphore (respects rate limits)
- [ ] Implement caching with key: `{pageHash, promptVersion, model}`
- [ ] Add budget manager with cost ceiling

### Phase 3: Production Hardening (1 week)
- [ ] Add comprehensive error handling and retries
- [ ] Implement circuit breaker for LLM outages
- [ ] Add metrics and monitoring
- [ ] Create fallback to static analyzers

### Phase 4: Data Collection (Parallel, 2-3 weeks)
- [ ] Collect 2-3K labeled pages for future fine-tuning
- [ ] Store training samples with prompt versions
- [ ] Prepare for potential model fine-tuning

## File Structure (Simplified)

```
backend/src/modules/crawler/
├── services/
│   ├── page-signal-extractor.service.ts    # NEW
│   ├── unified-kpi-analyzer.service.ts     # NEW (replaces 5 separate analyzers)
│   ├── content-kpi-budget-manager.service.ts # NEW
│   └── content-analyzer.service.ts         # MODIFIED
├── analyzers/
│   └── ai/
│       ├── base-ai.analyzer.ts             # KEEP (validation & retry logic)
│       └── unified-kpi.analyzer.ts         # NEW (single analyzer)
└── schemas/
    └── unified-kpi-result.schema.ts        # NEW
```

## Configuration

```env
# Model & Performance
CONTENT_KPI_MODEL=gpt-3.5-turbo-0125
CONTENT_KPI_MAX_CONCURRENT=10
CONTENT_KPI_MAX_TOKENS_PER_PAGE=4000

# Cost Controls  
CONTENT_KPI_MAX_COST_PAGE=0.01
CONTENT_KPI_MAX_CRAWL_COST=5.00
CONTENT_KPI_ENABLE_BUDGET_MANAGER=true

# Reliability
CONTENT_KPI_MAX_RETRIES=3
CONTENT_KPI_TIMEOUT_MS=10000
CONTENT_KPI_CACHE_TTL=86400

# Feature Flags
CONTENT_KPI_USE_AI=true
CONTENT_KPI_FALLBACK_TO_STATIC=true
```

## Success Metrics (Revised)

1. **Cost**: <$0.01 per page average
2. **Performance**: 100 pages analyzed in <5 minutes
3. **Accuracy**: 90% correlation with manual scoring
4. **Reliability**: <1% failure rate with fallbacks
5. **Consistency**: <5% variance in repeat analyses

## Future Enhancements

### Option A: Fine-Tuned Model (if volume >30K pages/month)
- Train Mistral-7B on collected labeled data
- Deploy on AWS g5.xlarge for <$0.001/page
- Keep GPT-3.5 as fallback for edge cases

### Option B: Embedding-Based Brand Alignment
- Use text-embedding-3-small for brand similarity
- Vector store for brand guidelines
- Cosine similarity scoring (no LLM needed)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Rate limits exceeded | Semaphore + queue with backpressure |
| Cost overrun | Budget manager with circuit breaker |
| Model outage | Fallback to static analyzers |
| Scoring drift | Weekly calibration on reference set |
| Poor accuracy | Hybrid mode with static signal validation |

## Next Steps

1. **Immediate**: Implement `PageSignalExtractor` and validate token counts
2. **Week 1**: Build and test `UnifiedKPIAnalyzer`
3. **Week 2**: Integrate and add production safeguards
4. **Week 3**: Deploy in shadow mode for validation
5. **Month 2**: Consider fine-tuning if volume justifies it

This revised plan is realistic, cost-effective, and technically sound while delivering the same analytical capabilities as the original over-engineered approach.