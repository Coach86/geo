# Deviation Analysis - Standalone Script vs Real System

## The Core Issues

### 1. Missing Rules (18 rules missing!)
The standalone script only implements 12 rules while the real system has 30+ rules.

**Missing LLM-using rules:**
- DefinitionalContentRule 
- CaseStudiesRule
- ComparisonContentRule
- ConciseAnswersRule
- IndustryPublicationsRule
- PressReleaseRule

**Other missing rules:**
- CleanHtmlStructureRule
- LlmsTxtRule
- RobotsTxtRule
- XmlSitemapRule
- HowToContentRule
- FAQPagesRule
- ImageAltRule
- GlossariesRule
- MultimodalContentRule
- WikipediaPresenceRule
- WikidataPresenceRule

### 2. Wrong Rule Implementations
- **MetaDescriptionRule**: In real system it uses LLM, in standalone it doesn't
- **CitingSourcesRule**: In real system it uses LLM, in standalone it doesn't

### 3. Page Categorization Issues (Now Fixed)
- ✅ Fixed: Page categories now match real system exactly
- ✅ Fixed: URL-based categorization now only handles obvious cases (homepage, error, login)
- ✅ Fixed: LLM prompt now matches real system

### 4. Rule Applicability
The InDepthGuidesRule applies to these page types:
- `in_depth_guide_white_paper`
- `how_to_guide_tutorial` 
- `blog_post_article`
- `pillar_page_topic_hub`

So for the page `https://alan.com/fr-fr/assurance-sante/guide-assurance-maladie`:
- It was categorized as `how_to_guide_tutorial` (correct!)
- The InDepthGuidesLLMRule SHOULD apply (it's in the pageTypes list)
- But it shows "0 with LLM" because either:
  1. The rule filtering logic isn't working correctly
  2. OR the rule was skipped for some other reason

## Why You See "0 with LLM"

1. **Most LLM rules are missing** - Only 1 out of 9 LLM-using rules is implemented
2. **Rule filtering might be broken** - Need to check if rules are being filtered by page type correctly
3. **Wrong rule implementations** - 2 rules that should use LLM don't in the standalone version

## What the Real System Does

Looking at `AEORuleRegistryService`, these rules are initialized with LlmService:
```typescript
this.register(new DefinitionalContentRule(this.llmService));
this.register(new CaseStudiesRule(this.llmService));
this.register(new MetaDescriptionRule(this.llmService));
this.register(new InDepthGuidesRule(this.llmService));
this.register(new CitingSourcesRule(this.llmService));
this.register(new ComparisonContentRule(this.llmService));
this.register(new ConciseAnswersRule(this.llmService));
this.register(new IndustryPublicationsRule(this.llmService));
this.register(new PressReleaseRule(this.llmService));
```

## To Match Real Behavior

1. **Port all missing rules** (especially the LLM ones)
2. **Fix existing rules** to use LLM where the real system does
3. **Ensure rule filtering works** - rules should only run on applicable page types
4. **Test with debug logging** to see which rules are actually running

The standalone script is significantly simplified compared to the real system!