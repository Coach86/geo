# Freshness Rule Enhancement Plan
## Confidence-Based Date Scoring System

### Overview
Current freshness rule implementation scans entire page content for dates but lacks semantic validation. This leads to false positives where unrelated dates (build timestamps, session data, etc.) are treated as content update dates.

### Proposed Solution: Confidence-Weighted Scoring

#### 1. Date Source Confidence Levels

**High Confidence (100% weight)**
- Proper meta tags: `<meta property="article:modified_time">`, `<meta name="last-modified">`
- JSON-LD structured data: `@type: "Article"` with `dateModified`
- Microdata: `itemprop="dateModified"`
- HTTP Last-Modified headers

**Medium Confidence (70% weight)**
- Dates found in main content areas (`<article>`, `<main>`) with semantic context
- Dates near content-related keywords: "updated", "modified", "revised", "last changed"
- Dates in content wrapper elements with article-like structure

**Low Confidence (40% weight)**
- Dates found anywhere in page content without clear semantic context
- Dates in JSON structures without clear content relationship
- Dates in less semantic HTML areas

**Very Low Confidence (20% weight)**
- Dates from JavaScript bundles/build artifacts
- Dates in `<script>` tags, framework metadata
- Session timestamps, API response data
- Dates in footer/header areas

#### 2. LLM-Enhanced Date Validation

**Purpose**: Semantic validation of found dates

**Implementation**:
- When dates are found in content (Medium/Low confidence scenarios)
- Make lightweight LLM call with context snippet
- Prompt: "Is this date `{date}` from context `{surrounding_text}` likely related to when this page content was last updated? Answer: YES/NO with brief reason."

**Benefits**:
- Distinguishes content dates from build/session dates
- Provides semantic understanding beyond pattern matching
- Can identify false positives automatically

#### 3. Contextual Pattern Matching Enhancement

**DOM-Based Context Analysis**:
- Prioritize dates found in semantic HTML elements
- Weight based on element hierarchy and content relevance
- Consider surrounding text for semantic clues

**Keyword Proximity Scoring**:
- Higher confidence for dates near: "updated", "modified", "revised", "last changed", "published"
- Lower confidence for dates near: "built", "generated", "session", "cached"

#### 4. Hybrid Scoring Formula

```
Final Freshness Score = (Base Date Freshness Score) × (Confidence Weight) × (LLM Validation Bonus)

Where:
- Base Date Freshness Score = Age-based score (0-100)
- Confidence Weight = Source confidence (0.2-1.0)
- LLM Validation Bonus = 1.0 if validated, 0.5 if not validated, 0.8 if uncertain
```

#### 5. Implementation Strategy

**Phase 1**: Implement confidence levels without LLM
**Phase 2**: Add LLM validation for Medium/Low confidence dates
**Phase 3**: Fine-tune confidence weights based on real-world data

#### 6. Expected Outcomes

**Accuracy Improvements**:
- Reduce false positives from build timestamps
- Better semantic understanding of date relevance
- More accurate freshness scoring across diverse websites

**Scoring Examples**:
- Recent date in meta tag: 100 × 1.0 = 100 (perfect)
- Recent date in content with LLM validation: 100 × 0.7 × 1.0 = 70 (good)
- Recent date in JavaScript without validation: 100 × 0.2 × 0.5 = 10 (poor)
- Older date in meta tag: 60 × 1.0 = 60 (better than recent false positive)

#### 7. Configuration Options

```typescript
interface FreshnessConfig {
  enableLLMValidation: boolean;
  confidenceWeights: {
    high: number;    // default: 1.0
    medium: number;  // default: 0.7
    low: number;     // default: 0.4
    veryLow: number; // default: 0.2
  };
  llmValidationThreshold: number; // only validate if confidence < threshold
}
```

#### 8. Testing Strategy

**Test Cases**:
- Pages with proper meta tags vs pages with only build timestamps
- Content management systems with embedded JSON data
- Static sites with build dates vs dynamic content dates
- News articles vs product pages vs documentation

**Success Metrics**:
- Reduction in false positive freshness scores
- Improved correlation between perceived content freshness and calculated scores
- Performance impact measurement (LLM call overhead)