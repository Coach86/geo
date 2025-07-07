# Issue Architecture

This document describes the new architecture for defining issues in AEO rules.

## Overview

Each rule now has:
1. A corresponding `.issues.ts` file that defines all possible issues with unique IDs
2. An enum of issue IDs for type safety
3. A helper function to create issues with optional custom descriptions

## Implementation Pattern

### 1. Issue Definition File

Create a file next to the rule file (e.g., `main-heading.issues.ts`):

```typescript
import { RuleIssue } from '../../../interfaces/rule.interface';

export enum MainHeadingIssueId {
  NO_H1_TAG = 'main-heading-no-h1',
  MULTIPLE_H1_TAGS = 'main-heading-multiple-h1',
  // ... more issue IDs
}

export const MAIN_HEADING_ISSUES: Record<MainHeadingIssueId, Omit<RuleIssue, 'affectedElements'>> = {
  [MainHeadingIssueId.NO_H1_TAG]: {
    severity: 'critical',
    description: 'No H1 tag found on the page',
    recommendation: 'Add exactly one H1 tag with descriptive text (3-10 words)',
  },
  // ... more issue definitions
};

export function createMainHeadingIssue(
  issueId: MainHeadingIssueId,
  affectedElements?: string[],
  customDescription?: string
): RuleIssue {
  const baseIssue = MAIN_HEADING_ISSUES[issueId];
  
  return {
    id: issueId,
    severity: baseIssue.severity,
    description: customDescription || baseIssue.description,
    recommendation: baseIssue.recommendation,
    affectedElements,
  };
}
```

### 2. Update Rule File

Import and use the issue definitions:

```typescript
import { MainHeadingIssueId, createMainHeadingIssue } from './main-heading.issues';

// In the evaluate method:
const issues: RuleIssue[] = [];

if (h1Count === 0) {
  issues.push(createMainHeadingIssue(MainHeadingIssueId.NO_H1_TAG));
} else if (h1Count > 1) {
  issues.push(createMainHeadingIssue(
    MainHeadingIssueId.MULTIPLE_H1_TAGS,
    h1Texts.slice(0, 3), // Show first 3 H1s as affected elements
    `Multiple H1 tags found (${h1Count} total)` // Custom description
  ));
}
```

## Benefits

1. **Type Safety**: Issue IDs are typed enums, preventing typos
2. **Centralized Management**: All issues for a rule are in one place
3. **Unique IDs**: Each issue has a globally unique ID for tracking
4. **Flexibility**: Can provide custom descriptions while maintaining standard recommendations
5. **IDE Support**: Better autocomplete and refactoring capabilities

## Completed Rules

The following rules have been migrated to the new architecture:
- main-heading.rule.ts → main-heading.issues.ts (7 issue types)
- structured-data.rule.ts → structured-data.issues.ts (5 issue types)
- subheadings.rule.ts → subheadings.issues.ts (7 issue types)
- image-alt.rule.ts → image-alt.issues.ts (7 issue types)
- url-structure.rule.ts → url-structure.issues.ts (15 issue types)
- meta-description.rule.ts → meta-description.issues.ts (7 issue types)
- clean-html-structure.rule.ts → clean-html-structure.issues.ts (9 issue types)
- content-freshness.rule.ts → content-freshness.issues.ts (6 issue types)
- concise-answers.rule.ts → concise-answers.issues.ts (9 issue types)
- comparison-content.rule.ts → comparison-content.issues.ts (10 issue types)
- in-depth-guides.rule.ts → in-depth-guides.issues.ts (12 issue types)
- citing-sources.rule.ts → citing-sources.issues.ts (10 issue types)

Total: 104 unique issue types defined across 12 rules

## Status

All page-level rules (isDomainLevel: false) have been migrated to the new issue architecture. The domain-level rules (isDomainLevel: true) like https-security, mobile-optimization, robots-txt, status-code, xml-sitemap, and llms-txt do not need migration as they apply at the domain level rather than individual pages.