import { CheckCircle } from "lucide-react";

export function ConfirmationHeader() {
  return (
    <div className="mb-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-accent-100 text-accent-500 mb-4">
        <CheckCircle className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold mb-2 text-mono-900">
        Ready to generate your Report?
      </h1>
      <p className="text-gray-600 max-w-md mx-auto">
        Review your selections before we generate your AI brand perception report
      </p>
    </div>
  );
}