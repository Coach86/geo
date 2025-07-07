# AEO Rules Category Changes

## Rules Moved from Content to Authority Category

The following three rules have been moved from the CONTENT category to the AUTHORITY category:

1. **Citing Reputable Sources** (`citing-sources.rule.ts`)
   - Previous category: CONTENT
   - New category: AUTHORITY
   - File path: `/backend/src/modules/crawler/rules/aeo/content/citing-sources.rule.ts`

2. **Comparison Content** (`comparison-content.rule.ts`)
   - Previous category: CONTENT
   - New category: AUTHORITY
   - File path: `/backend/src/modules/crawler/rules/aeo/content/comparison-content.rule.ts`

3. **Concise, Upfront Answers** (`concise-answers.rule.ts`)
   - Previous category: CONTENT
   - New category: AUTHORITY
   - File path: `/backend/src/modules/crawler/rules/aeo/content/concise-answers.rule.ts`

## Changes Made

1. Updated the category in each rule file from `'CONTENT' as Category` to `'AUTHORITY' as Category`
2. Moved the imports in `aeo-rule-registry.service.ts` from the Content Rules section to the Authority Rules section
3. Moved the rule registrations in `aeo-rule-registry.service.ts` from the Content Rules section to the Authority Rules section

## Note

The physical files remain in the `/content/` directory but are now categorized as Authority rules in the system. This affects how they are grouped and displayed in the UI and how their scores are aggregated.