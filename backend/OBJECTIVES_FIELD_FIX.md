# Objectives Field Update Fix

## Problem
The PATCH endpoint at `/api/user/project/:projectId` was not handling the `objectives` field even though it was defined in the `UpdateProjectDto`.

## Root Cause
In the `user-project.controller.ts` file, the `updateProject` method:
1. Did not include `objectives` in the `@Body()` parameter type definition
2. Did not include `objectives` in the `@ApiBody` schema
3. Did not handle `objectives` in the `updateData` object

## Solution
Updated the `updateProject` method in `/Users/emmanuelcosta/Projects/geo/backend/src/modules/project/controllers/user-project.controller.ts`:

1. Added `objectives` to the `@ApiBody` schema (line 639)
2. Added `objectives?: string` to the `@Body()` parameter type (line 653)
3. Added handling for `objectives` in the `updateData` object (lines 700-702)

## Verification
- The `objectives` field was already defined in `UpdateProjectDto`
- The `objectives` field was already defined in the project schema
- The `objectives` field was already being mapped in the response
- The project builds successfully with these changes

## Updated Code
The method now properly handles all fields defined in the `UpdateProjectDto`:
- name
- keyBrandAttributes
- competitors
- objectives (newly added)
- market (not currently handled in this endpoint)