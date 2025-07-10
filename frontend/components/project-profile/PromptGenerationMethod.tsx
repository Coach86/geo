import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Sparkles, FileText } from "lucide-react";

interface PromptGenerationMethodProps {
  value: 'ai' | 'keywords';
  onChange: (value: 'ai' | 'keywords') => void;
}

export function PromptGenerationMethod({ value, onChange }: PromptGenerationMethodProps) {
  return (
    <div className="space-y-3">
      <Label>How would you like to generate prompts?</Label>
      <RadioGroup value={value} onValueChange={onChange}>
        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
          <RadioGroupItem value="ai" id="ai" />
          <Label htmlFor="ai" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Generate with AI</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Let AI automatically create prompts based on your project context
            </p>
          </Label>
        </div>
        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
          <RadioGroupItem value="keywords" id="keywords" />
          <Label htmlFor="keywords" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="font-medium">Generate from Keywords</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Create prompts based on specific keywords you provide
            </p>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}