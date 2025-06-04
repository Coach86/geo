"use client";

import { ModelIcon } from "@/components/ui/model-icon";
import { cn } from "@/lib/utils";

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
  const content = (
    <>
      {showIcon && iconFirst && <ModelIcon model={model} size={size} />}
      <span>{model}</span>
      {showIcon && !iconFirst && <ModelIcon model={model} size={size} />}
    </>
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {content}
    </div>
  );
}