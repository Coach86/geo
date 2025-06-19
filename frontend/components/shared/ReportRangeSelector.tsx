"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronDown, Filter, CalendarRange } from "lucide-react";
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import type { ReportResponse } from "@/types/reports";

interface ReportRangeSelectorProps {
  reports: ReportResponse[];
  projectId: string;
  availableModels: string[];
  onRangeChange: (startDate: Date, endDate: Date, selectedReports: ReportResponse[], isAllTime?: boolean) => void;
  onModelFilterChange: (models: string[]) => void;
}

const PREDEFINED_RANGES = [
  { label: "Latest", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: -1 },
  { label: "Custom range", days: -2 },
];

// Removed fixed model list - will use availableModels prop instead

export function ReportRangeSelector({
  reports,
  projectId,
  availableModels,
  onRangeChange,
  onModelFilterChange,
}: ReportRangeSelectorProps) {
  // Storage keys for persisting user preferences (project-specific, shared across features)
  const STORAGE_KEY_RANGE = `date-range-${projectId}`;
  const STORAGE_KEY_MODELS = `selected-models-${projectId}`;
  const STORAGE_KEY_CUSTOM_DATES = `custom-dates-${projectId}`;
  // Load saved preferences from localStorage
  const [selectedRange, setSelectedRange] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_RANGE) || "Latest";
    }
    return "Latest";
  });
  
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_MODELS);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved models:', e);
        }
      }
    }
    return availableModels;
  });
  
  const [isModelFilterOpen, setIsModelFilterOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_DATES);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            from: parsed.from ? new Date(parsed.from) : undefined,
            to: parsed.to ? new Date(parsed.to) : undefined
          };
        } catch (e) {
          console.error('Failed to parse saved custom dates:', e);
        }
      }
    }
    return { from: undefined, to: undefined };
  });
  
  const [triggerRef, setTriggerRef] = useState<HTMLElement | null>(null);

  // Sort reports by date
  const sortedReports = useMemo(() => {
    return [...reports].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    );
  }, [reports]);

  // Calculate date range and filter reports
  const filteredReports = useMemo(() => {
    if (!sortedReports.length) return [];

    const range = PREDEFINED_RANGES.find(r => r.label === selectedRange);
    if (!range) return sortedReports;

    // Latest - just return the most recent report
    if (range.days === 0) {
      return [sortedReports[0]];
    }

    // All time
    if (range.days === -1) {
      return sortedReports;
    }

    // Custom range
    if (range.days === -2) {
      if (!customDateRange.from || !customDateRange.to) return [];
      
      const startDate = startOfDay(customDateRange.from);
      const endDate = endOfDay(customDateRange.to);
      
      return sortedReports.filter(report => {
        const reportDate = new Date(report.generatedAt);
        return (isAfter(reportDate, startDate) || reportDate.getTime() === startDate.getTime()) && 
               (isBefore(reportDate, endDate) || reportDate.getTime() === endDate.getTime());
      });
    }

    // Predefined ranges
    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(endDate, range.days));

    return sortedReports.filter(report => {
      const reportDate = new Date(report.generatedAt);
      return (isAfter(reportDate, startDate) || reportDate.getTime() === startDate.getTime()) && 
             (isBefore(reportDate, endDate) || reportDate.getTime() === endDate.getTime());
    });
  }, [sortedReports, selectedRange, customDateRange]);

  // Calculate the actual date range (separate from filtered reports)
  const actualDateRange = useMemo(() => {
    const range = PREDEFINED_RANGES.find(r => r.label === selectedRange);
    if (!range) return null;

    if (range.days === 0) {
      // Latest - use today
      const today = new Date();
      return { startDate: startOfDay(today), endDate: endOfDay(today) };
    } else if (range.days === -1) {
      // All time - use the full range of available reports
      if (sortedReports.length > 0) {
        const startDate = new Date(sortedReports[sortedReports.length - 1].generatedAt);
        const endDate = new Date(sortedReports[0].generatedAt);
        return { startDate: startOfDay(startDate), endDate: endOfDay(endDate) };
      } else {
        const today = new Date();
        return { startDate: startOfDay(today), endDate: endOfDay(today) };
      }
    } else if (range.days === -2) {
      // Custom range - use the selected custom dates
      if (customDateRange.from && customDateRange.to) {
        return {
          startDate: startOfDay(customDateRange.from),
          endDate: endOfDay(customDateRange.to)
        };
      }
      return null;
    } else {
      // Predefined ranges - use the actual time period
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(endDate, range.days));
      return { startDate, endDate };
    }
  }, [selectedRange, customDateRange, sortedReports]);

  // Trigger callback when date range changes
  useEffect(() => {
    if (actualDateRange) {
      const isAllTime = selectedRange === "All time";
      console.log(`[ReportRangeSelector] ${selectedRange} - Sending date range:`, {
        startDate: actualDateRange.startDate.toISOString(),
        endDate: actualDateRange.endDate.toISOString(),
        filteredReportsCount: filteredReports.length
      });
      onRangeChange(actualDateRange.startDate, actualDateRange.endDate, filteredReports, isAllTime);
    }
  }, [actualDateRange, filteredReports, onRangeChange, selectedRange]);

  // Trigger callback when model filter changes and save to localStorage
  useEffect(() => {
    // Send empty array when all models are selected (backend will interpret as "all")
    const modelsToSend = selectedModels.length === availableModels.length ? [] : selectedModels;
    onModelFilterChange(modelsToSend);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MODELS, JSON.stringify(selectedModels));
    }
  }, [selectedModels, availableModels, onModelFilterChange]);
  
  // Save selected range to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedRange) {
      localStorage.setItem(STORAGE_KEY_RANGE, selectedRange);
    }
  }, [selectedRange]);
  
  // Save custom date range to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && customDateRange.from && customDateRange.to) {
      localStorage.setItem(STORAGE_KEY_CUSTOM_DATES, JSON.stringify({
        from: customDateRange.from.toISOString(),
        to: customDateRange.to.toISOString()
      }));
    }
  }, [customDateRange]);

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


  const handleCustomDateSelect = () => {
    if (customDateRange.from && customDateRange.to) {
      setSelectedRange("Custom range");
      setIsDatePickerOpen(false);
    }
  };


  return (
    <div className="flex items-center gap-2">
      {/* Date Range Selector */}
      <div className="flex items-center gap-2">
        <Select 
          value={selectedRange} 
          onValueChange={(value) => {
            if (value === "Custom range") {
              // Always open date picker when selecting custom range
              setIsDatePickerOpen(true);
              // Don't change the selected range until dates are picked
              if (!customDateRange.from || !customDateRange.to) {
                return;
              }
            }
            setSelectedRange(value);
          }}
        >
          <SelectTrigger 
            ref={setTriggerRef}
            className="h-auto p-0 border-0 bg-transparent hover:bg-gray-100 rounded-md transition-colors [&>svg]:hidden"
          >
            <div className="flex items-center gap-1 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {selectedRange === "Custom range" && customDateRange.from && customDateRange.to
                  ? `${format(customDateRange.from, "MMM d")} - ${format(customDateRange.to, "MMM d, yyyy")}`
                  : selectedRange}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {PREDEFINED_RANGES.map(range => (
              <SelectItem 
                key={range.label} 
                value={range.label}
                onPointerDown={(e) => {
                  // Special handling for custom range to ensure it always opens calendar
                  if (range.label === "Custom range" && selectedRange === "Custom range") {
                    e.preventDefault();
                    setIsDatePickerOpen(true);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {range.label === "Custom range" ? (
                    <CalendarRange className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Calendar className="h-4 w-4 text-gray-500" />
                  )}
                  <span>{range.label}</span>
                  {filteredReports.length > 0 && range.label === selectedRange && range.label !== "Custom range" && (
                    <span className="text-xs text-gray-500">
                      ({filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range Picker */}
        <Popover 
          open={isDatePickerOpen} 
          onOpenChange={setIsDatePickerOpen}
        >
          <PopoverTrigger asChild>
            <button 
              ref={triggerRef}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            />
          </PopoverTrigger>
          <PopoverContent 
            className="w-auto p-0" 
            align="start"
            side="bottom"
            sideOffset={5}
            onInteractOutside={(e) => {
              e.preventDefault();
            }}
          >
              <div className="p-3">
                <CalendarComponent
                  mode="range"
                  defaultMonth={customDateRange.from || new Date()}
                  selected={{
                    from: customDateRange.from,
                    to: customDateRange.to,
                  }}
                  onSelect={(range: any) => {
                    setCustomDateRange({
                      from: range?.from,
                      to: range?.to,
                    });
                    if (range?.from && range?.to) {
                      handleCustomDateSelect();
                    }
                  }}
                  numberOfMonths={2}
                  disabled={(date) => date > new Date()}
                />
                <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDatePickerOpen(false);
                      setCustomDateRange({ from: undefined, to: undefined });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!customDateRange.from || !customDateRange.to}
                    onClick={handleCustomDateSelect}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
      </div>

      {/* Model Filter */}
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
              {availableModels.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {selectedModels.length === 0 || selectedModels.length === availableModels.length ? 'All' : selectedModels.length}
                </Badge>
              )}
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

      {/* Report Count Badge */}
      {filteredReports.length > 0 && (
        <Badge variant="outline" className="text-xs">
          {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
}