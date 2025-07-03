"use client";

import { RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/persistent-tooltip";

interface BatchStatusIndicatorProps {
  isProcessing: boolean;
  className?: string;
}

export function BatchStatusIndicator({ isProcessing, className = "" }: BatchStatusIndicatorProps) {
  if (!isProcessing) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 ${className}`}>
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">A new analysis is in progress</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}