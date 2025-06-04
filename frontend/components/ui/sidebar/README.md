# Sidebar Component Structure

This directory contains the modularized sidebar component system, split into smaller, more maintainable files.

## File Organization

- **types.ts** (12 lines) - Type definitions for sidebar context and variants
- **constants.ts** (5 lines) - Constant values like widths, cookie names, and keyboard shortcuts
- **context.tsx** (132 lines) - SidebarProvider component and useSidebar hook
- **sidebar.tsx** (110 lines) - Main Sidebar component with mobile and desktop variants
- **layout.tsx** (104 lines) - Layout components (Header, Footer, Content, Inset, Input, Separator)
- **navigation.tsx** (76 lines) - Group components (Group, GroupLabel, GroupAction, GroupContent)
- **menu-components.tsx** (262 lines) - Menu components (Menu, MenuItem, MenuButton, MenuAction, etc.)
- **utilities.tsx** (61 lines) - Utility components (Trigger, Rail)
- **index.ts** (29 lines) - Central export file

## Usage

Import components from the parent sidebar.tsx file which re-exports everything:

```tsx
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton 
} from "@/components/ui/sidebar"
```

## Component Categories

### Context & Provider
- `SidebarProvider` - Provides sidebar state and context
- `useSidebar` - Hook to access sidebar state

### Main Component
- `Sidebar` - Main sidebar container with variants

### Layout Components
- `SidebarHeader` - Header section
- `SidebarFooter` - Footer section
- `SidebarContent` - Scrollable content area
- `SidebarInset` - Main content area next to sidebar
- `SidebarInput` - Input field styled for sidebar
- `SidebarSeparator` - Visual separator

### Navigation Components
- `SidebarGroup` - Group container
- `SidebarGroupLabel` - Group label
- `SidebarGroupAction` - Group action button
- `SidebarGroupContent` - Group content wrapper

### Menu Components
- `SidebarMenu` - Menu list container
- `SidebarMenuItem` - Individual menu item
- `SidebarMenuButton` - Clickable menu button
- `SidebarMenuAction` - Menu item action button
- `SidebarMenuBadge` - Badge for menu items
- `SidebarMenuSkeleton` - Loading skeleton
- `SidebarMenuSub` - Submenu container
- `SidebarMenuSubItem` - Submenu item
- `SidebarMenuSubButton` - Submenu button

### Utility Components
- `SidebarTrigger` - Toggle button for sidebar
- `SidebarRail` - Draggable rail for resizing