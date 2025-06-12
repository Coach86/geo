# Prompt Type Renaming Plan

## Overview
This document outlines all the changes needed to rename prompt types across the frontend codebase:

- `brandBattle` → `competition`
- `spontaneous` → `visibility`
- `accuracy` → `alignment`
- `direct` → `sentiment`
- `comparison` → **REMOVE ENTIRELY**

## Files and Lines to Change

### 1. Type Definition Files

#### `/Users/emmanuelcosta/Projects/geo/frontend/lib/api/types.ts`
- Line 137: `spontaneous: string[];` → `visibility: string[];`
- Line 138: `direct: string[];` → `sentiment: string[];`
- Line 139: `comparison: string[];` → **DELETE THIS LINE**
- Line 140: `accuracy: string[];` → `alignment: string[];`
- Line 141: `brandBattle: string[];` → `competition: string[];`
- Line 173: `spontaneous: string[];` → `visibility: string[];`
- Line 174: `direct: string[];` → `sentiment: string[];`
- Line 175: `comparison: string[];` → **DELETE THIS LINE**
- Line 176: `accuracy: string[];` → `alignment: string[];`
- Line 177: `brandBattle: string[];` → `competition: string[];`
- Line 183: `spontaneous: string[];` → `visibility: string[];`
- Line 184: `direct: string[];` → `sentiment: string[];`
- Line 185: `comparison: string[];` → **DELETE THIS LINE**
- Line 186: `accuracy: string[];` → `alignment: string[];`
- Line 187: `brandBattle: string[];` → `competition: string[];`

#### `/Users/emmanuelcosta/Projects/geo/frontend/types/reports.ts`
- Line 171: `brandBattle: LLMResultSet;` → `competition: LLMResultSet;`
- Line 186: `spontaneousResults?: ReportResponse["spontaneous"];` → `visibilityResults?: ReportResponse["visibility"];`
- Line 188: `comparisonResults?: ReportResponse["comparison"];` → **DELETE THIS LINE**
- Line 219: (in string literal) `spontaneous` → `visibility`
- Line 240: (in enum) `BRAND_BATTLE = 'brandBattle'` → `COMPETITION = 'competition'`

#### `/Users/emmanuelcosta/Projects/geo/frontend/app/onboarding/types/form-data.ts`
- Line 60: `comparisonPrompts: string[];` → **DELETE THIS LINE**
- Line 61: `accuracyPrompts?: string[];` → `alignmentPrompts?: string[];`
- Line 62: `brandBattlePrompts?: string[];` → `competitionPrompts?: string[];`
- Line 110: `comparisonPrompts: [],` → **DELETE THIS LINE**
- Line 111: `accuracyPrompts: [],` → `alignmentPrompts: [],`
- Line 112: `brandBattlePrompts: [],` → `competitionPrompts: [],`

### 2. API and Service Files

#### `/Users/emmanuelcosta/Projects/geo/frontend/lib/api/project.ts`
- Line 227: `spontaneous: promptSet.spontaneous` → `visibility: promptSet.visibility`
- Line 228: `direct: promptSet.direct` → `sentiment: promptSet.sentiment`
- Line 229: `comparison: promptSet.comparison` → **DELETE THIS LINE**
- Line 230: `accuracy: promptSet.accuracy` → `alignment: promptSet.alignment`
- Line 231: `brandBattle: promptSet.brandBattle` → `competition: promptSet.competition`

### 3. Component Files

#### `/Users/emmanuelcosta/Projects/geo/frontend/components/project-profile/PromptsPortfolio.tsx`
- Lines 62-64: Comments mentioning `spontaneous` → `visibility`
- Lines 75-76: Variable/property names with `spontaneous` → `visibility`
- Lines 96-97: `spontaneous` → `visibility`
- Line 100: `direct` → `sentiment`
- Lines 102-103: `accuracy` → `alignment`
- Line 106: `brandBattle` → `competition`
- Line 121: `spontaneous` → `visibility`
- Line 122: `direct` → `sentiment`
- Line 123: `comparison` → **DELETE OR ADJUST LOGIC**
- Line 124: `accuracy` → `alignment`
- Line 125: `brandBattle` → `competition`
- Lines 147-148: `spontaneous` → `visibility`
- Line 151: `direct` → `sentiment`
- Lines 153-154: `accuracy` → `alignment`
- Line 157: `brandBattle` → `competition`
- Line 172: `spontaneous` → `visibility`
- Line 173: `direct` → `sentiment`
- Line 174: `comparison` → **DELETE OR ADJUST LOGIC**
- Line 175: `accuracy` → `alignment`
- Line 176: `brandBattle` → `competition`
- Line 188: `spontaneous` → `visibility`
- Lines 223-224: `spontaneous` → `visibility`
- Line 309: `spontaneous` → `visibility`
- Line 311: `spontaneous` → `visibility`
- Line 313: `spontaneous` → `visibility`
- Line 317: `direct` → `sentiment`
- Line 319: `accuracy` → `alignment`
- Line 321: `accuracy` → `alignment`
- Line 325: `brandBattle` → `competition`
- Line 329: `spontaneous` → `visibility`
- Line 333: `spontaneous` → `visibility`
- Line 338: `direct` → `sentiment`
- Line 340: `direct` → `sentiment`
- Line 343: `accuracy` → `alignment`
- Line 347: `accuracy` → `alignment`
- Line 354: `brandBattle` → `competition`

#### `/Users/emmanuelcosta/Projects/geo/frontend/app/(protected)/competition/page.tsx`
- Line 19: `brandBattle` → `competition`
- Line 73: `brandBattle` → `competition`
- Line 168: `brandBattle` → `competition`

#### `/Users/emmanuelcosta/Projects/geo/frontend/components/visibility/TopMentions.tsx`
- Line 18: `spontaneous?: any;` → `visibility?: any;`
- Line 22: `spontaneous` → `visibility`
- Lines 46-50: `spontaneous` → `visibility`
- Line 73: `spontaneous` → `visibility`

#### `/Users/emmanuelcosta/Projects/geo/frontend/components/onboarding/prompt-selection.tsx`
- Line 43: `comparisonPrompts?: string[];` → **DELETE THIS LINE**
- Line 44: `accuracyPrompts?: string[];` → `alignmentPrompts?: string[];`
- Line 45: `brandBattlePrompts?: string[];` → `competitionPrompts?: string[];`
- Line 67: `const [comparisonPrompts, setComparisonPrompts] = useState<string[]>([]);` → **DELETE THIS LINE**
- Line 68: `const [accuracyPrompts, setAccuracyPrompts] = useState<string[]>([]);` → `const [alignmentPrompts, setAlignmentPrompts] = useState<string[]>([]);`
- Line 69: `const [brandBattlePrompts, setBrandBattlePrompts] = useState<string[]>([]);` → `const [competitionPrompts, setCompetitionPrompts] = useState<string[]>([]);`
- Line 87: `comparisonPrompts,` → **DELETE THIS LINE**
- Line 88: `accuracyPrompts,` → `alignmentPrompts,`
- Line 89: `brandBattlePrompts` → `competitionPrompts`
- Line 92: Update dependency array accordingly
- Line 140: `setComparisonPrompts(cached.comparisonPrompts || []);` → **DELETE THIS LINE**
- Line 141: `setAccuracyPrompts(cached.accuracyPrompts || []);` → `setAlignmentPrompts(cached.alignmentPrompts || []);`
- Line 142: `setBrandBattlePrompts(cached.brandBattlePrompts || []);` → `setCompetitionPrompts(cached.competitionPrompts || []);`
- Line 186: `const newVisibilityPrompts = response.spontaneous.map(text => ({ text, selected: true }));` → `const newVisibilityPrompts = response.visibility.map(text => ({ text, selected: true }));`
- Line 187: `const newPerceptionPrompts = response.direct.map(text => ({ text, selected: true }));` → `const newPerceptionPrompts = response.sentiment.map(text => ({ text, selected: true }));`
- Line 193: `comparisonPrompts: response.comparison,` → **DELETE THIS LINE**
- Line 194: `accuracyPrompts: response.accuracy,` → `alignmentPrompts: response.alignment,`
- Line 195: `brandBattlePrompts: response.brandBattle,` → `competitionPrompts: response.competition,`
- Line 203: `setComparisonPrompts(response.comparison);` → **DELETE THIS LINE**
- Line 204: `setAccuracyPrompts(response.accuracy);` → `setAlignmentPrompts(response.alignment);`
- Line 205: `setBrandBattlePrompts(response.brandBattle);` → `setCompetitionPrompts(response.competition);`

#### `/Users/emmanuelcosta/Projects/geo/frontend/components/onboarding/confirmation/PromptsReview.tsx`
- Line 74: References to `comparison` → **REMOVE OR ADJUST LOGIC**
- Line 78: References to `comparison` → **REMOVE OR ADJUST LOGIC**

### 4. State Management Files

#### `/Users/emmanuelcosta/Projects/geo/frontend/lib/onboarding-storage.ts`
- Line 45: `comparisonPrompts: parsed.prompts?.comparisonPrompts || DEFAULT_PROMPT_DATA.comparisonPrompts,` → **DELETE THIS LINE**
- Line 46: `accuracyPrompts: parsed.prompts?.accuracyPrompts || DEFAULT_PROMPT_DATA.accuracyPrompts,` → `alignmentPrompts: parsed.prompts?.alignmentPrompts || DEFAULT_PROMPT_DATA.alignmentPrompts,`
- Line 47: `brandBattlePrompts: parsed.prompts?.brandBattlePrompts || DEFAULT_PROMPT_DATA.brandBattlePrompts,` → `competitionPrompts: parsed.prompts?.competitionPrompts || DEFAULT_PROMPT_DATA.competitionPrompts,`

#### `/Users/emmanuelcosta/Projects/geo/frontend/providers/onboarding-provider.tsx`
- Line 156: `comparisonPrompts: [],` → **DELETE THIS LINE**
- Line 157: `accuracyPrompts: [],` → `alignmentPrompts: [],`
- Line 158: `brandBattlePrompts: [],` → `competitionPrompts: [],`

#### `/Users/emmanuelcosta/Projects/geo/frontend/app/onboarding/layout.tsx`
- Line 181: `comparisonPrompts: currentStepData.comparisonPrompts || [],` → **DELETE THIS LINE**
- Line 182: `accuracyPrompts: currentStepData.accuracyPrompts || [],` → `alignmentPrompts: currentStepData.alignmentPrompts || [],`
- Line 183: `brandBattlePrompts: currentStepData.brandBattlePrompts || [],` → `competitionPrompts: currentStepData.competitionPrompts || [],`
- Line 254: `spontaneous: selectedVisibilityPrompts || [],` → `visibility: selectedVisibilityPrompts || [],`
- Line 255: `direct: selectedPerceptionPrompts || [],` → `sentiment: selectedPerceptionPrompts || [],`
- Line 256: `comparison: formData.prompts.comparisonPrompts || [],` → **DELETE THIS LINE**
- Line 257: `accuracy: formData.prompts.accuracyPrompts || [],` → `alignment: formData.prompts.alignmentPrompts || [],`
- Line 258: `brandBattle: formData.prompts.brandBattlePrompts || []` → `competition: formData.prompts.competitionPrompts || []`

### 5. Utility Files

#### `/Users/emmanuelcosta/Projects/geo/frontend/utils/alignment-transformer.ts`
- Lines 9, 114: Comments mentioning `accuracy` in context of prompts → `alignment`

## Implementation Order

1. **Update Type Definitions** - Start with the base types in `lib/api/types.ts` and `types/reports.ts`
2. **Update Data Models** - Update `app/onboarding/types/form-data.ts`
3. **Update State Management** - Update storage and provider files
4. **Update Components** - Update all component files that use these prompt types
5. **Update API Calls** - Ensure API integration layer uses new names
6. **Clean Up** - Remove any references to `comparison` prompts
7. **Test** - Build and test the application

## Notes

- The `comparison` prompt type should be completely removed from the codebase
- Some components may need logic adjustments after removing `comparison`
- Ensure that all variable names, property names, and type names are updated consistently
- Pay special attention to string literals and enum values that may contain these terms