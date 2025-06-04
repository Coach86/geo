export type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

export type SidebarVariant = "sidebar" | "floating" | "inset"
export type SidebarSide = "left" | "right"
export type SidebarCollapsible = "offcanvas" | "icon" | "none"