# Free Plan Batch Analysis Implementation

## Overview
This implementation automatically triggers a visibility-only batch analysis for free plan users in two scenarios:

1. **When selecting Free plan from pricing page** (if user already has projects)
2. **When completing onboarding** (after creating a new project)

## Changes Made

### 1. Pricing Page (`/frontend/components/pricing/pricing-page.tsx`)
- Added logic to check if user has existing projects when selecting free plan
- If projects exist, triggers `runManualAnalysis` for the first project
- Shows success toast and redirects to dashboard
- If no projects, redirects to onboarding as before

```typescript
// Handle free plan
if (planName.toLowerCase() === "free") {
  // Check if user already has projects
  const projects = await getUserProjects(user.token!);
  
  if (projects && projects.length > 0) {
    // Trigger batch analysis for first project
    await runManualAnalysis(firstProject.id, user.token!);
    // Show success message and redirect
  } else {
    // No projects yet, redirect to onboarding
    router.push("/onboarding");
  }
}
```

### 2. Onboarding Submission (`/frontend/components/onboarding/confirmation/useSubmission.ts`)
- Added logic to check user's plan after creating a project
- If user has free plan, automatically triggers visibility analysis
- Analysis runs in background - doesn't block onboarding completion

```typescript
// After creating project, check if user has free plan
const org = await getMyOrganization(token);
const userPlan = plans.find(plan => plan.id === org.stripePlanId);
const isFreePlan = userPlan?.metadata?.isFree === true || 
                  userPlan?.name.toLowerCase() === 'free';

if (isFreePlan) {
  await runManualAnalysis(identityCard.id, token);
}
```

## How It Works

### Free Plan Detection
The system identifies free plans by checking:
- `metadata.isFree === true`
- Plan name is "free" (case-insensitive)
- No Stripe product ID (`stripeProductId === null` or empty)

### Batch Analysis
- Uses the existing `runManualAnalysis` API endpoint
- Backend automatically detects free plan and runs visibility-only pipeline
- Skips sentiment, alignment, and competition analysis for free users

### Error Handling
- Analysis failures don't block the user flow
- Errors are logged but user continues to dashboard/home
- Toast notifications inform users of success/failure

## Testing

1. **Test Free Plan Selection**:
   - Log in as existing user with projects
   - Go to /pricing
   - Select "Start Free" 
   - Should trigger analysis and redirect to dashboard

2. **Test Onboarding Flow**:
   - Sign up as new user with free plan
   - Complete onboarding and create project
   - Analysis should trigger automatically after project creation

3. **Verify Backend Behavior**:
   - Check that only visibility pipeline runs for free users
   - Confirm other pipelines are skipped
   - Verify batch execution records in database