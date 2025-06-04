import { Loader2 } from "lucide-react";

interface LoadingStatesProps {
  isGenerating: boolean;
  message?: string;
}

export function LoadingStates({ isGenerating, message }: LoadingStatesProps) {
  if (!isGenerating) return null;

  return (
    <p className="text-xs text-accent-600 mt-2 font-medium">
      {message || "Saving brand configurations and generating prompts..."}
    </p>
  );
}

export function LoadingButton({ isGenerating }: { isGenerating: boolean }) {
  return (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Generating Report...
    </>
  );
}