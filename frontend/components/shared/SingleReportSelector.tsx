"use client";

import { useState, useEffect } from "react";
import { Calendar, ChevronDown, Filter } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ReportResponse } from "@/types/reports";

interface SingleReportSelectorProps {
  reports: ReportResponse[];
  selectedReport: ReportResponse | null;
  availableModels: string[];
  onReportChange: (report: ReportResponse | null) => void;
  onModelFilterChange: (models: string[]) => void;
}

export function SingleReportSelector({
  reports,
  selectedReport,
  availableModels,
  onReportChange,
  onModelFilterChange,
}: SingleReportSelectorProps) {
  const [selectedModels, setSelectedModels] = useState<string[]>(availableModels);
  const [isModelFilterOpen, setIsModelFilterOpen] = useState(false);

  // Sort reports by date (newest first)
  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );

  // Update selected models when available models change
  useEffect(() => {
    setSelectedModels(availableModels);
  }, [availableModels]);

  // Trigger callback when model filter changes
  useEffect(() => {
    // Send empty array when all models are selected (backend will interpret as "all")
    const modelsToSend = selectedModels.length === availableModels.length ? [] : selectedModels;
    onModelFilterChange(modelsToSend);
  }, [selectedModels, availableModels, onModelFilterChange]);

  const handleModelToggle = (model: string) => {
    setSelectedModels(prev => {
      if (prev.includes(model)) {
        // Don't allow unchecking all models
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== model);
      }
      return [...prev, model];
    });
  };

  const handleSelectAllModels = () => {
    setSelectedModels(availableModels);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Report Selector */}
      <div className="flex items-center gap-2">
        <Select 
          value={selectedReport?.id || ""} 
          onValueChange={(value) => {
            const report = sortedReports.find(r => r.id === value);
            onReportChange(report || null);
          }}
        >
          <SelectTrigger className="h-auto p-0 border-0 bg-transparent hover:bg-gray-100 rounded-md transition-colors [&>svg]:hidden">
            <div className="flex items-center gap-1 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {selectedReport && selectedReport.generatedAt
                  ? format(new Date(selectedReport.generatedAt), "MMM d, yyyy")
                  : "Select Report"}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {sortedReports.map(report => (
              <SelectItem key={report.id} value={report.id}>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{format(new Date(report.generatedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Model Filter */}
      {availableModels.length > 0 && (
        <Popover open={isModelFilterOpen} onOpenChange={setIsModelFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 hover:bg-gray-100 rounded-md"
            >
              <div className="flex items-center gap-1 px-3 py-1.5">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  Models
                </span>
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {selectedModels.length === 0 || selectedModels.length === availableModels.length ? 'All' : selectedModels.length}
                </Badge>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Filter by Model</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllModels}
                  className="text-xs h-6 px-2"
                >
                  Select All
                </Button>
              </div>
              <div className="space-y-2">
                {availableModels.map(model => (
                  <div key={model} className="flex items-center space-x-2">
                    <Checkbox
                      id={model}
                      checked={selectedModels.includes(model)}
                      onCheckedChange={() => handleModelToggle(model)}
                    />
                    <Label
                      htmlFor={model}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {model}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}