"use client";

import { ModelIcon } from "@/components/ui/model-icon";
import { cn } from "@/lib/utils";
import { getModelFriendlyName } from "@/utils/model-utils";

interface ModelDisplayProps {
  model: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
  iconFirst?: boolean;
}

export function ModelDisplay({ 
  model, 
  size = "xs", 
  className,
  showIcon = true,
  iconFirst = true
}: ModelDisplayProps) {
  const friendlyName = getModelFriendlyName(model);
  
  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };
  
  const content = (
    <>
      {showIcon && iconFirst && <ModelIcon model={model} size={size} />}
      <span className={textSizeClasses[size]}>{friendlyName}</span>
      {showIcon && !iconFirst && <ModelIcon model={model} size={size} />}
    </>
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {content}
    </div>
  );
}