# Web Crawling and Content KPI Scoring Feature Plan

## Feature Overview

The feature will crawl up to 100 pages from an organization's website URL (through a queue system) and apply content KPI scoring methods to each page. The scoring system is designed to be less biased and create comparable scores across different websites.

## Content KPI Scoring Dimensions

### 1. Authority & Evidence

**Scoring Criteria:**
- **20**: No authority signals
- **40**: Little trust; generic links; vague author
- **60**: Moderate authority (niche site) or 1 credible citation
- **80**: Any two of the above
- **100**: High-authority domain, strong credentials and ≥ 2 reputable citations

**Common Issues:**
- Roughly half to three-quarters of articles lack named author bios and ≥2 authoritative outbound citations
- This limits trust signals for Google and LLMs
- Reduces LLM citation potential

### 2. Freshness

**Scoring Criteria:**
- **20**: No date signals
- **40**: > 365 days
- **60**: 181-365 days
- **80**: 91-180 days
- **100**: ≤ 90 days

**Common Issues:**
- Legacy/404 pages drag down freshness
- Many pages surface no visible update date or fall outside freshness window
- Missing `dateModified` schema
- Vulnerability to Google's freshness bias (QDF - Query Deserves Freshness)

### 3. Structure / Schema / Readability

**Scoring Criteria:**
- **20**: No meaningful structure or schema
- **40**: Multiple `<h1>` or messy HTML, minimal schema; avg > 30 words
- **60**: Some hierarchy issues or only basic schema; avg ≤ 30 words
- **80**: Minor heading gaps or partial schema; avg ≤ 25 words
- **100**: Perfect hierarchy and full Article schema with all properties; avg ≤ 20 words

**Common Issues:**
- Missing explicit single `<h1>` tag
- Partial Article schema weakens semantic clarity
- Heading hierarchy inconsistencies
- Missing Article/FAQPage schema limits rich-result eligibility
- Multiple H1 tags reduce semantic clarity for search engines

### 4. Snippet Extractability

**Scoring Criteria:**
- **20**: Wall of text; no lists, headings, or question patterns
- **40**: Long paragraphs with few lists/Q&A; no obvious snippet targets
- **60**: Some lists or short Q&A lines, but large narrative chunks still dominate
- **80**: At least one strong extractable block plus good list/heading structure; minor issues
- **100**: Multiple direct-answer blocks and most key facts in ≤ 25-word sentences

**Common Issues:**
- Long sentences (>25 words) reduce featured-snippet likelihood
- Unbroken paragraphs make it hard for Google/LLMs to extract concise answers
- Missing FAQ blocks hinder featured-snippet and AI Overview capture
- Long paragraphs (60+ words) reduce generative answer extraction

### 5. Brand Alignment

**Scoring Criteria:**
- **20**: Completely off-brand
- **40**: Significant mismatch
- **60**: Some outdated or missing elements
- **80**: Minor tone/terminology drift
- **100**: Flawless alignment (or N/A if page isn't brand-centric)

**Common Issues:**
- Generic how-to guidance without product use-cases
- Outdated feature names and pricing tiers
- Pre-2025 messaging on legacy pages
- Inconsistent CTAs and brand voice

## Global Scoring Formula

The overall score is a weighted average based on AI visibility factors:

```
Global Score = (2.5 × Freshness) + (1.5 × Structure) + (1.0 × Authority) + (1.0 × Brand Alignment) + (1.0 × Snippet Extractability)
```

This weighting reflects real-world AI citation patterns where freshness and structure are most predictive of visibility in answer engines.

Reference: https://www.airops.com/answer-engine-visibility

## Technical Implementation Requirements

1. **Web Crawling System**
   - Crawl up to 100 pages per organization website
   - Queue-based processing for scalability
   - Respect robots.txt and rate limiting

2. **Content Analysis Engine**
   - Parse HTML content for each scoring dimension
   - Extract metadata (dates, authors, schema markup)
   - Analyze text structure and readability metrics
   - Detect brand-specific terminology and messaging

3. **Scoring Pipeline**
   - Calculate individual dimension scores (0-100)
   - Apply weighted formula for global score
   - Generate detailed reports with specific issues identified

4. **Data Storage**
   - Store crawled page data
   - Track scoring history over time
   - Enable comparison across organizations

5. **Reporting & Insights**
   - Dashboard visualization of scores
   - Actionable recommendations based on common issues
   - Trend analysis and benchmarking

## Integration Points

- Organization/Project models (extend with website URL field)
- Batch processing system (similar to existing LLM analysis)
- Report generation (new report type for content KPIs)
- Real-time updates via WebSocket during crawling
- Email notifications for completed analyses

## Key Considerations

- Implement retry logic for failed page fetches
- Handle various content types (HTML, PDFs, etc.)
- Respect crawl delays and site performance
- Cache crawled data to avoid redundant requests
- Provide progress updates during long crawl sessions