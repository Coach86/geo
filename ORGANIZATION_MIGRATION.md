# Organization Migration Guide

This document describes the architectural changes to introduce Organizations as a parent entity for users, projects, and other resources.

## Overview

The system has been restructured to support multi-user organizations:
- Organizations own plan settings, stripe information, and AI model selections
- Users belong to organizations
- Projects belong to organizations (and maintain userId for tracking who created them)
- Reports and batch results belong to organizations

## Key Changes

### 1. New Organization Entity

**Schema**: `/backend/src/modules/organization/schemas/organization.schema.ts`
```typescript
{
  id: string;
  name: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
    maxSpontaneousPrompts: number;
    maxUrls: number;
    maxUsers: number; // New: -1 for unlimited
  };
  selectedModels: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Updated User Entity

**Schema**: `/backend/src/modules/user/schemas/user.schema.ts`
- Removed: `stripeCustomerId`, `stripePlanId`, `planSettings`, `selectedModels`
- Added: `organizationId` (required)

### 3. Updated Project Entity

**Schema**: `/backend/src/modules/project/schemas/project-base.schema.ts`
- Added: `organizationId` (required)
- Kept: `userId` (to track who created the project)

### 4. New Organization API Endpoints

#### Admin Endpoints (JWT protected)
- `GET /api/admin/organizations` - List all organizations
- `POST /api/admin/organizations` - Create organization
- `GET /api/admin/organizations/:id` - Get organization details
- `PATCH /api/admin/organizations/:id` - Update organization
- `PATCH /api/admin/organizations/:id/plan-settings` - Update plan settings
- `DELETE /api/admin/organizations/:id` - Delete organization

#### User Endpoints (Token/JWT protected)
- `GET /api/user/organization` - Get current user's organization
- `GET /api/user/organization/users` - List organization users
- `POST /api/user/organization/users` - Add user to organization
- `PATCH /api/user/organization/users/:userId` - Update user
- `DELETE /api/user/organization/users/:userId` - Remove user
- `GET /api/user/organization/models` - Get selected models

### 5. Frontend Changes

#### New Organization Settings Page
- `/frontend/app/settings/page.tsx` - Complete redesign with:
  - Organization information display
  - User management (add/edit/remove users)
  - Plan limits visualization
  - AI model selection moved to organization level

#### Updated Types
- `UserProfile` interface simplified (removed plan-related fields)
- New `Organization` and `OrganizationUser` interfaces
- Plan interface includes `maxUsers`

## Migration Steps

1. **Run the migration script**:
   ```bash
   cd backend
   npm run migrate:organizations
   ```

2. **What the migration does**:
   - Creates an organization for each existing user
   - Moves plan settings from user to organization
   - Updates all projects with organizationId
   - Updates all reports and batch results with organizationId
   - Removes old fields from users

3. **Post-migration tasks**:
   - Update any external integrations that expect user-level plan settings
   - Update Stripe webhooks to target organizations instead of users
   - Consider consolidating users into shared organizations where appropriate

## API Migration Examples

### Before (User-centric)
```javascript
// Get user with plan settings
GET /api/user/profile
{
  id: "123",
  email: "user@example.com",
  planSettings: { maxProjects: 5, ... },
  selectedModels: ["gpt-4", ...]
}
```

### After (Organization-centric)
```javascript
// Get user
GET /api/user/profile
{
  id: "123",
  email: "user@example.com",
  organizationId: "org-456"
}

// Get organization details
GET /api/user/organization
{
  id: "org-456",
  name: "User's Organization",
  planSettings: { maxProjects: 5, maxUsers: 1, ... },
  selectedModels: ["gpt-4", ...],
  currentUsers: 1,
  currentProjects: 3
}
```

## Testing Checklist

- [ ] User can view their organization details
- [ ] User can add new users (within limits)
- [ ] User can edit/remove other users (but not themselves)
- [ ] Plan limits are enforced at organization level
- [ ] Projects are created with organizationId
- [ ] AI model selection works at organization level
- [ ] Existing authentication flows still work
- [ ] Migration script successfully converts existing data

## Rollback Plan

If needed, a reverse migration script can be created to:
1. Move plan settings back to users
2. Remove organizationId from projects/reports
3. Delete organization collection

## Future Enhancements

1. **Organization roles**: Add admin/member roles within organizations
2. **Organization invites**: Email invitation system for adding users
3. **Billing accounts**: Multiple organizations under one billing account
4. **Organization switching**: Allow users to belong to multiple organizations
5. **Audit logs**: Track organization-level changes and activities