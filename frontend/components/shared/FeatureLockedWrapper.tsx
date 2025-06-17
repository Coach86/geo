"use client";

import { ReactNode } from "react";
import { FeatureBlurOverlay } from "./FeatureBlurOverlay";

interface FeatureLockedWrapperProps {
  isLocked: boolean;
  featureName: string;
  description?: string;
  children: ReactNode;
}

export function FeatureLockedWrapper({ 
  isLocked, 
  featureName, 
  description, 
  children 
}: FeatureLockedWrapperProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="pointer-events-none select-none opacity-60 blur-[2px]">
        {children}
      </div>
      <FeatureBlurOverlay 
        featureName={featureName} 
        description={description} 
      />
    </div>
  );
}