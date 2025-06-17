import React from "react";
import { cn } from "@/lib/utils";

interface SvgLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};

export function SvgLoader({ className, size = "md" }: SvgLoaderProps) {
  return (
    <div className={cn(sizeClasses[size], "relative", className)}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="190 175 120 120"
        className="w-full h-full"
      >
        {/* Top orange shape with morphing animation */}
        <path fill="#FC7832" fillOpacity="0.96">
          <animate 
            attributeName="d" 
            values="M 236.00 247.00 C 238.33 246.90 240.67 247.12 243.00 247.00 C 260.28 246.14 262.28 231.20 266.01 219.01 C 269.74 206.82 269.40 187.72 255.00 186.00 C 240.60 184.28 220.34 182.20 209.75 190.75 C 199.17 199.31 203.40 221.70 204.23 234.77 C 205.06 247.84 228.48 247.31 236.00 247.00 Z;
                    M 236.00 247.00 C 238.33 246.90 240.67 247.12 243.00 247.00 C 265.28 246.14 267.28 226.20 271.01 214.01 C 274.74 201.82 274.40 182.72 255.00 181.00 C 235.60 179.28 215.34 177.20 204.75 185.75 C 194.17 194.31 198.40 216.70 199.23 229.77 C 200.06 242.84 228.48 247.31 236.00 247.00 Z;
                    M 236.00 247.00 C 238.33 246.90 240.67 247.12 243.00 247.00 C 260.28 246.14 262.28 231.20 266.01 219.01 C 269.74 206.82 269.40 187.72 255.00 186.00 C 240.60 184.28 220.34 182.20 209.75 190.75 C 199.17 199.31 203.40 221.70 204.23 234.77 C 205.06 247.84 228.48 247.31 236.00 247.00 Z"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate 
            attributeName="fill-opacity" 
            values="0.96;0.8;0.96" 
            dur="2s" 
            repeatCount="indefinite"
          />
        </path>
        
        {/* Right blue shape with morphing animation */}
        <path fill="#1D7CC3" fillOpacity="0.95">
          <animate 
            attributeName="d" 
            values="M 290.00 205.00 C 274.95 200.43 273.02 215.82 270.78 225.78 C 268.53 235.74 266.15 247.15 262.98 256.98 C 259.80 266.81 258.96 279.58 269.26 283.74 C 279.55 287.90 291.30 284.28 295.68 274.68 C 300.06 265.08 296.42 246.50 297.00 237.00 C 297.58 227.50 300.53 208.20 290.00 205.00 Z;
                    M 295.00 200.00 C 279.95 195.43 278.02 210.82 275.78 220.78 C 273.53 230.74 271.15 242.15 267.98 251.98 C 264.80 261.81 263.96 274.58 274.26 278.74 C 284.55 282.90 296.30 279.28 300.68 269.68 C 305.06 260.08 301.42 241.50 302.00 232.00 C 302.58 222.50 305.53 203.20 295.00 200.00 Z;
                    M 290.00 205.00 C 274.95 200.43 273.02 215.82 270.78 225.78 C 268.53 235.74 266.15 247.15 262.98 256.98 C 259.80 266.81 258.96 279.58 269.26 283.74 C 279.55 287.90 291.30 284.28 295.68 274.68 C 300.06 265.08 296.42 246.50 297.00 237.00 C 297.58 227.50 300.53 208.20 290.00 205.00 Z"
            dur="2.5s"
            repeatCount="indefinite"
            begin="0.3s"
          />
          <animate 
            attributeName="fill-opacity" 
            values="0.95;0.75;0.95" 
            dur="2.5s" 
            repeatCount="indefinite"
            begin="0.3s"
          />
        </path>
        
        {/* Bottom teal shape with morphing animation */}
        <path fill="#17AC9C" fillOpacity="0.93">
          <animate 
            attributeName="d" 
            values="M 214.00 253.00 C 203.45 255.78 200.14 272.07 208.25 279.75 C 216.36 287.43 231.34 285.60 241.30 283.30 C 251.27 281.01 256.28 262.55 248.25 256.75 C 240.21 250.96 222.54 250.75 214.00 253.00 Z;
                    M 209.00 258.00 C 198.45 260.78 195.14 277.07 203.25 284.75 C 211.36 292.43 226.34 290.60 236.30 288.30 C 246.27 286.01 251.28 267.55 243.25 261.75 C 235.21 255.96 217.54 255.75 209.00 258.00 Z;
                    M 214.00 253.00 C 203.45 255.78 200.14 272.07 208.25 279.75 C 216.36 287.43 231.34 285.60 241.30 283.30 C 251.27 281.01 256.28 262.55 248.25 256.75 C 240.21 250.96 222.54 250.75 214.00 253.00 Z"
            dur="2.2s"
            repeatCount="indefinite"
            begin="0.6s"
          />
          <animate 
            attributeName="fill-opacity" 
            values="0.93;0.7;0.93" 
            dur="2.2s" 
            repeatCount="indefinite"
            begin="0.6s"
          />
        </path>
      </svg>
    </div>
  );
}

// Alternative modern loader with morphing shapes
export function ModernSvgLoader({ className, size = "md" }: SvgLoaderProps) {
  return (
    <div className={cn(sizeClasses[size], "relative", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 animate-spin"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="60"
          strokeDashoffset="0"
          strokeLinecap="round"
          className="opacity-20"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="url(#modern-gradient)"
          strokeWidth="2"
          strokeDasharray="60"
          strokeDashoffset="45"
          strokeLinecap="round"
          className="animate-[spin_1.5s_ease-in-out_infinite]"
        />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 animate-pulse"
      >
        <circle
          cx="12"
          cy="12"
          r="6"
          fill="url(#center-gradient)"
          className="opacity-50"
        />
      </svg>
      <defs>
        <linearGradient id="modern-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="25%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="75%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <radialGradient id="center-gradient">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
      </defs>
    </div>
  );
}

// Dots loader animation
export function DotsLoader({ className, size = "md" }: SvgLoaderProps) {
  const dotSize = size === "sm" ? 3 : size === "md" ? 4 : size === "lg" ? 5 : 6;
  
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn(
            "rounded-full bg-gradient-to-r from-purple-500 to-blue-500",
            `w-${dotSize} h-${dotSize}`,
            "animate-bounce"
          )}
          style={{
            animationDelay: `${index * 0.15}s`,
            animationDuration: "0.6s",
          }}
        />
      ))}
    </div>
  );
}

// Pulse rings loader
export function PulseLoader({ className, size = "md" }: SvgLoaderProps) {
  return (
    <div className={cn(sizeClasses[size], "relative", className)}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-ping opacity-75" />
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-ping animation-delay-200 opacity-50" />
      <div className="relative rounded-full bg-gradient-to-r from-purple-500 to-blue-500 w-full h-full" />
    </div>
  );
}

// Export the default loader
export { SvgLoader as Loader };