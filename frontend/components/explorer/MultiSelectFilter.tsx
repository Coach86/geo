"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/persistent-tooltip";
import { cn } from "@/lib/utils";

interface MultiSelectFilterProps {
  title: string;
  options: string[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
}

export function MultiSelectFilter({
  title,
  options,
  selectedValues,
  onSelectionChange,
  placeholder = "Select items...",
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter((option) =>
      option.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  // Handle selection toggle
  const toggleSelection = (value: string) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange([...options]);
    }
  };

  // Clear all selections
  const handleClear = () => {
    onSelectionChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-xs font-normal"
        >
          <span className="truncate">
            {selectedValues.length === 0
              ? placeholder
              : selectedValues.length === 1
              ? selectedValues[0]
              : `${selectedValues.length} selected`}
          </span>
          <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2 space-y-2">
          {/* Search input */}
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-xs"
          />
          
          {/* Action buttons */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-7 text-xs flex-1"
            >
              {selectedValues.length === options.length
                ? "Deselect All"
                : "Select All"}
            </Button>
            {selectedValues.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[200px]">
          <div className="p-2 pt-0">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No results found
              </p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option);
                const isTruncated = option.length > 50; // Adjust threshold as needed
                
                const optionContent = (
                  <div
                    key={option}
                    className={cn(
                      "flex items-center space-x-2 rounded px-2 py-1.5 cursor-pointer hover:bg-accent",
                      isSelected && "bg-accent/50"
                    )}
                    onClick={() => toggleSelection(option)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(option)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-3 w-3"
                    />
                    <span className="text-xs flex-1 truncate">{option}</span>
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </div>
                );
                
                return isTruncated ? (
                  <TooltipProvider key={option} delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {optionContent}
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        className="max-w-sm p-2"
                        sideOffset={5}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {option}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  optionContent
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Selected count */}
        {selectedValues.length > 0 && (
          <div className="border-t p-2">
            <p className="text-xs text-muted-foreground">
              {selectedValues.length} of {options.length} selected
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Display component for showing selected values as badges
export function MultiSelectDisplay({
  values,
  onRemove,
  maxDisplay = 3,
}: {
  values: string[];
  onRemove?: (value: string) => void;
  maxDisplay?: number;
}) {
  if (values.length === 0) return null;

  const displayValues = values.slice(0, maxDisplay);
  const remainingCount = values.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {displayValues.map((value) => (
        <Badge
          key={value}
          variant="secondary"
          className="text-xs h-5 px-1.5"
        >
          <span className="truncate max-w-[100px]">{value}</span>
          {onRemove && (
            <X
              className="h-2.5 w-2.5 ml-1 cursor-pointer hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(value);
              }}
            />
          )}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="secondary" className="text-xs h-5 px-1.5">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}