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
import { MultiSelectFilter } from "@/components/explorer/MultiSelectFilter";
import { ModelDisplay } from "@/components/shared/ModelDisplay";
import { getModelFriendlyName } from "@/utils/model-utils";

interface CitationItem {
  domain: string;
  url: string;
  title?: string;
  prompt: string;
  sentiment?: string;
  score?: number;
  count: number;
  model?: string;
  text?: string;
}

interface SourcesWatchtowerProps {
  citations: {
    items: CitationItem[];
    uniqueDomains: number;
    totalCitations: number;
  } | undefined;
  type: 'sentiment' | 'alignment';
  loading?: boolean;
}

// Custom filter functions
const fuzzyFilter: FilterFn<CitationItem> = (row, columnId, value) => {
  if (!value) return true;
  
  const searchTerm = value.toLowerCase();
  const searchValue = String(row.getValue(columnId) || "").toLowerCase();
  
  return searchValue.includes(searchTerm);
};

// Multi-select filter function
const multiSelectFilter: FilterFn<CitationItem> = (row, columnId, value) => {
  if (!value || !Array.isArray(value) || value.length === 0) return true;
  const rowValue = row.getValue(columnId) as string;
  return value.includes(rowValue);
};

// Numeric comparison filter function
const numericFilter: FilterFn<CitationItem> = (row, columnId, value) => {
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
      column.setFilterValue({ operator, value: parseFloat(value) });
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
      />
    </div>
  );
}

export function SourcesWatchtower({ citations, type, loading }: SourcesWatchtowerProps) {
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Transform citations data for table
  const data = React.useMemo(() => {
    if (!citations) return [];
    return citations.items;
  }, [citations]);

  // Get unique prompts and models for filters
  const uniquePrompts = React.useMemo(() => {
    return Array.from(new Set(data.map(item => item.prompt))).sort();
  }, [data]);

  const uniqueModels = React.useMemo(() => {
    return Array.from(new Set(data.filter(item => item.model).map(item => item.model!))).sort();
  }, [data]);

  // Column definitions
  const columnHelper = createColumnHelper<CitationItem>();

  const columns = React.useMemo<ColumnDef<CitationItem, any>[]>(
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
        cell: ({ getValue, row }) => {
          const domain = getValue() as string;
          const count = row.original.count;
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{domain}</span>
              <Badge variant="secondary" className="text-xs">{count}</Badge>
            </div>
          );
        },
        filterFn: fuzzyFilter,
        enableSorting: true,
      }),

      type === 'sentiment' 
        ? columnHelper.accessor("sentiment", {
            header: ({ column }) => (
              <div className="space-y-2">
                <span className="font-semibold text-gray-700">Sentiment</span>
                <MultiSelectFilter
                  title="Sentiment"
                  options={['positive', 'neutral', 'negative']}
                  selectedValues={(column.getFilterValue() as string[]) || []}
                  onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
                  placeholder="Filter sentiment..."
                />
              </div>
            ),
            cell: ({ getValue }) => {
              const sentiment = getValue() as string;
              switch (sentiment) {
                case 'positive':
                  return <Badge className="bg-accent-50 text-accent-700 border border-accent-200">Positive</Badge>;
                case 'neutral':
                  return <Badge className="bg-primary-50 text-primary-700 border border-primary-200">Neutral</Badge>;
                case 'negative':
                  return <Badge className="bg-destructive-50 text-destructive-700 border border-destructive-200">Negative</Badge>;
                default:
                  return <Badge variant="outline">Unknown</Badge>;
              }
            },
            filterFn: multiSelectFilter,
            enableSorting: true,
          })
        : columnHelper.accessor("score", {
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
              const score = getValue() as number;
              if (score === undefined) return null;
              
              const percentage = Math.round(score * 100);
              if (score >= 0.8) {
                return <Badge className="bg-accent-50 text-accent-700 border border-accent-200">{percentage}%</Badge>;
              } else if (score >= 0.6) {
                return <Badge className="bg-primary-50 text-primary-700 border border-primary-200">{percentage}%</Badge>;
              } else {
                return <Badge className="bg-destructive-50 text-destructive-700 border border-destructive-200">{percentage}%</Badge>;
              }
            },
            filterFn: numericFilter,
            enableSorting: true,
          }),

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
        cell: ({ getValue, row }) => {
          const url = getValue() as string;
          const title = row.original.title;
          return (
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
            >
              <span className="truncate max-w-[400px]" title={url}>
                {title || url}
              </span>
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
            </a>
          );
        },
        filterFn: fuzzyFilter,
        enableSorting: true,
      }),

      columnHelper.accessor("prompt", {
        header: ({ column }) => (
          <div className="space-y-2">
            <span className="font-semibold text-gray-700">Prompt</span>
            <MultiSelectFilter
              title="Prompt"
              options={uniquePrompts}
              selectedValues={(column.getFilterValue() as string[]) || []}
              onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
              placeholder={`Filter prompts... (${uniquePrompts.length})`}
            />
          </div>
        ),
        cell: ({ getValue }) => {
          const prompt = getValue() as string;
          return (
            <p className="text-sm text-gray-700 max-w-md" title={prompt}>
              {prompt.length > 100 
                ? `${prompt.substring(0, 100)}...` 
                : prompt}
            </p>
          );
        },
        filterFn: multiSelectFilter,
        enableSorting: true,
      }),

      columnHelper.accessor("model", {
        header: ({ column }) => (
          <div className="space-y-2">
            <span className="font-semibold text-gray-700">Model</span>
            <MultiSelectFilter
              title="Model"
              options={uniqueModels}
              selectedValues={(column.getFilterValue() as string[]) || []}
              onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
              placeholder={`Filter models... (${uniqueModels.length})`}
            />
          </div>
        ),
        cell: ({ getValue }) => {
          const model = getValue() as string;
          return model ? <ModelDisplay model={model} size="xs" /> : null;
        },
        filterFn: multiSelectFilter,
        enableSorting: true,
      }),
    ],
    [type, uniquePrompts, uniqueModels]
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

  if (!citations || citations.items.length === 0) {
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
            No sources found for the selected period
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group data by domain for rowspan rendering
  const groupedData = React.useMemo(() => {
    const filtered = table.getFilteredRowModel().rows;
    const groups = new Map<string, typeof filtered>();
    
    filtered.forEach((row) => {
      const domain = row.original.domain;
      if (!groups.has(domain)) {
        groups.set(domain, []);
      }
      groups.get(domain)!.push(row);
    });
    
    return groups;
  }, [table.getFilteredRowModel().rows]);

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
                <col className="w-[12%]" />
                <col className="w-[25%]" />
                <col className="w-[28%]" />
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
                    const totalCount = rows.reduce((sum, r) => sum + r.original.count, 0);
                    
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
                              <div className="flex items-center gap-2">
                                <span>{domain}</span>
                                <Badge variant="secondary" className="ml-2">{totalCount}</Badge>
                              </div>
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