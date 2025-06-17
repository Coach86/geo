import { SvgLoader } from "@/components/ui/svg-loader";

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
      <SvgLoader className="mr-2" size="sm" />
      Generating Report...
    </>
  );
}