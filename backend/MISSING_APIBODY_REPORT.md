# Missing @ApiBody() Decorators Report

This report lists all controller methods that have `@Body()` parameters but are missing `@ApiBody()` decorators for proper Swagger documentation.

## Summary
- **Total Controllers Checked**: 27
- **Methods with Missing @ApiBody()**: 12
- **Controllers Affected**: 8

## Detailed Findings

### 1. OrganizationController (`./src/modules/organization/controllers/organization.controller.ts`)

#### Method: `create` (Line 33)
- **DTO**: `CreateOrganizationDto`
- **Fix**: Add `@ApiBody({ type: CreateOrganizationDto })`

#### Method: `updatePlanSettings` (Line 91)
- **DTO**: Inline object with `maxProjects?: number`, `maxAIModels?: number`
- **Fix**: Create a DTO or use `@ApiBody({ schema: { properties: { maxProjects: { type: 'number' }, maxAIModels: { type: 'number' } } } })`

#### Method: `updateSelectedModels` (Line 112)
- **DTO**: Inline object with `selectedModels: string[]`
- **Fix**: Create a DTO or use `@ApiBody({ schema: { properties: { selectedModels: { type: 'array', items: { type: 'string' } } } } })`

### 2. UserOrganizationController (`./src/modules/organization/controllers/user-organization.controller.ts`)

#### Method: `updateUser` (Line 201)
- **DTO**: Inline object with `language?: string`
- **Fix**: Create a DTO or use `@ApiBody({ schema: { properties: { language: { type: 'string', required: false } } } })`

### 3. LlmController (`./src/modules/llm/controllers/llm.controller.ts`)

#### Method: `testDirectly` (Line 40)
- **DTO**: `DirectTestDto`
- **Fix**: Add `@ApiBody({ type: DirectTestDto })`

### 4. PublicPlanController (`./src/modules/plan/controllers/public-plan.controller.ts`)

#### Method: `createCheckout` (Line 34)
- **DTO**: Inline object with `userId: string`, `billingPeriod: 'monthly' | 'yearly'`
- **Fix**: Create a DTO or use appropriate schema

### 5. PlanController (`./src/modules/plan/controllers/plan.controller.ts`)

#### Method: `create` (Line 26)
- **DTO**: `CreatePlanDto`
- **Fix**: Add `@ApiBody({ type: CreatePlanDto })`

#### Method: `createCheckoutSession` (Line 41)
- **DTO**: Inline object with `userId: string`, `billingPeriod: 'monthly' | 'yearly'`
- **Fix**: Create a DTO or use appropriate schema

#### Method: `update` (Line 54)
- **DTO**: `UpdatePlanDto`
- **Fix**: Add `@ApiBody({ type: UpdatePlanDto })`

### 6. UserController (`./src/modules/user/controllers/user.controller.ts`)

#### Method: `create` (Line 37)
- **DTO**: `CreateUserDto`
- **Fix**: Add `@ApiBody({ type: CreateUserDto })`

### 7. PromptSetController (`./src/modules/prompt/controllers/prompt-set.controller.ts`)

#### Method: `updatePromptSet` (Line 50)
- **DTO**: `UpdatePromptSetDto`
- **Fix**: Add `@ApiBody({ type: UpdatePromptSetDto })`

### 8. BatchController (`./src/modules/batch/controllers/batch.controller.ts`)

#### Method: `runBatch` (Line 44)
- **DTO**: `BatchRunDto`
- **Fix**: Add `@ApiBody({ type: BatchRunDto })`

## Recommendations

1. **For methods using defined DTOs**: Simply add the `@ApiBody({ type: DtoClassName })` decorator before the method.

2. **For methods using inline objects**: Consider creating proper DTOs for better type safety and documentation, or use inline schema definitions.

3. **Import Statement**: Ensure `ApiBody` is imported from `@nestjs/swagger` in each controller file.

## Next Steps

1. Add missing `@ApiBody()` decorators to all identified methods
2. Create DTOs for inline object parameters where appropriate
3. Run the application and verify Swagger documentation is properly generated
4. Consider adding a linter rule to catch missing `@ApiBody()` decorators in the future