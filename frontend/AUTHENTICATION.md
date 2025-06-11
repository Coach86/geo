# Frontend Authentication & Authorization Pattern

## Overview

Our frontend implements a comprehensive authentication and authorization system using Next.js App Router's route groups for automatic protection of pages.

## Business Rules

1. **No Authentication** → Redirect to `/auth/login`
2. **No Payment (stripePlanId)** → Redirect to `/pricing`
3. **No Projects** → Redirect to `/onboarding`
4. **Has Payment + Projects** → Allow access to protected pages

## Implementation

### 1. Route Group Structure

```
app/
├── (protected)/          # All protected pages (auto-wrapped with auth checks)
│   ├── layout.tsx       # Handles auth checks + DashboardLayout
│   ├── page.tsx         # Main dashboard
│   ├── settings/
│   ├── competition/
│   ├── sentiment/
│   └── ... other protected pages
├── auth/                # Public auth pages
├── pricing/             # Requires auth but NO payment
├── onboarding/          # Requires auth + payment but NO projects
└── page.tsx            # Root redirect logic
```

### 2. Automatic Protection

All pages inside `app/(protected)/` are automatically:
- Checked for authentication
- Checked for payment status
- Checked for project count
- Wrapped with DashboardLayout
- Redirected if any requirements are not met

### 3. Protected Layout

```typescript
// app/(protected)/layout.tsx
export default function ProtectedLayout({ children }) {
  const { authState, isLoading } = useAuthGuard({
    requirePayment: true,
    requireProjects: true,
  });

  if (isLoading) return <LoadingState />;
  if (authState === "authenticated") {
    return <DashboardLayout>{children}</DashboardLayout>;
  }
  return null; // While redirecting
}
```

## How to Add a New Protected Page

Simply create your page inside the `app/(protected)/` directory:

```typescript
// app/(protected)/new-feature/page.tsx
export default function NewFeaturePage() {
  return (
    <div>
      {/* Your page content - no need for wrappers! */}
    </div>
  );
}
```

That's it! The page is automatically:
- Protected with auth checks
- Wrapped in DashboardLayout
- Subject to payment and project requirements

## Special Pages

### Pricing Page (`/pricing`)
- Uses `usePricingGuard()` hook
- Only accessible when user has NO payment plan
- Auto-redirects to dashboard if already paying

### Onboarding Page (`/onboarding`)
- Uses `useOnboardingGuard()` hook
- Only accessible when user has payment but NO projects
- Auto-redirects based on status

## Auth States

The `useAuthGuard` hook returns these states:
- `"loading"` - Checking authentication
- `"unauthenticated"` - No token, redirecting to login
- `"no-payment"` - No stripePlanId, redirecting to pricing
- `"no-projects"` - Has payment but no projects, redirecting to onboarding
- `"authenticated"` - All checks passed, user can access

## Benefits

1. **Centralized Logic**: All auth rules in one place
2. **Consistent UX**: Same loading states and redirects everywhere
3. **Easy to Update**: Change business rules in one location
4. **Type-Safe**: TypeScript ensures proper usage
5. **Performance**: Organization data is fetched once and cached

## Examples of Protected Pages

- `/settings` - User settings
- `/battle` - Brand battle analysis
- `/sentiment` - Sentiment analysis
- `/compliance` - Compliance reports
- `/recommendations` - AI recommendations
- All other dashboard pages

## Non-Protected Pages

- `/auth/login` - Login page
- `/auth/verify` - Email verification
- `/pricing` - Pricing page (has its own guard)
- `/onboarding` - Onboarding flow (has its own guard)
- `/report-access` - Public report access