# Page Transition Loader Positioning Fix

## Problem Description
The page transition loaders in feature pages (/visibility, /sentiment, /alignment, /competition, /explorer) were appearing at inconsistent positions, causing a "glitchy" effect where the loader would jump several hundred pixels below its intended center position.

## Root Cause Analysis
The issue was caused by inconsistent positioning strategies between:

1. **Global transition provider**: Used `fixed inset-0 z-50` (full viewport)
2. **Page-level transitions**: Used `relative min-h-[400px]` containers with `absolute inset-0 z-10` loaders

This inconsistency caused loaders to appear at different positions depending on:
- Container height variations
- Content length
- Page structure differences

## Solution Implemented

### 1. Enhanced PageTransition Component
**File**: `/frontend/components/shared/PageTransition.tsx`

Added a new `fullScreen` prop to handle two distinct positioning modes:

#### Full Screen Mode (`fullScreen={true}`)
- Used by global provider for page-to-page navigation
- Position: `fixed inset-0 z-50` (covers entire viewport)
- Use case: Global navigation transitions

#### Page-Level Mode (`fullScreen={false}` - default)
- Used by individual feature pages during data loading
- Position: `fixed top-0 bottom-0 left-60 right-0 z-40` (respects dashboard layout)
- Accounts for 240px sidebar width (`left-60` = `w-60`)
- Centers loader in main content area only

### 2. Updated Global Provider
**File**: `/frontend/providers/page-transition-provider.tsx`

Modified to use the new `fullScreen` prop:
```tsx
<PageTransition loading={true} fullScreen={true}>
```

### 3. Layout-Aware Positioning
The page-level loaders now properly account for the dashboard layout:
- **Sidebar width**: 240px (`w-60`)
- **Main content area**: Everything to the right of the sidebar
- **Loader positioning**: `left-60 right-0` ensures loader appears only in content area

## Technical Details

### Before Fix:
```css
/* Inconsistent positioning */
.global-loader { position: fixed; inset: 0; z-index: 50; }
.page-loader { position: absolute; inset: 0; z-index: 10; }
```

### After Fix:
```css
/* Consistent positioning */
.global-loader { position: fixed; inset: 0; z-index: 50; }
.page-loader { position: fixed; top: 0; bottom: 0; left: 240px; right: 0; z-index: 40; }
```

### Dashboard Layout Structure:
```
┌─────────────────────────────────────────┐
│ Fixed Sidebar (240px width)            │
│                                         │
├─────────────────────────────────────────┤ ← Main Content Area
│ Page Loader appears here (centered)    │   (loader: left-60 right-0)
│                                         │
│ Page content with consistent loader     │
│ positioning across all feature pages   │
└─────────────────────────────────────────┘
```

## Benefits

1. **Consistent Positioning**: All page loaders now appear at the same position relative to the viewport
2. **Layout Respect**: Loaders don't overlap the sidebar
3. **Smooth Transitions**: No more "jumping" or glitchy repositioning
4. **Maintainable**: Clear separation between global and page-level transition modes
5. **Responsive**: Properly accounts for the dashboard layout structure

## Affected Pages
- `/visibility` - Visibility metrics and charts
- `/sentiment` - Sentiment analysis data
- `/alignment` - Brand alignment metrics
- `/competition` - Competitor analysis
- `/explorer` - Data exploration interface

## Testing
- ✅ Frontend build successful
- ✅ TypeScript compilation clean
- ✅ No layout shifts during transitions
- ✅ Consistent loader positioning across all feature pages

## Future Considerations
- If mobile responsiveness is added, the `left-60` value should be updated to use responsive classes
- The z-index hierarchy (z-40 for page loaders, z-50 for global) ensures proper layering