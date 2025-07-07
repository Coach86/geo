# Missing Rules Analysis - Standalone vs Real System

## Current Standalone Script Rules (12 total)

### Technical (5 rules)
- status-code.rule.js
- https-security.rule.js
- mobile-optimization.rule.js
- url-structure.rule.js
- structured-data.rule.js (in quality)

### Content (4 rules)
- main-heading.rule.js
- meta-description.rule.js (NO LLM)
- content-freshness.rule.js
- subheadings.rule.js

### Authority (2 rules)
- author-credentials.rule.js
- citing-sources.rule.js (NO LLM)

### Quality (2 rules)
- content-depth.rule.js
- in-depth-guides-llm.rule.js (ONLY rule with LLM)

## Real System Rules (30+ total)

### Technical (9 rules)
✓ StatusCodeRule
✓ HttpsSecurityRule
✓ MobileOptimizationRule
✓ UrlStructureRule
✓ StructuredDataRule
✗ CleanHtmlStructureRule
✗ LlmsTxtRule
✗ RobotsTxtRule
✗ XmlSitemapRule

### Content/Structure (12 rules)
✓ MainHeadingRule
✓ MetaDescriptionRule (BUT REAL USES LLM!)
✓ ContentFreshnessRule
✓ SubheadingsRule
✗ HowToContentRule
✗ DefinitionalContentRule (USES LLM)
✗ CaseStudiesRule (USES LLM)
✗ FAQPagesRule
✗ ImageAltRule
✗ GlossariesRule
✗ InDepthGuidesRule (USES LLM - we only have this)
✗ MultimodalContentRule

### Authority (8 rules)
✓ AuthorCredentialsRule
✓ CitingSourcesRule (BUT REAL USES LLM!)
✗ ComparisonContentRule (USES LLM)
✗ ConciseAnswersRule (USES LLM)
✗ IndustryPublicationsRule (USES LLM)
✗ PressReleaseRule (USES LLM)
✗ WikipediaPresenceRule
✗ WikidataPresenceRule

## Summary

1. **Missing Rules**: The standalone script is missing 18 rules!
2. **Missing LLM Rules**: 8 rules that use LLM are completely missing
3. **Incorrect Non-LLM Rules**: 2 rules (MetaDescriptionRule, CitingSourcesRule) don't use LLM in standalone but do in real system

This explains why you see "0 with LLM" - because:
- Only 1 rule (InDepthGuidesRule) has LLM support in standalone
- That rule might not apply to the GUIDES_TUTORIALS page category
- 8 other LLM-using rules are completely missing

## What Needs to Be Done

1. Port all missing rules from the real system
2. Add LLM support to rules that need it:
   - MetaDescriptionRule
   - CitingSourcesRule
   - DefinitionalContentRule
   - CaseStudiesRule
   - ComparisonContentRule
   - ConciseAnswersRule
   - IndustryPublicationsRule
   - PressReleaseRule

3. Ensure rule applicability matches the real system (which rules apply to which page types)