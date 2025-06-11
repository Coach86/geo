# Onboarding Flow Refactoring Plan

## Core Principle
- Each step manages its own local React state
- Data is saved to localStorage ONLY when the user clicks "Next"
- No auto-saving, no complex synchronization
- The final API call reads from localStorage

## Current Issues
1. **Complex State Management**: Components are updating localStorage on every change
2. **Event Listeners**: Using window events for synchronization adds complexity
3. **Inconsistent Patterns**: Different components handle state differently
4. **Tight Coupling**: Components are tightly coupled to localStorage

## Refactoring Steps

### Phase 1: Update Each Step Component

#### 1. Project Info Component (`/components/onboarding/project-info/index.tsx`)
**Current State**: Updates localStorage on every change
**Changes Needed**:
- Remove all `updateOnboardingData` calls from onChange handlers
- Use local React state for all form fields
- Pass data to parent only on navigation
- Remove event listeners

#### 2. Brand Identity Component (`/components/onboarding/brand-identity.tsx`)
**Current State**: Updates localStorage immediately when adding/removing items
**Changes Needed**:
- Convert to use local state for attributes and competitors
- Remove all `updateOnboardingData` calls from handlers
- Pass complete state to parent on navigation

#### 3. Prompt Selection Component (`/components/onboarding/prompt-selection.tsx`)
**Current State**: Updates localStorage when toggling prompts
**Changes Needed**:
- Use local state for prompt selections
- Remove `updateOnboardingData` from toggle handlers
- Pass selections to parent on navigation

#### 4. Phone Verification Component (`/components/onboarding/phone-verification.tsx`)
**Current State**: Updates localStorage and makes API call
**Changes Needed**:
- Use local state for phone data
- Keep the API call for phone update
- Pass data to parent on navigation

### Phase 2: Update Navigation Logic

#### Onboarding Layout (`/app/onboarding/layout.tsx`)
**Changes Needed**:
1. Create a callback system for collecting data from steps
2. Save to localStorage only in the `handleNext` function
3. Pass initial data from localStorage to steps when loading

### Phase 3: Update Data Flow

#### New Data Flow:
1. **On Step Load**: Read from localStorage and pass as props to step component
2. **During Step**: Component manages its own local state
3. **On Next Click**: 
   - Step component passes its state to parent
   - Parent saves to localStorage
   - Navigation proceeds
4. **On Final Submit**: Read all data from localStorage for API call

### Phase 4: Remove Unnecessary Code

1. Remove all event listeners (`onboarding-data-updated`)
2. Remove `updateOnboardingData` calls from within components
3. Simplify `useFormPersistence` hook or remove if not needed
4. Remove real-time synchronization logic

## Implementation Order

1. Start with the simplest component (Phone Verification)
2. Then Brand Identity
3. Then Prompt Selection
4. Finally Project Info (most complex)
5. Update navigation logic in layout
6. Test end-to-end flow
7. Clean up unused code

## Benefits

1. **Simpler Mental Model**: Clear when data is saved
2. **Better Performance**: No constant localStorage writes
3. **Easier Debugging**: State is local to each component
4. **Predictable Behavior**: Users control when data is saved
5. **Reduced Complexity**: No event systems or synchronization

## Testing Strategy

1. Test each step independently with local state
2. Test navigation saves data correctly
3. Test loading existing data from localStorage
4. Test final API submission
5. Test error scenarios (network failures, validation)