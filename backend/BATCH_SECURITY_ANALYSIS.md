# Batch Controllers Security Analysis

## Summary

I've analyzed the batch-related controllers to check if they properly validate organization access. Here are my findings:

## Current Security Issues

### 1. **No Organization Validation in Admin Batch Controllers**

The following controllers under `/admin/batch*` endpoints have **NO organization-based access control**:

#### BatchController (`/admin/batch`)
- `POST /admin/batch/run` - Can run batch for ANY project
- `POST /admin/batch/process/:projectId` - Can process ANY project
- `POST /admin/batch/orchestrate/:projectId` - Can orchestrate ANY project
- `POST /admin/batch/pipeline/visibility/:projectId` - Can run visibility pipeline for ANY project
- `POST /admin/batch/pipeline/sentiment/:projectId` - Can run sentiment pipeline for ANY project
- `POST /admin/batch/pipeline/competition/:projectId` - Can run competition pipeline for ANY project
- `POST /admin/batch/pipeline/alignment/:projectId` - Can run alignment pipeline for ANY project

#### BatchExecutionController (`/admin/batch-executions`)
- `GET /admin/batch-executions/:id` - Can view ANY batch execution
- `GET /admin/batch-executions/:id/raw-responses` - Can view raw responses for ANY batch execution
- `GET /admin/batch-executions?projectId=xxx` - Can view batch executions for ANY project

#### BatchResultController (`/admin/batch-results`)
- `GET /admin/batch-results/execution/:executionId` - Can view results for ANY batch execution
- `GET /admin/batch-results/execution/:executionId/:resultType` - Can view specific result types for ANY batch execution
- `GET /admin/batch-results/project/:projectId/latest` - Can view latest results for ANY project
- `GET /admin/batch-results/:id` - Can view ANY batch result

### 2. **Security Vulnerabilities**

1. **Cross-Organization Data Access**: Any authenticated admin can access batch data from any organization
2. **No userId Validation**: Controllers don't pass userId to services
3. **No Organization Ownership Check**: Services don't validate that the user belongs to the same organization as the project
4. **Direct Database Access**: Services directly query the database without any access control checks

### 3. **Authentication Setup**

- Global JWT authentication is enabled via `APP_GUARD` in `app.module.ts`
- Admin routes are protected by JWT but NOT by organization membership
- The `AdminGuard` only checks if `user.isAdmin === true`, not organization membership

## Recommended Fixes

### 1. **Add Organization Validation to Controllers**

Each controller method should:
1. Extract the authenticated user from the request
2. Pass the userId to the service methods
3. Validate organization membership before allowing access

### 2. **Update Service Methods**

Services should:
1. Accept userId as a parameter
2. Verify the user belongs to the same organization as the requested resource
3. Throw `ForbiddenException` if the user doesn't have access

### 3. **Create Organization-Scoped Guards**

Create a new guard that:
1. Checks if the user is authenticated
2. Verifies the user belongs to the organization that owns the requested resource
3. Can be applied at the controller or method level

## Example Fix for BatchController

```typescript
@Post('process/:projectId')
async processProject(
  @Req() request: any,
  @Param('projectId') projectId: string
) {
  const userId = request.user.id;
  
  // Verify user has access to this project's organization
  const hasAccess = await this.batchService.userHasAccessToProject(userId, projectId);
  if (!hasAccess) {
    throw new ForbiddenException('You do not have access to this project');
  }
  
  // Continue with processing...
}
```

## Risk Assessment

**CRITICAL**: These endpoints allow any admin user to:
- View sensitive batch execution data from any organization
- Trigger expensive batch operations for any project
- Access raw LLM responses containing potentially sensitive information
- View competitive analysis data from other organizations

This is a significant security vulnerability that should be addressed immediately.