# AEO Rules Update Summary

## Overview
Updated AEO rules to properly format evidence arrays for frontend display:
1. Wrapped source code in `<code>` tags
2. Added `<target>` markup for goals/thresholds 
3. Added score calculation breakdowns at the end of each evidence array

## Files Updated

### 1. `/backend/src/modules/crawler/rules/aeo/technical/structured-data.rule.ts`
- Wrapped JSON-LD source code snippets in `<code>` tags (lines 113-120)
- Added score breakdown tracking throughout evaluation
- Added final score calculation display with formula

### 2. `/backend/src/modules/crawler/rules/aeo/content/citing-sources.rule.ts`
- Wrapped citation excerpts in `<code>` tags (line 288)
- Added score breakdown tracking
- Added `<target>` tags for citation goals
- Added final score calculation display

### 3. `/backend/src/modules/crawler/rules/aeo/content/meta-description.rule.ts`
- Wrapped meta description content in `<code>` tags (line 38)
- Added score breakdown tracking for all scoring components
- Added `<target>` tags for length optimization goals
- Added final score calculation display

### 4. `/backend/src/modules/crawler/rules/aeo/content/definitional-content.rule.ts`
- Wrapped definition excerpts in `<code>` tags (line 236)
- Added score breakdown tracking
- Added `<target>` tags for definition count goals
- Added final score calculation display

### 5. `/backend/src/modules/crawler/rules/aeo/technical/clean-html-structure.rule.ts`
- Added score breakdown tracking for all deductions
- Added `<target>` tags for HTML improvement goals
- Added final score calculation display

### 6. Created utility helper: `/backend/src/modules/crawler/rules/aeo/utils/evidence-formatter.ts`
- Centralized formatting functions for consistent evidence display
- `wrapCode()`: Wraps code in `<code>` tags
- `formatTarget()`: Creates `<target>` tags with optional points
- `formatScoreCalculation()`: Generates score breakdown display
- `formatCodeBlock()`: Formats multi-line code blocks

## Patterns Found and Fixed

### Code Display Patterns:
1. **JSON.stringify output**: Found in structured-data.rule.ts where JSON-LD schemas are displayed
2. **Citation excerpts**: Found in citing-sources.rule.ts where source quotes are shown
3. **Meta descriptions**: Found in meta-description.rule.ts where meta content is displayed
4. **Definition excerpts**: Found in definitional-content.rule.ts where definitions are quoted

### Score Calculation Pattern:
All rules now follow this pattern:
```typescript
const scoreBreakdown: { component: string; points: number }[] = [];
// Track score changes throughout evaluation
scoreBreakdown.push({ component: 'Description', points: value });
// At the end, display calculation
evidence.push('─────────────────────────────────────');
evidence.push('📊 Score Calculation:');
evidence.push(`${breakdown} = ${finalScore}/100`);
```

### Target Display Pattern:
Goals and thresholds are now wrapped in `<target>` tags:
```typescript
evidence.push('<target>Target: Achieve X for +Y points</target>');
```

## Frontend Implementation Notes

The frontend should handle these tags:
- `<code>`: Display with monospace font and code styling
- `<target>`: Display as highlighted goals/targets (e.g., with different background color)
- Score calculation section: Could be styled distinctly as a summary section

## Remaining Files to Update

Other AEO rules that may need similar updates:
- All files in `/backend/src/modules/crawler/rules/aeo/authority/`
- All files in `/backend/src/modules/crawler/rules/aeo/monitoring-kpi/`
- Remaining files in `/backend/src/modules/crawler/rules/aeo/content/`
- Remaining files in `/backend/src/modules/crawler/rules/aeo/technical/`

Each would need to be checked for:
1. Code/HTML snippets being displayed without `<code>` tags
2. Missing score calculation breakdowns
3. Missing `<target>` tags for improvement goals