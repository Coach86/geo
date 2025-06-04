// Re-export all sidebar components from the modular structure
export {
  // Context and hooks
  SidebarProvider,
  useSidebar,
  // Main sidebar component
  Sidebar,
  // Layout components
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarSeparator,
  // Navigation components
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  sidebarMenuButtonVariants,
  // Utility components
  SidebarRail,
  SidebarTrigger,
} from "./sidebar/index"

// Re-export types
export type { 
  SidebarContext, 
  SidebarVariant, 
  SidebarSide, 
  SidebarCollapsible 
} from "./sidebar/types"