# AI Visibility Scanner Implementation Plan

## Feature Overview
A comprehensive scanning tool that analyzes how AI systems (ChatGPT, Claude, Gemini, Perplexity) discover and retrieve your brand's content by testing both keyword-based (BM25) and semantic (vector) search performance across your website.

## Architecture Overview

### Frontend Components
- New sidebar entry under "Insights" section
- Dedicated visibility audit page with multiple tabs
- Real-time crawling progress indicator
- Interactive audit results dashboard

### Backend Modules
- New `seo-audit` module for core functionality
- Crawler service for website traversal
- Indexing services for BM25 and vector search
- Audit execution and analysis service
- Results storage and retrieval

## Implementation Tasks

### Phase 1: Backend Infrastructure Setup

#### Task 1.1: Create SEO Audit Module Structure
- [ ] Create `backend/src/modules/seo-audit/seo-audit.module.ts`
- [ ] Create folder structure:
  ```
  seo-audit/
  ├── controllers/
  ├── services/
  ├── repositories/
  ├── schemas/
  ├── dto/
  ├── interfaces/
  └── utils/
  ```

#### Task 1.2: Define Data Models
- [ ] Create `schemas/crawled-page.schema.ts` - Store individual crawled pages
  - URL, content, title, h1, meta description, canonical URL
  - Parent project ID reference
  - Crawl timestamp
- [ ] Create `schemas/search-index.schema.ts` - Store index metadata
  - Index type (BM25/Vector)
  - Creation date, chunk count
  - Configuration parameters
- [ ] Create `schemas/audit-result.schema.ts` - Store audit execution results
  - Query set used
  - Coverage metrics
  - Overlap statistics
  - Recommendations

#### Task 1.3: Implement Crawler Service
- [ ] Create `services/web-crawler.service.ts`
  - Extend existing `url-scraper.ts` functionality
  - Add sitemap.xml parsing capability
  - Implement robots.txt compliance
  - Add crawl depth and page limit controls
  - Store crawled pages in MongoDB
- [ ] Create `dto/crawl-config.dto.ts`
  - Max pages, max depth, allowed domains
  - Content type filters

### Phase 2: Indexing Implementation

#### Task 2.1: Text Processing Service
- [ ] Create `services/text-processor.service.ts`
  - Implement semantic chunking (40-120 words)
  - Add text normalization for BM25
  - Preserve context for embeddings
  - Extract and attach metadata

#### Task 2.2: BM25 Index Service
- [ ] Create `services/bm25-index.service.ts`
  - Integrate `rank-bm25` library
  - Build index from processed chunks
  - Implement search functionality
  - Add index persistence

#### Task 2.3: Vector Index Service
- [ ] Create `services/vector-index.service.ts`
  - Integrate sentence-transformers embeddings
  - Use FAISS for vector storage
  - Implement similarity search
  - Add batch processing for large sites

#### Task 2.4: Hybrid Search Service
- [ ] Create `services/hybrid-search.service.ts`
  - Implement reciprocal rank fusion
  - Combine BM25 and vector results
  - Add configurable weights

### Phase 3: Query Generation & Audit Execution

#### Task 3.1: Query Set Generator
- [ ] Create `services/query-generator.service.ts`
  - Parse Google Search Console data (if available)
  - Generate LLM-based query variations
  - Categorize by intent (informational/navigational/transactional)
  - Store query sets for reuse

#### Task 3.2: Audit Execution Service
- [ ] Create `services/audit-executor.service.ts`
  - Run queries against both indexes
  - Calculate coverage metrics
  - Compute overlap statistics
  - Generate MRR scores
  - Identify patterns and gaps

#### Task 3.3: Recommendation Engine
- [ ] Create `services/recommendation.service.ts`
  - Analyze audit results
  - Generate actionable recommendations
  - Prioritize by impact and effort
  - Create fix templates

### Phase 4: API Endpoints

#### Task 4.1: Crawler Controller
- [ ] Create `controllers/crawler.controller.ts`
  - POST `/api/seo-audit/crawl/:projectId` - Start crawl
  - GET `/api/seo-audit/crawl/:projectId/status` - Get crawl status
  - GET `/api/seo-audit/crawl/:projectId/pages` - List crawled pages

#### Task 4.2: Index Controller
- [ ] Create `controllers/index.controller.ts`
  - POST `/api/seo-audit/index/:projectId/build` - Build indexes
  - GET `/api/seo-audit/index/:projectId/status` - Index status
  - POST `/api/seo-audit/index/:projectId/search` - Test search

#### Task 4.3: Audit Controller
- [ ] Create `controllers/audit.controller.ts`
  - POST `/api/seo-audit/audit/:projectId/execute` - Run audit
  - GET `/api/seo-audit/audit/:projectId/results` - Get results
  - GET `/api/seo-audit/audit/:projectId/recommendations` - Get recommendations

### Phase 5: Frontend Implementation

#### Task 5.1: Navigation Integration
- [ ] Update `frontend/components/ui/sidebar/navigation.tsx`
  - Add "SEO Audit" under Insights section
  - Use appropriate icon (e.g., Search or Globe)

#### Task 5.2: Main Audit Page
- [ ] Create `frontend/app/(protected)/seo-audit/page.tsx`
  - Project selector
  - Scan configuration form
  - Start scan button
  - Results display area

#### Task 5.3: Crawl Management Component
- [ ] Create `frontend/components/seo-audit/CrawlManager.tsx`
  - URL input with validation
  - Crawl configuration options
  - Progress indicator with stats
  - Crawled pages list with preview

#### Task 5.4: Index Status Component
- [ ] Create `frontend/components/seo-audit/IndexStatus.tsx`
  - Index build progress
  - Index statistics (chunks, size)
  - Search testing interface
  - Rebuild options

#### Task 5.5: Audit Results Dashboard
- [ ] Create `frontend/components/seo-audit/AuditResultsDashboard.tsx`
  - Coverage metrics visualization
  - Overlap analysis charts
  - Query performance table
  - Traffic light indicators

#### Task 5.6: Recommendations Component
- [ ] Create `frontend/components/seo-audit/RecommendationsPanel.tsx`
  - Categorized recommendations
  - Priority matrix
  - Implementation guides
  - Export functionality

### Phase 6: Integration & Polish

#### Task 6.1: Real-time Updates
- [ ] Extend `batch-events.gateway.ts` for SEO audit events
  - Crawl progress updates
  - Index build status
  - Audit execution progress

#### Task 6.2: API Client Updates
- [ ] Create `frontend/lib/api/seo-audit.ts`
  - Crawl management functions
  - Index operations
  - Audit execution and results retrieval

#### Task 6.3: Type Definitions
- [ ] Update `frontend/lib/api/types.ts` with SEO audit types
- [ ] Create shared interfaces for audit data

#### Task 6.4: Testing & Documentation
- [ ] Create comprehensive test suite
- [ ] Add user documentation
- [ ] Create API documentation

### Phase 7: Advanced Features

#### Task 7.1: Scheduled Audits
- [ ] Integrate with existing batch system
- [ ] Weekly/monthly audit scheduling
- [ ] Trend analysis over time

#### Task 7.2: Competitor Analysis
- [ ] Crawl competitor sites (with limits)
- [ ] Comparative visibility analysis
- [ ] Gap identification

#### Task 7.3: AI Integration
- [ ] OpenAPI spec generation
- [ ] ChatGPT plugin manifest
- [ ] Structured data recommendations

## Technical Considerations

### Performance
- Implement pagination for large crawls
- Use job queues for long-running tasks
- Cache frequently accessed data
- Optimize vector operations

### Security
- Respect robots.txt
- Implement rate limiting
- Validate URLs and domains
- Sanitize crawled content

### Scalability
- Design for horizontal scaling
- Use efficient storage for vectors
- Implement data retention policies
- Monitor resource usage

## Dependencies

### New NPM Packages
- `rank-bm25` or `js-search` for BM25 implementation
- `@xenova/transformers` or `@tensorflow/tfjs` for embeddings
- `faiss-node` or `vectra` for vector search
- `sitemap-parser` for sitemap parsing
- `robots-parser` for robots.txt compliance

### Existing Dependencies
- MongoDB for data storage
- Bull for job queuing
- Socket.io for real-time updates
- Chart.js for visualizations

## Timeline Estimate

- Phase 1: 3-4 days (Backend infrastructure)
- Phase 2: 4-5 days (Indexing implementation)
- Phase 3: 3-4 days (Query generation & audit)
- Phase 4: 2-3 days (API endpoints)
- Phase 5: 5-6 days (Frontend implementation)
- Phase 6: 2-3 days (Integration & polish)
- Phase 7: 3-4 days (Advanced features)

**Total: 22-29 days** for full implementation

## MVP Scope (7-10 days)

For a faster MVP, focus on:
1. Basic crawler (Task 1.3)
2. Simple BM25 index (Task 2.2)
3. Basic vector index (Task 2.3)
4. Manual query input (simplified Task 3.1)
5. Core audit execution (Task 3.2)
6. Essential API endpoints (Tasks 4.1-4.3)
7. Basic frontend UI (Tasks 5.1, 5.2, 5.5)

This provides core functionality while deferring advanced features like automated query generation, comprehensive recommendations, and competitor analysis.