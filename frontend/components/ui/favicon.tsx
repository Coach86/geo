"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

interface FaviconProps {
  src?: string;
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}

export function Favicon({ 
  src, 
  alt = "Website favicon", 
  className = "w-5 h-5",
  fallbackClassName = "w-5 h-5 text-gray-600"
}: FaviconProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <Building2 className={fallbackClassName} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={20}
      height={20}
      className={className}
      onError={() => setError(true)}
      unoptimized // Allow external images
    />
  );
}