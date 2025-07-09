import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Upload, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface KeywordsInputProps {
  keywords: string;
  onKeywordsChange: (keywords: string) => void;
  csvFile: File | null;
  onCsvFileChange: (file: File | null) => void;
}

export function KeywordsInput({ 
  keywords, 
  onKeywordsChange, 
  csvFile, 
  onCsvFileChange 
}: KeywordsInputProps) {
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    onCsvFileChange(file);
    
    // Read CSV file
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const keywordList: string[] = [];
      
      lines.forEach((line, index) => {
        // Skip header if it exists
        if (index === 0 && line.toLowerCase().includes('keyword')) return;
        
        const keyword = line.split(',')[0]?.trim();
        if (keyword) keywordList.push(keyword);
      });

      onKeywordsChange(keywordList.join(', '));
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-2">
      <Label>Keywords</Label>
      <Textarea
        placeholder="Enter keywords separated by commas (e.g., AI monitoring, brand sentiment, customer feedback)"
        value={keywords}
        onChange={(e) => onKeywordsChange(e.target.value)}
        rows={3}
      />
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          id="csv-upload"
        />
        <Label
          htmlFor="csv-upload"
          className="cursor-pointer inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <Upload className="h-4 w-4" />
          Upload CSV file
        </Label>
        {csvFile && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>{csvFile.name}</span>
            <button
              onClick={() => {
                onCsvFileChange(null);
                onKeywordsChange('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Upload a CSV file with keywords in the first column (max 5MB)
      </p>
    </div>
  );
}