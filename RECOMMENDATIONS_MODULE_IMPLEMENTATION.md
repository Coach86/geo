# Autonomous Recommendations Module - Implementation Guide

## Overview
Build an autonomous recommendations module that analyzes existing Mint AI data to generate actionable recommendations.

### Key Principles
1. **Use existing data** - Never recalculate metrics already in BrandReport
2. **Multilingual by default** - Use language detection, not phrase matching
3. **Evidence-based** - Every recommendation needs measurable proof

## System Architecture

### Data Flow
1. Batch completion triggers recommendation generation
2. Analyzers process BrandReport data
3. LLM enhances recommendations
4. Results stored in MongoDB
5. WebSocket sends real-time updates

### Core Components
- Pattern Detection Engine (rule-based analyzers)
- LLM Enhancement Service
- Evidence Compiler
- Recommendation Generator

## Phase 1: Infrastructure Setup

### Backend Structure
- [ ] Create `/backend/src/modules/recommendations/`
- [ ] Add module files: controllers, services, analyzers, schemas, DTOs
- [ ] Set up WebSocket gateway for real-time updates
- [ ] Create batch completion listener

### MongoDB Schemas
- [ ] Recommendation schema with status tracking
- [ ] Evidence schema with statistical data
- [ ] Analysis metadata schema

### Frontend Components
- [ ] Recommendations dashboard
- [ ] Recommendation cards with priority badges
- [ ] Evidence viewer
- [ ] Methodology explanation modal

### API Endpoints
- [ ] GET `/api/recommendations/:projectId`
- [ ] PATCH `/api/recommendations/:id/status`
- [ ] POST `/api/recommendations/:id/dismiss`

## Phase 2: Analyzer Implementation

### 2.1 Entity Gap Analyzer

**Purpose:** Detect when LLMs don't recognize the brand.

**Evidence Rules:**

1. **Overall Recognition Gap**
   - Extract: `visibility.overallMentionRate`
   - Calculate: Recognition Gap = 1 - overallMentionRate
   - Threshold: Gap > 0.7 triggers recommendation
   - Evidence: Store mention rate with competitor comparison

2. **Model-Specific Gaps**
   - Extract: `modelVisibility[].mentionRate` for each model
   - Calculate: Model Gap = 1 - model.mentionRate
   - Threshold: Any model < 0.2 mention rate
   - Evidence: List models with poor recognition

3. **Competitor Comparison**
   - Extract: `topMentions[]` array
   - Calculate: Brand Rank = position in topMentions
   - Calculate: Competitor Gap = (Top competitor count - Brand count) / Top competitor count
   - Threshold: Not in top 5 mentions
   - Evidence: Show top 3 competitors with their counts

4. **Citation Analysis**
   - Extract: `explorer.brandMentionMetrics.brandMentionsByModel[]`
   - Calculate: Citation Rate = mentionCount / totalCitations
   - Threshold: Citation rate < 0.1
   - Evidence: Citation counts by model

5. **Non-Recognition Responses**
   - Extract: `detailedResults` where `brandMentioned = false`
   - Collect: Actual `llmResponse` text samples
   - Group: By detected language
   - Evidence: 3-5 multilingual examples of non-recognition

**Priority Calculation:**
- Critical: Overall mention rate < 0.3
- High: 2+ models with < 0.2 mention rate
- Medium: Not in top 10 mentions

### 2.2 Feature Gap Analyzer

**Purpose:** Identify missing features compared to competitors.

**Evidence Rules:**

1. **Feature Extraction from Responses**
   - Extract: All `llmResponse` from `visibility.detailedResults`
   - Parse: Feature-related terms using NLP
   - Build: Feature frequency map
   - Evidence: Top 10 features mentioned across all responses

2. **Competitor Feature Analysis**
   - Extract: `competition.competitorAnalyses[].analysisByModel[].strengths[]`
   - Parse: Features from competitor strengths
   - Calculate: Feature Coverage = Brand features / All market features
   - Threshold: Coverage < 0.7
   - Evidence: List of features competitors have that brand lacks

3. **Weakness Pattern Detection**
   - Extract: `competition.competitorAnalyses[].analysisByModel[].weaknesses[]`
   - Identify: Repeated weakness patterns
   - Calculate: Weakness Frequency = occurrences / total analyses
   - Threshold: Any weakness mentioned > 50% of time
   - Evidence: Common weaknesses with frequency

4. **Citation Feature Requirements**
   - Extract: `explorer.citations[]` text content
   - Parse: Feature mentions in citation context
   - Weight: By domain importance from `topSources[]`
   - Evidence: Features from high-authority sources

5. **Missing Feature Prioritization**
   - Calculate: Impact Score = Competitor frequency × Domain authority × Market demand
   - Rank: Features by impact score
   - Evidence: Top 5 missing features with scores

**Priority Calculation:**
- Critical: Core features missing (mentioned by 80%+ competitors)
- High: Advanced features missing (50-80% competitors)
- Medium: Unique features missing (<50% competitors)

### 2.3 Content Presence Analyzer

**Purpose:** Find gaps in industry content coverage.

**Evidence Rules:**

1. **Domain Coverage Analysis**
   - Extract: `explorer.topSources[]` array
   - Calculate: Brand Domain Coverage = brandDomainCount / totalDomains
   - Threshold: Coverage < 0.2
   - Evidence: List top 10 domains by percentage

2. **Brand vs Other Sources Ratio**
   - Extract: `domainSourceAnalysis.brandDomainPercentage`
   - Extract: `domainSourceAnalysis.otherSourcesPercentage`
   - Calculate: Source Ratio = otherSources / brandDomain
   - Threshold: Ratio > 5
   - Evidence: Percentage breakdown

3. **Missing High-Value Domains**
   - Extract: Citations where `brandMentioned = false`
   - Group: By domain
   - Filter: Domains in top 20 by frequency
   - Evidence: Domains with 0 brand mentions but high traffic

4. **Content Type Gaps**
   - Parse: Citation URLs for patterns (/review/, /comparison/, /best-of/)
   - Calculate: Type Coverage = Brand citations of type / Total citations of type
   - Threshold: Any type < 30% coverage
   - Evidence: Content types with low brand presence

5. **Competitor Domain Presence**
   - Cross-reference: `topMentions` with citation domains
   - Calculate: Competitor Presence Score per domain
   - Compare: Brand presence vs competitor presence
   - Evidence: Domains where competitors dominate

**Priority Calculation:**
- Critical: Absent from top 5 domains
- High: < 30% presence in top 20 domains
- Medium: Missing from specific content types

### 2.4 Sentiment Improvement Analyzer

**Purpose:** Identify negative sentiment patterns.

**Evidence Rules:**

1. **Overall Sentiment Score**
   - Extract: `sentiment.overallScore`
   - Threshold: Score < 0.5
   - Evidence: Overall score and distribution

2. **Negative Sentiment Patterns**
   - Extract: `sentiment.distribution.negative`
   - Calculate: Negative Rate = negative / total
   - Threshold: Negative rate > 0.3
   - Evidence: Negative percentage by model

3. **Negative Keywords Analysis**
   - Extract: `modelSentiments[].negativeKeywords`
   - Frequency: Count keyword occurrences
   - Group: By theme
   - Evidence: Top negative themes with frequency

4. **Model-Specific Issues**
   - Identify: Models with consistently negative sentiment
   - Extract: Specific negative responses
   - Evidence: Models with lowest sentiment scores

5. **Competitor Sentiment Comparison**
   - Compare: Brand sentiment with competitor mentions
   - Calculate: Sentiment Gap
   - Evidence: Competitor sentiment advantages

## Phase 3: LLM Enhancement

### Enhancement Process
- [ ] Send rule-based recommendations to LLM
- [ ] Generate business-friendly explanations
- [ ] Add competitive intelligence insights
- [ ] Create implementation roadmaps
- [ ] Define success metrics

### Prompt Structure
- Analyze recommendation candidates
- Enhance with business impact analysis
- Provide specific timelines
- Add measurable KPIs
- Generate executive summaries

## Phase 4: Integration

### Batch Processing
- [ ] Listen for batch completion events
- [ ] Trigger recommendation generation
- [ ] Store results in MongoDB
- [ ] Send WebSocket updates

### Performance Optimization
- [ ] Implement Redis caching
- [ ] Add database indexes
- [ ] Optimize LLM calls
- [ ] Enable pagination

### Monitoring
- [ ] Track generation time
- [ ] Monitor recommendation quality
- [ ] Measure implementation rates
- [ ] Log system performance

## Testing Strategy

### Unit Tests
- [ ] Test each analyzer's evidence rules
- [ ] Validate confidence calculations
- [ ] Check threshold logic

### Integration Tests
- [ ] End-to-end generation flow
- [ ] WebSocket message delivery
- [ ] Database operations

### Performance Tests
- [ ] Load test with 100 projects
- [ ] Measure generation time
- [ ] Check memory usage

## Success Metrics

### Technical
- Generation time < 30 seconds
- 99.9% uptime
- Zero data loss

### Business
- 5-10 recommendations per project
- 80%+ relevance score
- 60%+ implementation rate

### Quality
- 90%+ recommendation accuracy
- < 5% false positives
- Clear methodology for all recommendations
