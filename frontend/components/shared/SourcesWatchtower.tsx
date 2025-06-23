"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type FilterFn,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink,
  Globe,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MultiSelectFilter } from "@/components/explorer/MultiSelectFilter";
import { ModelDisplay } from "@/components/shared/ModelDisplay";
import { getModelFriendlyName } from "@/utils/model-utils";

interface CitationItem {
  domain: string;
  url: string;
  title?: string;
  prompts: string[];
  sentiments?: string[];
  scores?: number[];
  models: string[];
  count: number;
  text?: string;
}

// Aggregated citation that combines multiple citations for the same URL
interface AggregatedCitation {
  domain: string;
  url: string;
  title?: string;
  prompts: string[];
  sentiments?: string[];
  scores?: number[];
  models: string[];
  totalCount: number;
}

interface SourcesWatchtowerProps {
  citations: {
    items: CitationItem[];
    uniqueDomains: number;
    totalCitations: number;
  } | undefined;
  type: 'sentiment' | 'alignment' | 'competition';
  loading?: boolean;
}

// Custom filter functions
const fuzzyFilter: FilterFn<CitationItem> = (row, columnId, value) => {
  if (!value) return true;
  
  const searchTerm = value.toLowerCase();
  const searchValue = String(row.getValue(columnId) || "").toLowerCase();
  
  return searchValue.includes(searchTerm);
};

// Multi-select filter function that handles both single values and arrays
const multiSelectFilter: FilterFn<AggregatedCitation> = (row, columnId, value) => {
  if (!value || !Array.isArray(value) || value.length === 0) return true;
  
  const rowValue = row.getValue(columnId);
  
  // Handle array values (like prompts, sentiments, models)
  if (Array.isArray(rowValue)) {
    // Check if any of the row values match any of the filter values
    return rowValue.some(rv => value.includes(rv));
  }
  
  // Handle single values
  return value.includes(rowValue as string);
};

// Numeric comparison filter function
const numericFilter: FilterFn<AggregatedCitation> = (row, columnId, value) => {
  if (!value || typeof value !== 'object') return true;
  
  const { operator, value: filterValue } = value as { operator: string; value: number };
  const cellValue = row.getValue(columnId) as number;
  
  if (cellValue === undefined || cellValue === null) return false;
  
  switch (operator) {
    case '>':
      return cellValue > filterValue;
    case '<':
      return cellValue < filterValue;
    case '>=':
      return cellValue >= filterValue;
    case '<=':
      return cellValue <= filterValue;
    case '=':
      return cellValue === filterValue;
    default:
      return true;
  }
};

interface NumericFilterProps {
  column: any;
  label: string;
}

function NumericFilter({ column, label }: NumericFilterProps) {
  const [operator, setOperator] = React.useState('>');
  const [value, setValue] = React.useState('');

  React.useEffect(() => {
    if (value) {
      // Convert percentage to decimal for comparison
      const numValue = parseFloat(value) / 100;
      column.setFilterValue({ operator, value: numValue });
    } else {
      column.setFilterValue(undefined);
    }
  }, [operator, value, column]);

  return (
    <div className="flex gap-1">
      <Select value={operator} onValueChange={setOperator}>
        <SelectTrigger className="w-16 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value=">">&gt;</SelectItem>
          <SelectItem value="<">&lt;</SelectItem>
          <SelectItem value=">=">&gt;=</SelectItem>
          <SelectItem value="<=">&lt;=</SelectItem>
          <SelectItem value="=">=</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        placeholder={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 text-xs w-20"
        min="0"
        max="100"
      />
    </div>
  );
}

export function SourcesWatchtower({ citations, type, loading }: SourcesWatchtowerProps) {
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Transform citations data for table (backend now provides aggregated data)
  const data = React.useMemo(() => {
    if (!citations) return [];
    
    // Convert backend CitationItem to AggregatedCitation format
    return citations.items.map(item => ({
      domain: item.domain,
      url: item.url,
      title: item.title,
      prompts: item.prompts,
      sentiments: item.sentiments,
      scores: item.scores,
      models: item.models,
      totalCount: item.count
    }));
  }, [citations]);

  // Column definitions
  const columnHelper = createColumnHelper<AggregatedCitation>();

  const columns = React.useMemo<ColumnDef<AggregatedCitation, any>[]>(
    () => [
      columnHelper.accessor("domain", {
        header: ({ column }) => (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
            >
              Domain
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
            <Input
              placeholder="Filter domains..."
              value={(column.getFilterValue() as string) ?? ""}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        ),
        cell: ({ getValue }) => {
          const domain = getValue() as string;
          return (
            <span className="font-medium">{domain}</span>
          );
        },
        filterFn: fuzzyFilter,
        enableSorting: true,
      }),

      ...(type === 'sentiment' 
        ? [columnHelper.accessor("sentiments", {
            header: ({ column }) => {
              const sortedUniqueValues = React.useMemo(
                () => {
                  const uniqueValues = new Set<string>();
                  table.getPreFilteredRowModel().rows.forEach(row => {
                    const sentiments = row.getValue("sentiments") as string[];
                    if (sentiments && Array.isArray(sentiments)) {
                      sentiments.forEach(sentiment => {
                        if (sentiment) uniqueValues.add(sentiment);
                      });
                    }
                  });
                  return Array.from(uniqueValues).sort();
                },
                [table.getPreFilteredRowModel().rows]
              );

              return (
                <div className="space-y-2">
                  <span className="font-semibold text-gray-700">Sentiment</span>
                  <MultiSelectFilter
                    title="Sentiment"
                    options={sortedUniqueValues}
                    selectedValues={(column.getFilterValue() as string[]) || []}
                    onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
                    placeholder={`Filter sentiment... (${sortedUniqueValues.length})`}
                  />
                </div>
              );
            },
            cell: ({ getValue }) => {
              const sentiments = getValue() as string[] | undefined;
              if (!sentiments || sentiments.length === 0) return null;
              
              return (
                <div className="flex flex-wrap gap-1">
                  {[...new Set(sentiments)].map((sentiment, idx) => {
                    switch (sentiment) {
                      case 'positive':
                        return <Badge key={idx} className="bg-accent-50 text-accent-700 border border-accent-200 text-xs">Positive</Badge>;
                      case 'neutral':
                        return <Badge key={idx} className="bg-primary-50 text-primary-700 border border-primary-200 text-xs">Neutral</Badge>;
                      case 'negative':
                        return <Badge key={idx} className="bg-destructive-50 text-destructive-700 border border-destructive-200 text-xs">Negative</Badge>;
                      default:
                        return <Badge key={idx} variant="outline" className="text-xs">Unknown</Badge>;
                    }
                  })}
                </div>
              );
            },
            filterFn: multiSelectFilter,
            enableSorting: true,
            enableColumnFilter: true,
          })]
        : type === 'alignment'
        ? [columnHelper.accessor("scores", {
            header: ({ column }) => (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                  className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
                >
                  Score
                  {column.getIsSorted() === "asc" ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                  ) : column.getIsSorted() === "desc" ? (
                    <ArrowDown className="ml-2 h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
                <NumericFilter column={column} label="Score %" />
              </div>
            ),
            cell: ({ getValue }) => {
              const scores = getValue() as number[] | undefined;
              if (!scores || scores.length === 0) return null;
              
              // Calculate average score
              const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
              const percentage = Math.round(avgScore * 100);
              
              return (
                <div className="flex items-center gap-1">
                  {avgScore >= 0.8 ? (
                    <Badge className="bg-accent-50 text-accent-700 border border-accent-200 text-xs">{percentage}%</Badge>
                  ) : avgScore >= 0.6 ? (
                    <Badge className="bg-primary-50 text-primary-700 border border-primary-200 text-xs">{percentage}%</Badge>
                  ) : (
                    <Badge className="bg-destructive-50 text-destructive-700 border border-destructive-200 text-xs">{percentage}%</Badge>
                  )}
                </div>
              );
            },
            filterFn: numericFilter,
            enableSorting: true,
          })]
        : []),

      columnHelper.accessor("url", {
        header: ({ column }) => (
          <div className="space-y-2">
            <span className="font-semibold text-gray-700">URL</span>
            <Input
              placeholder="Filter URLs..."
              value={(column.getFilterValue() as string) ?? ""}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        ),
        cell: ({ getValue }) => {
          const url = getValue() as string;
          return (
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 break-all"
            >
              {url}
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          );
        },
        filterFn: fuzzyFilter,
        enableSorting: true,
      }),

      columnHelper.accessor("prompts", {
        header: ({ column }) => {
          const sortedUniqueValues = React.useMemo(
            () => {
              const uniqueValues = new Set<string>();
              table.getPreFilteredRowModel().rows.forEach(row => {
                const prompts = row.getValue("prompts") as string[];
                if (prompts && Array.isArray(prompts)) {
                  prompts.forEach(prompt => {
                    if (prompt) uniqueValues.add(prompt);
                  });
                }
              });
              return Array.from(uniqueValues).sort();
            },
            [table.getPreFilteredRowModel().rows]
          );

          return (
            <div className="space-y-2">
              <span className="font-semibold text-gray-700">Prompt</span>
              <MultiSelectFilter
                title="Prompt"
                options={sortedUniqueValues}
                selectedValues={(column.getFilterValue() as string[]) || []}
                onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
                placeholder={`Filter prompts... (${sortedUniqueValues.length})`}
              />
            </div>
          );
        },
        cell: ({ getValue }) => {
          const prompts = getValue() as string[];
          if (!prompts || prompts.length === 0) return null;
          
          const uniquePrompts = [...new Set(prompts)];
          
          return (
            <div className="space-y-1">
              {uniquePrompts.slice(0, 2).map((prompt, idx) => (
                <p key={idx} className="text-sm text-gray-700" title={prompt}>
                  {prompt.length > 80 
                    ? `${prompt.substring(0, 80)}...` 
                    : prompt}
                </p>
              ))}
              {uniquePrompts.length > 2 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xs text-gray-500 cursor-help underline decoration-dotted">
                        +{uniquePrompts.length - 2} more prompt{uniquePrompts.length - 2 > 1 ? 's' : ''}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-md">
                      <div className="space-y-2">
                        {uniquePrompts.slice(2).map((prompt, idx) => (
                          <p key={idx} className="text-sm whitespace-pre-wrap">
                            {prompt}
                          </p>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
        filterFn: multiSelectFilter,
        enableSorting: true,
        enableColumnFilter: true,
      }),

      columnHelper.accessor("models", {
        header: ({ column }) => {
          const sortedUniqueValues = React.useMemo(
            () => {
              const uniqueValues = new Set<string>();
              table.getPreFilteredRowModel().rows.forEach(row => {
                const models = row.getValue("models") as string[];
                if (models && Array.isArray(models)) {
                  models.forEach(model => {
                    if (model) uniqueValues.add(model);
                  });
                }
              });
              return Array.from(uniqueValues).sort();
            },
            [table.getPreFilteredRowModel().rows]
          );

          return (
            <div className="space-y-2">
              <span className="font-semibold text-gray-700">Model</span>
              <MultiSelectFilter
                title="Model"
                options={sortedUniqueValues}
                selectedValues={(column.getFilterValue() as string[]) || []}
                onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
                placeholder={`Filter models... (${sortedUniqueValues.length})`}
              />
            </div>
          );
        },
        cell: ({ getValue }) => {
          const models = getValue() as string[];
          if (!models || models.length === 0) return null;
          
          const uniqueModels = [...new Set(models)];
          
          return (
            <div className="flex flex-wrap gap-1">
              {uniqueModels.slice(0, 2).map((model, idx) => (
                <ModelDisplay key={idx} model={model} size="xs" />
              ))}
              {uniqueModels.length > 2 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-gray-500 cursor-help underline decoration-dotted">
                        +{uniqueModels.length - 2} more
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-md">
                      <div className="flex flex-wrap gap-1">
                        {uniqueModels.slice(2).map((model, idx) => (
                          <ModelDisplay key={idx} model={model} size="xs" />
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
        filterFn: multiSelectFilter,
        enableSorting: true,
        enableColumnFilter: true,
      }),
    ],
    [type]
  );

  // Initialize table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: fuzzyFilter,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  // Group data by domain for rowspan rendering - must be called before conditional returns
  const groupedData = React.useMemo(() => {
    const paginatedRows = table.getRowModel().rows;
    const groups = new Map<string, typeof paginatedRows>();
    
    paginatedRows.forEach((row) => {
      const domain = row.original.domain;
      if (!groups.has(domain)) {
        groups.set(domain, []);
      }
      groups.get(domain)!.push(row);
    });
    
    return groups;
  }, [table.getRowModel().rows]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Sources Watchtower
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!citations || !citations.items || citations.items.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Sources Watchtower
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Track sources cited across all reports in the selected period
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 italic text-center py-8">
            {!citations ? 'Loading citations...' : 'No sources found for the selected period'}
          </p>
          {citations && (
            <p className="text-xs text-gray-300 mt-2">
              Debug: {citations.uniqueDomains || 0} domains, {citations.totalCitations || 0} citations
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Sources Watchtower
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {citations.uniqueDomains} unique domains • {citations.totalCitations} total citations
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search all columns..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
            <span className="text-sm text-gray-500">
              {table.getFilteredRowModel().rows.length} of {data.length} entries
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="w-full min-w-[1000px] border-collapse table-fixed">
              <colgroup>
                <col className="w-[20%]" />
                {type !== 'competition' && <col className="w-[12%]" />}
                <col className={type === 'competition' ? "w-[30%]" : "w-[25%]"} />
                <col className={type === 'competition' ? "w-[35%]" : "w-[28%]"} />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-gray-50">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b-2 border-gray-200"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {(() => {
                  const renderedRows: JSX.Element[] = [];
                  
                  groupedData.forEach((rows, domain) => {
                    const totalCount = rows.reduce((sum, r) => sum + r.original.totalCount, 0);
                    
                    rows.forEach((row, index) => {
                      const isFirstInGroup = index === 0;
                      const isLastInGroup = index === rows.length - 1;
                      
                      renderedRows.push(
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td 
                            className={`px-4 py-3 border-b ${isLastInGroup ? 'border-gray-300' : 'border-gray-200'} font-medium align-top`}
                            rowSpan={isFirstInGroup ? rows.length : undefined}
                            style={isFirstInGroup ? {} : { display: 'none' }}
                          >
                            {isFirstInGroup && (
                              <span>{domain}</span>
                            )}
                          </td>
                          {row.getVisibleCells().slice(1).map((cell) => (
                            <td 
                              key={cell.id} 
                              className={`px-4 py-3 border-b ${isLastInGroup ? 'border-gray-300' : 'border-gray-200'}`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    });
                  });
                  
                  return renderedRows.length > 0 ? renderedRows : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Database className="h-8 w-8 text-gray-300" />
                          <p className="text-sm">No sources match your filters</p>
                          <p className="text-xs text-gray-400">Try adjusting your search criteria</p>
                        </div>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={pageSize.toString()}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-500">entries per page</span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}