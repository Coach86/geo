# Onboarding Data Structure Fix

## Issue
The prompt-selection component was unable to access project data (brandName, website, industry) because of a mismatch between two different data storage formats being used in the onboarding flow.

## Root Cause
There are two different data structures in use:

1. **OLD Structure** (used by `OnboardingProvider`):
   - Flat structure with all fields at the root level
   - Example: `{ brandName: "...", website: "...", industry: "..." }`

2. **NEW Structure** (used by `onboarding-storage.ts`):
   - Nested structure with domains
   - Example: `{ project: { brandName: "...", website: "..." }, brand: {...}, prompts: {...} }`

The WebsiteAnalyzer and ProjectInfoFields components were writing data using the OLD structure, but prompt-selection.tsx was reading from the NEW structure.

## Solution
Modified the following components to write data in BOTH formats for compatibility:

### 1. WebsiteAnalyzer.tsx
- Added import for `updateOnboardingData` from `@/lib/onboarding-storage`
- When analyzing website, now writes to both:
  - OLD format via `updateFormData()` (for OnboardingProvider)
  - NEW format via `updateOnboardingData()` (for onboarding-storage)
- Also updates website field onChange to both formats

### 2. ProjectInfoFields.tsx
- Added import for `updateOnboardingData`
- Each field (brandName, description, industry) now updates both formats onChange

### 3. prompt-selection.tsx
- Updated to check both data structures when reading:
  - `localData.project?.brandName || localData.brandName`
  - `localData.project?.website || localData.website`
  - etc.
- Updated dependencies in useEffect to watch both paths

## Result
- Data is now properly synchronized between both storage formats
- Components using either format can access the data
- The onboarding flow works correctly without data loss

## Future Recommendation
Complete the migration to the NEW structure across all onboarding components to eliminate the need for dual writes.