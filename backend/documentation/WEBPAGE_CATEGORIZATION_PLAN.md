# Webpage Categorization Plan for Content Analysis

## Overview
This plan defines webpage categories for the content analysis system, with specific rules for which categories should be analyzed and how.

## Main Webpage Categories

### 1. **Homepage**
- **Criteria**: Root domain URL, contains navigation to multiple sections, brand overview
- **Patterns**: URL path = "/", meta description contains company overview
- **Analysis**: FULL ANALYSIS
- **Special Rules**: Higher weight on brand alignment

### 2. **Product/Service Page**
- **Criteria**: Detailed information about specific products or services
- **Patterns**: URLs containing /product/, /service/, /solution/, product schema markup
- **Analysis**: FULL ANALYSIS
- **Special Rules**: Focus on feature extractability and brand consistency

### 3. **Blog Post/Article**
- **Criteria**: Long-form content with publish date, author info
- **Patterns**: /blog/, /article/, /post/, Article schema, author byline
- **Analysis**: FULL ANALYSIS
- **Special Rules**: Authority signals weighted higher

### 4. **Documentation/Help**
- **Criteria**: Technical documentation, user guides, help articles
- **Patterns**: /docs/, /help/, /support/, /guide/, /tutorial/
- **Analysis**: FULL ANALYSIS
- **Special Rules**: Snippet extractability crucial, authority less important

### 5. **About/Company Page**
- **Criteria**: Company information, mission, team, history
- **Patterns**: /about/, /company/, /team/, /mission/
- **Analysis**: PARTIAL ANALYSIS
- **Special Rules**: Brand alignment critical, freshness less important

### 6. **Contact Page**
- **Criteria**: Contact information, forms, office locations
- **Patterns**: /contact/, /get-in-touch/, contact schema
- **Analysis**: EXCLUDED
- **Reason**: Minimal content value

### 7. **Legal/Policy Pages**
- **Criteria**: Terms of service, privacy policy, legal disclaimers
- **Patterns**: /terms/, /privacy/, /legal/, /policy/, /disclaimer/
- **Analysis**: EXCLUDED
- **Reason**: Boilerplate content, not brand-specific

### 8. **Navigation/Category Pages**
- **Criteria**: Lists of links, category overviews, minimal unique content
- **Patterns**: /category/, paginated URLs (?page=), low text-to-link ratio
- **Analysis**: LIMITED ANALYSIS
- **Special Rules**: Only check structure and brand presence

### 9. **Landing/Campaign Pages**
- **Criteria**: Marketing campaign pages, promotional content
- **Patterns**: UTM parameters, /lp/, /campaign/, time-limited offers
- **Analysis**: FULL ANALYSIS
- **Special Rules**: Brand consistency and conversion focus

### 10. **FAQ Pages**
- **Criteria**: Question and answer format, common queries
- **Patterns**: /faq/, FAQ schema, Q&A patterns in content
- **Analysis**: FULL ANALYSIS
- **Special Rules**: Maximum weight on snippet extractability

### 11. **Case Study/Success Story**
- **Criteria**: Customer stories, implementation examples, results
- **Patterns**: /case-study/, /success-story/, /customer/, testimonial schema
- **Analysis**: FULL ANALYSIS
- **Special Rules**: Authority and brand alignment important

### 12. **Pricing Page**
- **Criteria**: Pricing information, plans, packages
- **Patterns**: /pricing/, /plans/, /packages/, price schema
- **Analysis**: PARTIAL ANALYSIS
- **Special Rules**: Focus on clarity and structure

### 13. **404/Error Pages**
- **Criteria**: Error pages, not found pages
- **Patterns**: 404 status code, /404/, error messages in content
- **Analysis**: EXCLUDED
- **Reason**: Not indexable content

### 14. **Login/Account Pages**
- **Criteria**: Authentication pages, user dashboards
- **Patterns**: /login/, /signin/, /account/, /dashboard/, noindex meta tag
- **Analysis**: EXCLUDED
- **Reason**: Gated content, not publicly accessible

### 15. **Search Results Pages**
- **Criteria**: Internal search results, filtered content
- **Patterns**: /search/, ?q=, ?query=, dynamically generated lists
- **Analysis**: EXCLUDED
- **Reason**: Duplicate/dynamic content

## Detection Logic

### Primary Detection Methods:
1. **URL Pattern Analysis**
   - Path segments (/blog/, /product/)
   - Query parameters
   - File extensions

2. **Content Analysis**
   - Text-to-link ratio
   - Content structure (headings, paragraphs)
   - Presence of specific elements (author, date, price)

3. **Meta Data Analysis**
   - Page title patterns
   - Meta descriptions
   - Schema.org markup

4. **DOM Structure Analysis**
   - Navigation elements
   - Form presence
   - Content layout patterns

## Analysis Rules by Category

### FULL ANALYSIS Categories:
- Homepage
- Product/Service Pages
- Blog Posts/Articles
- Documentation/Help
- Landing Pages
- FAQ Pages
- Case Studies

**Scoring Weights:**
- All dimensions analyzed with standard weights

### PARTIAL ANALYSIS Categories:
- About/Company Pages
- Pricing Pages

**Scoring Weights:**
- Freshness: 0.5x weight
- Authority: 0.5x weight  
- Structure: 1x weight
- Snippet: 0.5x weight
- Brand: 2x weight

### LIMITED ANALYSIS Categories:
- Navigation/Category Pages

**Scoring Weights:**
- Only Structure and Brand analyzed
- Other dimensions skipped

### EXCLUDED Categories:
- Contact Pages
- Legal/Policy Pages
- 404/Error Pages
- Login/Account Pages
- Search Results Pages

**Rules:**
- Skip content analysis entirely
- Mark as "excluded_from_analysis" in database
- Do not calculate scores

## Implementation Architecture

### 1. Page Categorizer Service
```typescript
interface PageCategory {
  type: PageCategoryType;
  confidence: number;
  analysisLevel: 'full' | 'partial' | 'limited' | 'excluded';
  weightModifiers?: DimensionWeights;
}

class PageCategorizerService {
  categorize(url: string, html: string, metadata: PageMetadata): PageCategory
  getAnalysisRules(category: PageCategoryType): AnalysisRules
}
```

### 2. Integration Points
- Call categorizer before content analysis
- Apply category-specific rules during scoring
- Store category in database with content scores

### 3. Category Detection Pipeline
1. URL pattern matching (highest priority)
2. Schema.org type detection
3. Content structure analysis
4. Meta tag patterns
5. Fallback heuristics

## Benefits

1. **Efficiency**: Skip analysis for low-value pages
2. **Accuracy**: Apply appropriate weights per page type
3. **Relevance**: Focus on pages that matter for brand/SEO
4. **Scalability**: Reduce processing for large sites

## Future Enhancements

1. Machine learning for category detection
2. Custom category definitions per project
3. Category-specific quality thresholds
4. Automated exclusion list updates