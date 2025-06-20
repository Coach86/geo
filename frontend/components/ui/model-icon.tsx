import React from "react";
import { cn } from "@/lib/utils";

// Model to provider mapping
const modelProviderMap: { [key: string]: string } = {
  "ChatGPT": "openai",
  "GPT-4": "openai",
  "GPT-3.5": "openai",
  "OpenAI": "openai",
  "Claude": "anthropic",
  "Claude 2": "anthropic",
  "Claude 3": "anthropic",
  "Claude 3.5": "anthropic",
  "Anthropic": "anthropic",
  "Gemini": "google",
  "Gemini Pro": "google",
  "Gemini 1.5 Pro": "google",
  "Google": "google",
  "Bard": "google",
  "Llama": "meta",
  "Llama 2": "meta",
  "Llama 3": "meta",
  "Meta": "meta",
  "Mistral": "mistral",
  "Mixtral": "mistral",
  "Perplexity": "perplexity",
  "Sonar Pro": "perplexity",
  "sonar-pro": "perplexity",
  "Grok": "xai",
  "DeepSeek": "deepseek",
};

interface ModelIconProps {
  model: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

// Get provider from model name
const getProviderFromModel = (model: string): string => {
  // Check exact match first
  if (modelProviderMap[model]) {
    return modelProviderMap[model];
  }
  
  // Check if model contains any known provider names
  const modelLower = model.toLowerCase();
  
  if (modelLower.includes("gpt") || modelLower.includes("chatgpt")) return "openai";
  if (modelLower.includes("claude")) return "anthropic";
  if (modelLower.includes("gemini") || modelLower.includes("bard")) return "google";
  if (modelLower.includes("llama")) return "meta";
  if (modelLower.includes("mistral") || modelLower.includes("mixtral")) return "mistral";
  if (modelLower.includes("perplexity") || modelLower.includes("sonar")) return "perplexity";
  if (modelLower.includes("grok")) return "xai";
  if (modelLower.includes("deepseek")) return "deepseek";
  
  return "unknown";
};

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

export function ModelIcon({ model, className, size = "sm" }: ModelIconProps) {
  const provider = getProviderFromModel(model);
  const sizeClass = sizeClasses[size];

  switch (provider) {
    case "openai":
      return (
        <svg className={cn(sizeClass, className)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.975 5.975 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
        </svg>
      );
    
    case "anthropic":
      return (
        <svg className={cn(sizeClass, className)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.3 5.2L12 18.5 6.7 5.2h3.2L12 11l2.1-5.8h3.2z"/>
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z"/>
        </svg>
      );
    
    case "google":
      return (
        <svg className={cn(sizeClass, className)} viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      );
    
    case "meta":
      return (
        <svg className={cn(sizeClass, className)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.2 0 2.35-.21 3.41-.6.94-.34 1.79-.86 2.51-1.51.72-.65 1.34-1.44 1.79-2.32.52-1.01.79-2.1.79-3.2 0-.73-.12-1.45-.35-2.12-.21-.62-.51-1.2-.89-1.72l-4.26 4.26-4.26-4.26c-.38.52-.68 1.1-.89 1.72-.23.67-.35 1.39-.35 2.12 0 1.1.27 2.19.79 3.2.45.88 1.07 1.67 1.79 2.32.72.65 1.57 1.17 2.51 1.51 1.06.39 2.21.6 3.41.6 5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
        </svg>
      );
    
    case "mistral":
      return (
        <svg className={cn(sizeClass, className)} viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="4" width="4" height="4"/>
          <rect x="10" y="4" width="4" height="4"/>
          <rect x="16" y="4" width="4" height="4"/>
          <rect x="4" y="10" width="4" height="4"/>
          <rect x="16" y="10" width="4" height="4"/>
          <rect x="4" y="16" width="4" height="4"/>
          <rect x="10" y="16" width="4" height="4"/>
          <rect x="16" y="16" width="4" height="4"/>
        </svg>
      );
    
    case "perplexity":
      return (
        <svg className={cn(sizeClass, className)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          <path d="M12 4.88L17.5 7.5v8.13c0 3.61-2.34 6.98-5.5 7.87-3.16-.89-5.5-4.26-5.5-7.87V7.5L12 4.88z" fill="white"/>
        </svg>
      );
    
    case "xai":
      return (
        <svg className={cn(sizeClass, className)} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    
    case "deepseek":
      return (
        <svg className={cn(sizeClass, className)} viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
        </svg>
      );
    
    default:
      return null;
  }
}