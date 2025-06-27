# Authorization Fix for Brand Reports

## Problem
The BrandReportController was not validating that users could only access reports from their own organization. Any authenticated user could access any report by its ID, regardless of which organization owned the report.

## Solution
Added organization-based authorization to the BrandReportService:

### 1. Service Layer Changes
- Added `validateProjectAccess` method to check if a user's organization matches the project's organization
- Added `validateReportAccess` method to validate report access through project ownership
- Updated all public methods to accept an optional `userId` parameter
- When userId is provided, validation is performed before returning data

### 2. Controller Layer Changes
- Updated all endpoints to extract userId from the request
- Pass userId to service methods for authorization

### 3. Design Decisions
- Made userId optional in service methods to maintain backward compatibility with admin endpoints
- Admin endpoints don't pass userId, so they bypass authorization checks
- User endpoints must pass userId for proper authorization

## Affected Endpoints
All `/brand-reports/*` endpoints now validate organization access:
- `GET /brand-reports/project/:projectId` - List reports for a project
- `GET /brand-reports/:reportId` - Get specific report
- `GET /brand-reports/:reportId/explorer` - Get explorer data
- `GET /brand-reports/:reportId/visibility` - Get visibility data
- `GET /brand-reports/:reportId/sentiment` - Get sentiment data
- `GET /brand-reports/:reportId/alignment` - Get alignment data
- `GET /brand-reports/:reportId/competition` - Get competition data
- `GET /brand-reports/project/:projectId/*/aggregated` - All aggregated data endpoints

## Testing
Use the `test-report-authorization.js` script to verify the authorization is working correctly:

```bash
# Set up test data first, then run:
USER1_TOKEN=token1 USER2_TOKEN=token2 USER1_REPORT_ID=report1 USER2_REPORT_ID=report2 USER1_PROJECT_ID=proj1 USER2_PROJECT_ID=proj2 node test-report-authorization.js
```

## Security Impact
This fix ensures that:
- Users can only access reports from projects within their organization
- Cross-organization data access is prevented
- Admin endpoints remain unrestricted for administrative tasks