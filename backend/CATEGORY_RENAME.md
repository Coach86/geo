# Category Rename: Content to Structure

## Date: December 2024

## Summary
The "Content" category has been renamed to "Structure" throughout the codebase.

## Changes Made

### Backend Changes

1. **Type Definition** (`/backend/src/modules/crawler/interfaces/rule.interface.ts`)
   - Updated `Category` type from `'CONTENT'` to `'STRUCTURE'`
   - Updated `Score` interface's `categoryScores` to use `structure` instead of `content`

2. **Schema Updates**
   - `content-score.schema.ts`: Updated `scores` object to use `structure` field
   - `domain-analysis.schema.ts`: Updated all references from `content` to `structure`

3. **Service Updates**
   - `aeo-rule-registry.service.ts`: Updated category weights and summary to use `STRUCTURE`
   - `aeo-scoring.service.ts`: Updated category arrays and score mapping to use `structure`
   - `aeo-content-analyzer.service.ts`: Already had correct reference to `structure`
   - `domain-analysis.service.ts`: Updated analysis results to use `structure`

4. **Repository Updates**
   - `content-score.repository.ts`: Updated aggregation field from `avgContentScore` to `avgStructureScore`

5. **Controller Updates**
   - `user-crawler.controller.ts`: Updated score breakdown to use `structure`

6. **Rule Files** (in `/backend/src/modules/crawler/rules/aeo/content/`)
   - Updated all rule files to use `'STRUCTURE' as Category` instead of `'CONTENT' as Category`
   - Exception: Three rules moved to Authority category (citing-sources, comparison-content, concise-answers)

### Frontend Changes

1. **Component Updates**
   - `ScoringRulesTab.tsx`: Updated dimension colors, icons, and display names
   - `PageDetailsSection.tsx`: Updated category type and dimension colors
   - `ScoreCalculationTable.tsx`: Updated category type and dimension colors
   - `PageAnalysisTable.tsx`: Updated category type and scores interface

2. **Hook Updates**
   - `useContentKPI.ts`: Updated interfaces to use `structure` instead of `content`

3. **Other Components**
   - `DomainAnalysisTab.tsx`: Already had correct reference to `structure`

## Notes

- The physical directory structure remains unchanged (`/content/` folder still exists)
- Rules previously in the Content category are now in the Structure category
- Three rules were moved from Content to Authority before this rename:
  - Citing Reputable Sources
  - Comparison Content
  - Concise, Upfront Answers