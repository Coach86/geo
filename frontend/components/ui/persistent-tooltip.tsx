"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>
>(({ children, ...props }, ref) => {
  const [isLocked, setIsLocked] = React.useState(false)
  const [isHovered, setIsHovered] = React.useState(false)
  
  // Create a context to pass state down to trigger
  const contextValue = React.useMemo(() => ({
    isLocked,
    setIsLocked,
    setIsHovered
  }), [isLocked])

  React.useEffect(() => {
    if (isLocked) {
      const handleClickOutside = () => {
        setIsLocked(false)
      }
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isLocked])

  return (
    <TooltipPrimitive.Root
      {...props}
      open={isLocked || isHovered}
      onOpenChange={() => {}}
      delayDuration={0}
    >
      <TooltipContext.Provider value={contextValue}>
        {children}
      </TooltipContext.Provider>
    </TooltipPrimitive.Root>
  )
})
Tooltip.displayName = "Tooltip"

// Create context for passing state
const TooltipContext = React.createContext<{
  isLocked: boolean
  setIsLocked: (locked: boolean) => void
  setIsHovered: (hovered: boolean) => void
}>({
  isLocked: false,
  setIsLocked: () => {},
  setIsHovered: () => {}
})

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ onClick, onMouseEnter, onMouseLeave, ...props }, ref) => {
  const { isLocked, setIsLocked, setIsHovered } = React.useContext(TooltipContext)
  
  return (
    <TooltipPrimitive.Trigger
      ref={ref}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsLocked(!isLocked)
        onClick?.(e)
      }}
      onMouseEnter={(e) => {
        if (!isLocked) {
          setIsHovered(true)
        }
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        if (!isLocked) {
          setIsHovered(false)
        }
        onMouseLeave?.(e)
      }}
      {...props}
    />
  )
})
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, onClick, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    onClick={(e) => {
      e.stopPropagation()
      onClick?.(e)
    }}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-white px-3 py-1.5 text-xs text-gray-900 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }