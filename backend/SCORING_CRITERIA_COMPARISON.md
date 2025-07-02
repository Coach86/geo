# Content KPI Scoring Criteria Comparison

This document compares the scoring criteria defined in REVISED_CONTENT_KPI_AI_PLAN.md with the current rule-based implementation.

## Authority Dimension

### Plan Criteria:
- **20**: No authority signals
- **40**: Little trust; generic links; vague author  
- **60**: Moderate authority OR 1 credible citation
- **80**: Named expert author + domain authority OR 2+ citations
- **100**: High-authority domain + credentialed author + 2+ citations

### Current Implementation:

#### Rules Found:
1. **BaseAuthorityRule** (20% weight)
   - Always gives 100 score (contributes 20 points to final score)
   - Ensures minimum baseline authority

2. **AuthorPresenceRule** (40% weight)
   - 0 points: No author found
   - 50 points: Author found but no credentials
   - 100 points: Author with credentials

3. **CitationQualityRule** (30% weight)
   - Score based on citation count with max contribution cap
   - Uses CITATION_MULTIPLIER and CITATION_MAX_CONTRIBUTION constants

4. **DomainAuthorityRule** (30% weight)
   - 100 points: High authority domain
   - 60 points: Medium authority domain
   - 20 points: Low authority domain
   - 10 points: Unknown domain

### Gap Analysis - Authority:
✅ **Covered**: Author presence, credentials, citations, domain authority
❌ **Missing**: Direct mapping to the 20/40/60/80/100 scale from the plan
❌ **Issue**: Current implementation uses weighted average instead of conditional scoring

## Freshness Dimension

### Plan Criteria:
- **20**: No date signals
- **40**: >365 days old
- **60**: 181-365 days old  
- **80**: 91-180 days old
- **100**: ≤90 days old

### Current Implementation:

#### Rules Found:
1. **DateSignalsRule** (30% weight)
   - 0 points: No date signals
   - 100 points: Date signals present

2. **UpdateFrequencyRule** (40% weight)
   - Score based on page type expectations
   - Different thresholds for different content types
   - Uses idealDays, warningDays, criticalDays

3. **TimelinessRule** (20% weight)
   - Checks for outdated references
   - Rewards current references
   - Considers timeless content

### Gap Analysis - Freshness:
✅ **Covered**: Date signals detection, age-based scoring
❌ **Missing**: Direct implementation of the 91/180/365 day thresholds
❌ **Issue**: More complex scoring that varies by page type rather than fixed thresholds

## Structure Dimension

### Plan Criteria:
- **20**: No meaningful structure or schema
- **40**: Multiple H1s, messy HTML, minimal schema; avg >30 words/sentence
- **60**: Some hierarchy issues, basic schema; avg ≤30 words/sentence
- **80**: Minor gaps, partial schema; avg ≤25 words/sentence
- **100**: Perfect hierarchy, full schema; avg ≤20 words/sentence

### Current Implementation:

#### Rules Found:
1. **HeadingHierarchyRule**
2. **SchemaMarkupRule**
3. **ReadabilityRule** (30% weight)
   - 100 points: ≤15 words/sentence
   - 85 points: 15-20 words/sentence
   - 70 points: 20-25 words/sentence
   - 50 points: 25-30 words/sentence
   - 30 points: >30 words/sentence

### Gap Analysis - Structure:
✅ **Covered**: Heading hierarchy, schema markup, readability metrics
✅ **Aligned**: Sentence length thresholds match plan (≤20 gets high score, >30 gets low)
✅ **Better**: More granular scoring than plan's 5 levels

## Snippet Extractability Dimension

### Plan Criteria:
- **20**: Wall of text; no lists/headings/Q&A
- **40**: Long paragraphs, few lists/Q&A
- **60**: Some lists/Q&A but large chunks dominate
- **80**: At least one strong extractable block, minor issues
- **100**: Multiple direct-answer blocks, ≤25-word sentences

### Current Implementation:

#### Rules Found:
1. **SentenceStructureRule** (40% weight)
   - 100 points: 15-25 words/sentence (optimal for snippets)
   - 80 points: 10-15 words/sentence
   - 70 points: 25-35 words/sentence
   - 50 points: <10 words/sentence
   - 40 points: >35 words/sentence
2. **ListContentRule**
3. **QAContentRule**

### Gap Analysis - Snippet:
✅ **Covered**: Sentence structure, lists, Q&A content
✅ **Perfectly Aligned**: 25-word threshold matches plan exactly (15-25 words gets 100 points)
✅ **Better**: Recognizes both too-short and too-long sentences as problematic

## Brand Alignment Dimension

### Plan Criteria:
- **20**: Completely off-brand
- **40**: Significant mismatch
- **60**: Some outdated/missing elements
- **80**: Minor tone/terminology drift
- **100**: Flawless alignment

### Current Implementation:

#### Rules Found:
1. **BrandPresenceRule**
2. **KeywordAlignmentRule**

### Gap Analysis - Brand:
✅ **Likely Covered**: Brand presence and keyword alignment
❌ **Missing**: Tone/terminology analysis, outdated brand elements detection

## Overall Assessment

### Key Differences:

1. **Scoring Approach**:
   - Plan: Fixed thresholds (20/40/60/80/100)
   - Implementation: Weighted average of multiple rules

2. **Flexibility**:
   - Plan: One-size-fits-all scoring
   - Implementation: Context-aware (e.g., page type affects freshness)

3. **Granularity**:
   - Plan: 5 distinct levels per dimension
   - Implementation: Continuous 0-100 scale with weighted contributions

4. **LLM Integration**:
   - Plan: Single unified LLM call for all dimensions
   - Implementation: Hybrid approach with both rule-based and LLM components

### Recommendations:

1. **Alignment Options**:
   - Option A: Modify rule aggregation to map to plan's fixed thresholds
   - Option B: Update plan to reflect the more nuanced rule-based approach
   - Option C: Create a mapping layer that converts rule scores to plan criteria

2. **Missing Elements**:
   - ✅ ~~Implement sentence length analysis~~ (Already implemented in ReadabilityRule and SentenceStructureRule)
   - ❌ Add tone/terminology analysis for brand alignment
   - ❌ Create threshold-based scoring option in aggregator for exact plan matching

3. **Documentation**:
   - Document the actual scoring logic used in production
   - Explain why implementation differs from original plan
   - Provide mapping between rule scores and plan thresholds

## Summary

### Well-Aligned Dimensions:
- **Structure**: Sentence length thresholds match plan almost exactly
- **Snippet Extractability**: Perfect alignment on the 25-word threshold

### Partially Aligned Dimensions:
- **Authority**: All components present but scoring logic differs
- **Brand Alignment**: Basic presence/keyword checks but missing tone analysis

### Misaligned Dimensions:
- **Freshness**: Uses context-aware scoring by page type instead of fixed day thresholds

### Key Finding:
The rule-based implementation is actually **more sophisticated** than the original plan, offering:
- Context-aware scoring (e.g., freshness expectations vary by page type)
- More granular scoring (continuous 0-100 vs 5 fixed levels)
- Better handling of edge cases (e.g., timeless content, too-short sentences)

The main challenge is that the weighted average approach produces different final scores than the conditional threshold approach in the plan.