import React from 'react';
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PromptCountSelectProps {
  value: string;
  onChange: (value: string) => void;
  promptType?: 'visibility' | 'sentiment' | 'alignment' | 'competition';
  maxSpontaneousPrompts?: number;
  label?: string;
}

export function PromptCountSelect({ 
  value, 
  onChange, 
  promptType = 'visibility',
  maxSpontaneousPrompts,
  label = "Number of prompts"
}: PromptCountSelectProps) {
  
  const getPromptCountOptions = () => {
    if (promptType === 'visibility') {
      return [
        { value: "12", label: "12 prompts" },
        { value: "15", label: "15 prompts" },
        { value: "30", label: "30 prompts" },
        { value: "50", label: "50 prompts" },
      ];
    } else {
      return [
        { value: "3", label: "3 prompts" },
        { value: "5", label: "5 prompts" },
        { value: "10", label: "10 prompts" },
      ];
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {getPromptCountOptions().map((option) => {
            const optionCount = parseInt(option.value);
            const requiresUpgrade = promptType === 'visibility' && maxSpontaneousPrompts !== undefined && optionCount > maxSpontaneousPrompts;
            
            return (
              <SelectItem 
                key={option.value} 
                value={option.value}
                disabled={requiresUpgrade}
              >
                {option.label}
                {requiresUpgrade && (
                  <span className="text-xs text-muted-foreground ml-2">(Upgrade required)</span>
                )}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}