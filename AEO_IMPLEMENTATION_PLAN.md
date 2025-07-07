# AEO (AI Engine Optimization) Implementation Plan

## Executive Summary

This document outlines the implementation plan for integrating AEO (AI Engine Optimization) rules into the Mint AI codebase. The plan replaces the current 4-dimension scoring system (authority, freshness, structure, brand) with a comprehensive category-based system covering Technical, Content, Authority, and Monitoring KPIs.

## Current State Analysis

### Existing Crawler Module (`backend/src/modules/crawler/`)
- **Architecture**: Rule-based scoring system with analyzers
- **Current Rules**: Structure and Brand rules with base classes
- **Services**: 
  - `scoring-rules.service.ts` - manages scoring configuration
  - `content-analyzer.service.ts` - orchestrates analysis
  - `domain-analysis.service.ts` - domain-level analysis
- **Analyzers**: 
  - `authority.analyzer.ts`, `freshness.analyzer.ts` 
  - `structure.analyzer.ts`, `brand.analyzer.ts`
- **Registry**: `rule-registry.service.ts` for rule management
- **Scoring**: Threshold-based scoring (0-100) with weighted aggregation

### New AEO Requirements
- **Categories**: TECHNICAL, CONTENT, AUTHORITY, MONITORING KPIs
- **Elements**: 50+ specific optimization criteria
- **Page Types**: 20+ different page type applicabilities
- **Scoring**: Complex formulas with implementation scores and impact levels
- **Tooling**: Built-in diagnostic messages and recommendations


## Implementation Architecture

**Note**: The implementation will extend the existing crawler module at `backend/src/modules/crawler/` rather than creating a new module. This leverages the existing scoring infrastructure, analyzers, and rule registry patterns.

### Phase 1: Data Model & Infrastructure

#### 1.1 New Interfaces
```typescript
// Core AEO interfaces
interface AEORule {
  id: string;
  category: AEOCategory;
  criteria: string;
  element: string;
  applicationLevel: 'Page' | 'Domain' | 'Off-Site';
  scoringFormula: ScoringFormula;
  seoLlmType: 'SEO' | 'SEO adapted to LLM' | 'LLM';
  impact: 'High' | 'Medium' | 'Low';
  impactScore: number; // 1-3
  implementationScore: number; // 0-3
  tool?: string;
  importance: string;
  checklist: string[];
  issueMessage?: string;
  recommendationMessage?: string;
  pageApplicability: PageApplicability;
}

interface AEOCategory {
  name: 'TECHNICAL' | 'CONTENT' | 'AUTHORITY' | 'MONITORING_KPI';
  weight: number;
  description: string;
}

interface ScoringFormula {
  thresholds: ScoreThreshold[];
  customFormula?: string;
}

interface PageApplicability {
  homePage: boolean;
  productCategoryPage: boolean;
  productDetailPage: boolean;
  servicesPage: boolean;
  pricingPage: boolean;
  comparisonPage: boolean;
  blogPost: boolean;
  blogCategory: boolean;
  pillarPage: boolean;
  productRoundup: boolean;
  howToGuide: boolean;
  caseStudy: boolean;
  definitionalPage: boolean;
  inDepthGuide: boolean;
  faqGlossaryPage: boolean;
  forumUgcPage: boolean;
  corporateContactPage: boolean;
  legalPage: boolean;
  searchErrorPage: boolean;
  domainLevel: boolean;
  offSiteLevel: boolean;
}
```

#### 1.2 Extending Existing Schemas
```typescript
// Extend existing content-score.schema.ts to support AEO scoring
export interface ContentScore {
  // EXISTING FIELDS
  url: string;
  projectId: string;
  timestamp: Date;
  
  // EXISTING DIMENSION SCORES (keep for backward compatibility)
  authorityScore?: number;
  freshnessScore?: number;
  structureScore?: number;
  brandScore?: number;
  globalScore?: number;
  
  // NEW AEO SCORES
  aeoScores?: {
    technical: AEOCategoryScore;
    content: AEOCategoryScore;
    authority: AEOCategoryScore;
    monitoringKpi: AEOCategoryScore;
  };
  aeoGlobalScore?: number;
  
  // Track which system was used
  scoringSystem?: 'legacy' | 'aeo' | 'both';
  
  // Page classification for AEO rules
  pageType?: PageType;
  
  // Applied rules and their results
  aeoRuleResults?: AEORuleResult[];
}

interface AEOCategoryScore {
  score: number;
  weight: number;
  appliedRules: number;
  passedRules: number;
  issues: string[];
  recommendations: string[];
}
```

### Phase 2: Rule Implementation & Management

#### 2.1 Rule Definition Classes
```typescript
// Extend the existing base rule pattern from crawler module
// Similar to existing base-structure.rule.ts and base-brand.rule.ts
export abstract class BaseAEORule implements AEORule {
  abstract id: string;
  abstract category: AEOCategory;
  abstract criteria: string;
  abstract element: string;
  abstract scoringFormula: ScoringFormula;
  abstract analyze(content: PageContent): RuleResult;
}

// Example: Clean HTML Structure Rule
export class CleanHtmlStructureRule extends BaseAEORule {
  id = 'technical_clean_html';
  category = AEOCategory.TECHNICAL;
  criteria = 'Discovery & Accessibility';
  element = 'Clean HTML Structure';
  applicationLevel = 'Page';
  seoLlmType = 'SEO adapted to LLM';
  impact = 'High';
  impactScore = 3;
  
  scoringFormula = {
    thresholds: [
      { min: 0, max: 20, score: 20, description: 'No semantic HTML, content in JS' },
      { min: 21, max: 40, score: 40, description: 'Some semantic tags, validation errors' },
      { min: 41, max: 60, score: 60, description: 'Good semantics, minor errors' },
      { min: 61, max: 80, score: 80, description: 'Excellent semantics, minimal errors' },
      { min: 81, max: 100, score: 100, description: 'Perfect HTML structure' }
    ]
  };
  
  analyze(content: PageContent): RuleResult {
    // Implementation logic
  }
}
```

#### 2.2 Extending Rule Registry Service
```typescript
// Extend existing src/modules/crawler/rules/registry/rule-registry.service.ts
@Injectable()
export class RuleRegistryService {  // EXISTING SERVICE
  private rules: Map<string, BaseAEORule> = new Map();
  
  constructor() {
    this.registerAllRules();
  }
  
  private registerAllRules(): void {
    // Technical Rules
    this.register(new CleanHtmlStructureRule());
    this.register(new HttpsSecurityRule());
    this.register(new PageSpeedRule());
    this.register(new MobileOptimizationRule());
    this.register(new RobotsTxtRule());
    this.register(new StatusCodeRule());
    this.register(new StructuredDataRule());
    
    // Content Rules
    this.register(new ContentDepthRule());
    this.register(new KeywordRelevanceRule());
    this.register(new ReadabilityRule());
    this.register(new MultimodalContentRule());
    
    // Authority Rules
    this.register(new AuthorCredentialsRule());
    this.register(new CitationQualityRule());
    this.register(new BrandMentionsRule());
    
    // Add all other rules...
  }
  
  getRulesForPageType(pageType: string): BaseAEORule[]
  getRulesByCategory(category: AEOCategory): BaseAEORule[]
  getActiveRules(): BaseAEORule[]
  toggleRule(ruleId: string, enabled: boolean): void
}
```

#### 2.3 Rule Implementation Structure
```typescript
// Extend existing crawler module structure
src/modules/crawler/
├── rules/           # EXISTING DIRECTORY
│   ├── aeo/        # NEW: AEO-specific rules
│   │   ├── technical/
│   │   │   ├── clean-html-structure.rule.ts
│   │   │   ├── https-security.rule.ts
│   │   │   ├── page-speed.rule.ts
│   │   │   ├── mobile-optimization.rule.ts
│   │   │   ├── robots-txt.rule.ts
│   │   │   ├── status-code.rule.ts
│   │   │   └── structured-data.rule.ts
│   │   ├── content/
│   │   │   ├── content-depth.rule.ts
│   │   │   ├── keyword-relevance.rule.ts
│   │   │   ├── readability.rule.ts
│   │   │   └── multimodal-content.rule.ts
│   │   ├── authority/
│   │   │   ├── author-credentials.rule.ts
│   │   │   ├── citation-quality.rule.ts
│   │   │   └── brand-mentions.rule.ts
│   │   └── monitoring/
│   │       ├── search-visibility.rule.ts
│   │       └── performance-metrics.rule.ts
│   ├── structure/   # EXISTING
│   ├── brand/       # EXISTING
│   └── registry/    # EXISTING
├── interfaces/      # EXISTING - extend with AEO interfaces
├── services/        # EXISTING - extend scoring-rules.service.ts
├── analyzers/       # EXISTING - add AEO analyzers
└── config/          # EXISTING - add aeo-rules.config.ts
```

#### 2.4 Example Rule Implementation

```typescript
// Example: HTTPS Security Rule
export class HttpsSecurityRule extends BaseAEORule {
  id = 'technical_https_security';
  category = AEOCategory.TECHNICAL;
  criteria = 'Discovery & Accessibility';
  element = 'HTTPS';
  applicationLevel = 'Domain' as const;
  seoLlmType = 'SEO' as const;
  impact = 'High' as const;
  impactScore = 3;
  
  tool = 'Google Search Console API';
  
  importance = 'HTTPS is a fundamental trust and security signal for users and AI. ' +
               'A secure site is considered more credible and is prioritised by AI systems.';
  
  checklist = [
    'Access the "HTTPS" report in GSC to see which URLs are served over HTTPS and which are not',
    'Identify pages listed as HTTP or with HTTPS issues in the HTTPS report',
    'Check for warnings about invalid, expired, or missing SSL certificates',
    'Review the HTTPS report for mixed content issues',
    'Ensure HTTP URLs are properly redirected to HTTPS'
  ];
  
  issueMessage = 'Your site has HTTPS configuration issues that may impact trust and security signals';
  
  recommendationMessage = 'Ensure all pages use HTTPS, fix SSL certificate issues, resolve mixed content warnings, ' +
                         'and implement proper HTTP to HTTPS redirects';
  
  pageApplicability = {
    homePage: false,
    productCategoryPage: false,
    productDetailPage: false,
    // ... other page types set to false
    domainLevel: true,
    offSiteLevel: false
  };
  
  scoringFormula = {
    thresholds: [
      { 
        min: 81, 
        max: 100, 
        score: 100, 
        description: '100% HTTPS with no GSC warnings, valid certificates, no mixed content' 
      },
      { 
        min: 61, 
        max: 80, 
        score: 80, 
        description: 'Mostly HTTPS with minor non-critical issues' 
      },
      { 
        min: 41, 
        max: 60, 
        score: 60, 
        description: 'Significant non-HTTPS URLs or major issues like certificate problems' 
      },
      { 
        min: 0, 
        max: 40, 
        score: 0, 
        description: 'Large portion on HTTP or critical SSL errors' 
      }
    ]
  };
  
  async analyze(content: PageContent): Promise<RuleResult> {
    // Implementation would check GSC API for HTTPS status
    const { isHttps, hasMixedContent, certificateValid, sslDetails } = content.securityInfo;
    
    let score = 0;
    const evidence: string[] = [];
    const issues: RuleIssue[] = [];
    
    // Always collect evidence, both positive and negative
    if (isHttps) {
      evidence.push('Site is served over HTTPS');
    } else {
      evidence.push('Site is NOT using HTTPS protocol');
    }
    
    if (certificateValid) {
      evidence.push(`SSL certificate is valid (expires: ${sslDetails.expiryDate})`);
    }
    
    if (!hasMixedContent) {
      evidence.push('No mixed content issues detected');
    }
    
    // Calculate score and identify issues
    if (!isHttps) {
      score = 0;
      issues.push({
        severity: 'critical',
        description: 'Site not using HTTPS',
        recommendation: this.recommendationMessage
      });
    } else if (!certificateValid) {
      score = 40;
      issues.push({
        severity: 'high',
        description: 'SSL certificate issues detected',
        recommendation: 'Renew or fix SSL certificate immediately'
      });
      evidence.push(`Certificate error: ${sslDetails.error}`);
    } else if (hasMixedContent) {
      score = 60;
      issues.push({
        severity: 'medium',
        description: 'Mixed content warnings present',
        recommendation: 'Update all resources to use HTTPS URLs'
      });
      evidence.push(`Found ${sslDetails.mixedContentCount} mixed content resources`);
    } else {
      score = 100;
      evidence.push('Full HTTPS implementation with no issues');
    }
    
    return {
      ruleId: this.id,
      score,
      maxScore: 100,
      weight: 1.0,
      contribution: score * 1.0, // score * weight
      passed: score >= 80,
      evidence, // CRITICAL: Always provide evidence
      details: {
        isHttps,
        hasMixedContent,
        certificateValid,
        sslDetails
      },
      issues
    };
  }
}
```

#### 2.5 Evidence System Best Practices

**CRITICAL**: Every AEO rule MUST populate the evidence array to maintain compatibility with the frontend display system.

##### Evidence Guidelines
1. **Always Provide Evidence**: Even when score is 100, provide positive evidence
2. **Be Specific**: Include numbers, counts, and specific findings
3. **Use Clear Language**: Evidence should be understandable by non-technical users
4. **Include Context**: Provide enough information for users to take action

##### Evidence Examples
```typescript
// Good Evidence Examples
evidence.push('Found 1 H1 tag with 45 characters (optimal range: 20-60)');
evidence.push('Page loads in 2.3 seconds (target: <3 seconds)');
evidence.push('Detected 5 semantic HTML5 elements: article, nav, header, main, footer');
evidence.push('All 12 images have descriptive alt text');

// Poor Evidence Examples
evidence.push('H1 found'); // Too vague
evidence.push('Page speed OK'); // Not specific
evidence.push('Good HTML'); // Not actionable
```

### Phase 3: Analysis Engine

#### 3.1 Analyzer Factory Pattern
```typescript
@Injectable()
export class AEOAnalyzerFactory {
  createAnalyzer(category: AEOCategory): BaseAEOAnalyzer
  
  // Specific analyzers
  - TechnicalAnalyzer
  - ContentAnalyzer  
  - AuthorityAnalyzer
  - MonitoringKpiAnalyzer
}

abstract class BaseAEOAnalyzer {
  analyzeUrl(url: string, pageContent: PageContent): Promise<CategoryAnalysis>
  applyRule(rule: AEORule, pageContent: PageContent): RuleResult
  calculateScore(results: RuleResult[]): CategoryScore
}
```

#### 3.2 Page Type Classifier
```typescript
@Injectable() 
export class PageTypeClassifierService {
  classifyPage(url: string, content: PageContent): PageType
  getApplicableRules(pageType: PageType): AEORule[]
}
```

### Phase 4: Scoring & Aggregation

#### 4.1 AEO Scoring Service
```typescript
// New service in src/modules/crawler/services/aeo-scoring.service.ts
@Injectable()
export class AEOScoringService {
  constructor(
    private ruleRegistry: RuleRegistryService,
    private pageClassifier: PageTypeClassifierService
  ) {}
  
  async calculateScore(url: string, content: PageContent): Promise<AEOScore> {
    // Classify page type
    const pageType = await this.pageClassifier.classifyPage(url, content);
    
    // Get applicable rules for this page type
    const applicableRules = this.ruleRegistry.getRulesForPageType(pageType);
    
    // Execute rules by category
    const categoryScores = await this.executeCategoryRules(applicableRules, content);
    
    // Calculate global score
    const globalScore = this.aggregateScores(categoryScores);
    
    return {
      url,
      pageType,
      categoryScores,
      globalScore,
      timestamp: new Date()
    };
  }
  
  generateRecommendations(score: AEOScore): Recommendation[]
  aggregateScores(categoryScores: AEOCategoryScore[]): number
}
```


### Phase 5: API & Frontend Integration (Including Evidence System)

**Note**: The AEO system will use the existing crawler API endpoints at `/user/projects/:projectId/crawler/*`. No new API endpoints are needed - the existing content analysis endpoints will automatically return AEO scores instead of legacy scores.

#### 5.1 Admin API Endpoints (Optional)
```
GET    /api/admin/aeo-rules/active     - Get active ruleset
PUT    /api/admin/aeo-rules/toggle     - Enable/disable specific rules
POST   /api/admin/aeo-rules/validate   - Validate rule configuration
GET    /api/admin/aeo-rules/preview    - Preview scoring changes
PUT    /api/admin/aeo-rules/weights    - Adjust category weights
```

#### 5.2 Frontend Components - /content-kpi Updates

**Critical: Maintain and Extend the Evidence System**

The current content-kpi page displays evidence for each rule through the `RuleBasedScoreBreakdown` component. This MUST be preserved and extended for AEO rules.

##### Existing Evidence Display Structure
```typescript
// Current evidence display in RuleBasedScoreBreakdown.tsx
interface RuleResult {
  ruleId: string;
  ruleName: string;
  score: number;
  evidence: string[];  // CRITICAL: Evidence array for each rule
  issues?: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
  }>;
}
```

##### Frontend Component Updates
1. **Extend ContentKPIDashboard.tsx**
   - Add new tab for AEO scores alongside existing dimensions
   - Display AEO categories (Technical, Content, Authority, Monitoring)
   - Maintain drill-down capability to see evidence per rule

2. **Create AEOScoreBreakdown.tsx**
   - Based on existing RuleBasedScoreBreakdown pattern
   - Display evidence for each AEO rule execution
   - Show issue messages and recommendations from AEO rules
   - Maintain collapsible structure for detailed views

3. **Update Existing Components**
   - Modify score displays to show both legacy and AEO scores
   - Add toggle to switch between scoring systems
   - Ensure evidence is displayed for both systems

##### Evidence Display Requirements
- Each AEO rule MUST populate the evidence array with specific findings
- Evidence should be clear, actionable text (e.g., "Found 3 H1 tags on page")
- Issues should include both issueMessage and recommendationMessage from rules
- Maintain the green checkmark (✓) for positive evidence
- Keep the existing severity color coding for issues

## Implementation Sequence

### Week 1-2: Foundation
1. Extend existing crawler interfaces with AEO types
2. Implement rule classes for each AEO rule
3. Extend existing rule registry service to manage AEO rule instances
4. Update existing database schemas to support AEO scoring

### Week 3-4: Analysis Engine
1. Implement analyzer factory
2. Create category-specific analyzers
3. Build page type classifier
4. Develop scoring engine

### Week 5-6: Integration
1. Create admin API endpoints
2. Build backward compatibility layer
3. Implement parallel scoring
4. Add monitoring and logging

### Week 7-8: Frontend & Testing
1. Update frontend components
2. Create migration scripts
3. Perform integration testing
4. Document new system


## Summary

This implementation plan replaces the current 4-dimension scoring system with comprehensive AEO (AI Engine Optimization) rules. Key points:

1. **Leverage Existing Infrastructure**: Build upon the existing crawler module's analyzers, services, and rule registry patterns.

2. **Evidence System**: Every AEO rule must populate the evidence array with specific, actionable findings to maintain the transparency users expect.

3. **Modular Rule Implementation**: Each AEO rule is a self-contained TypeScript class with its own scoring logic, messages, page applicability, and evidence collection.

4. **Frontend Integration**: The content-kpi page will display AEO scores with full drill-down capability to view evidence and issues for each rule.

5. **Comprehensive Coverage**: Implement 50+ rules across Technical, Content, Authority, and Monitoring KPI categories as specified in the reference document.

The implementation maintains the evidence-based transparency that helps users understand and act on the scoring results.