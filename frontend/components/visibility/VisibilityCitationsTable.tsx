"use client";

import * as React from "react";
import { useFavicons, extractDomain } from "@/hooks/use-favicon";
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
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/persistent-tooltip";
import { MultiSelectFilter } from "@/components/explorer/MultiSelectFilter";
import { ModelDisplay } from "@/components/shared/ModelDisplay";

export interface VisibilityCitation {
  website: string;
  link: string;
  model: string;
  promptType: string;
  promptIndex: number;
  promptText?: string;
  brandMentioned?: boolean;
  brandMentionContext?: string;
  title?: string;
  searchQueries?: string[];
}

interface VisibilityCitationsTableProps {
  citations: VisibilityCitation[] | undefined;
  loading?: boolean;
  brandName: string;
  hideCard?: boolean;
}

// Custom filter functions
const fuzzyFilter: FilterFn<VisibilityCitation> = (row, columnId, value) => {
  if (!value) return true;
  
  const searchTerm = value.toLowerCase();
  const searchValue = String(row.getValue(columnId) || "").toLowerCase();
  
  return searchValue.includes(searchTerm);
};

// Multi-select filter function
const multiSelectFilter: FilterFn<VisibilityCitation> = (row, columnId, value) => {
  if (!value || !Array.isArray(value) || value.length === 0) return true;
  
  const rowValue = row.getValue(columnId);
  return value.includes(rowValue as string);
};

export function VisibilityCitationsTable({ citations, loading, brandName, hideCard = false }: VisibilityCitationsTableProps) {
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Get unique domains for favicon fetching
  const uniqueDomains = React.useMemo(() => {
    if (!citations) return [];
    // Extract and normalize domains using the same logic as the favicon hook
    const domains = [...new Set(
      citations
        .map(item => {
          if (!item.website || item.website.trim() === '') return null;
          // Use extractDomain to normalize the domain
          return extractDomain(item.website);
        })
        .filter((domain): domain is string => domain !== null)
    )];
    return domains;
  }, [citations]);

  // Fetch favicons for all domains
  const { favicons } = useFavicons(uniqueDomains);

  // Column definitions
  const columnHelper = createColumnHelper<VisibilityCitation>();

  const columns = React.useMemo<ColumnDef<VisibilityCitation, any>[]>(
    () => [
      columnHelper.accessor("website", {
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
          // Use extractDomain to normalize the domain for favicon lookup
          const normalizedDomain = extractDomain(domain);
          const faviconUrl = normalizedDomain ? favicons[normalizedDomain] : null;
          
          return (
            <div className="flex items-center gap-2">
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt={`${domain} favicon`}
                  className="w-4 h-4 rounded-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-4 h-4 rounded-sm bg-gray-200 flex items-center justify-center">
                  <Globe className="w-3 h-3 text-gray-400" />
                </div>
              )}
              <span className="font-medium">{domain}</span>
            </div>
          );
        },
        filterFn: fuzzyFilter,
        enableSorting: true,
      }),

      columnHelper.accessor("brandMentioned", {
        header: ({ column }) => {
          const sortedUniqueValues = React.useMemo(
            () => {
              return ["Yes", "No", "Unknown"];
            },
            []
          );

          return (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
              >
                {brandName} Mentioned
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
              <MultiSelectFilter
                title="Brand Mentioned"
                options={sortedUniqueValues}
                selectedValues={(column.getFilterValue() as string[]) || []}
                onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
                placeholder="Filter by mention..."
              />
            </div>
          );
        },
        cell: ({ getValue, row }) => {
          const mentioned = getValue() as boolean | undefined;
          const context = row.original.brandMentionContext;
          
          if (mentioned === true) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Yes</span>
                    </div>
                  </TooltipTrigger>
                  {context && (
                    <TooltipContent side="right" className="max-w-md">
                      <p className="text-xs whitespace-pre-wrap">
                        ...{context}...
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          } else if (mentioned === false) {
            return (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">No</span>
              </div>
            );
          } else {
            return (
              <span className="text-sm text-gray-400 italic">Unknown</span>
            );
          }
        },
        filterFn: (row, columnId, value) => {
          if (!value || !Array.isArray(value) || value.length === 0) return true;
          
          const mentioned = row.getValue(columnId) as boolean | undefined;
          
          if (value.includes("Yes") && mentioned === true) return true;
          if (value.includes("No") && mentioned === false) return true;
          if (value.includes("Unknown") && mentioned === undefined) return true;
          
          return false;
        },
        enableSorting: true,
      }),

      columnHelper.accessor("link", {
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

      columnHelper.accessor("promptText", {
        header: ({ column }) => (
          <div className="space-y-2">
            <span className="font-semibold text-gray-700">Prompt</span>
            <Input
              placeholder="Filter prompts..."
              value={(column.getFilterValue() as string) ?? ""}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        ),
        cell: ({ getValue, row }) => {
          const prompt = getValue() as string | undefined;
          
          if (!prompt || prompt.trim() === '') {
            return (
              <p className="text-xs text-gray-400 italic">Prompt text not available</p>
            );
          }
          
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs text-gray-700 cursor-help" title={prompt}>
                    {prompt.length > 100 
                      ? `${prompt.substring(0, 100)}...` 
                      : prompt}
                  </p>
                </TooltipTrigger>
                {prompt.length > 100 && (
                  <TooltipContent side="left" className="max-w-md">
                    <p className="text-xs whitespace-pre-wrap">{prompt}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          );
        },
        filterFn: fuzzyFilter,
        enableSorting: true,
      }),

      columnHelper.accessor("model", {
        header: ({ column }) => {
          const sortedUniqueValues = React.useMemo(
            () => {
              const uniqueValues = new Set<string>();
              table.getPreFilteredRowModel().rows.forEach(row => {
                const model = row.getValue("model") as string;
                if (model) uniqueValues.add(model);
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
          const model = getValue() as string;
          return <ModelDisplay model={model} size="xs" />;
        },
        filterFn: multiSelectFilter,
        enableSorting: true,
      }),
    ],
    [brandName, favicons]
  );

  // Initialize table
  const table = useReactTable({
    data: citations || [],
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
      sorting: [
        {
          id: "brandMentioned",
          desc: true,
        },
      ],
    },
  });

  if (loading) {
    const loadingContent = (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );

    if (hideCard) {
      return loadingContent;
    }

    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Sources Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>{loadingContent}</CardContent>
      </Card>
    );
  }

  if (!citations || citations.length === 0) {
    const emptyContent = (
      <p className="text-sm text-gray-400 italic text-center py-8">
        No citations found for the selected period
      </p>
    );

    if (hideCard) {
      return emptyContent;
    }

    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Sources Analysis
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Track all citations from visibility prompts and whether {brandName} was mentioned
          </p>
        </CardHeader>
        <CardContent>{emptyContent}</CardContent>
      </Card>
    );
  }

  // Calculate summary statistics
  const totalCitations = citations.length;
  const citationsWithBrandMention = citations.filter(c => c.brandMentioned === true).length;
  const brandMentionRate = totalCitations > 0 ? (citationsWithBrandMention / totalCitations) * 100 : 0;

  const tableContent = (
    <div className="space-y-4">
      {/* Summary stats and search bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {totalCitations} total citations • {citationsWithBrandMention} mention {brandName} ({brandMentionRate.toFixed(1)}%)
        </p>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
          <span className="text-sm text-gray-500">
            {table.getFilteredRowModel().rows.length} of {citations.length} entries
          </span>
        </div>
      </div>
          {/* Table */}
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="w-full min-w-[1000px] border-collapse table-fixed">
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[15%]" />
                <col className="w-[30%]" />
                <col className="w-[25%]" />
                <col className="w-[12%]" />
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
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Database className="h-8 w-8 text-gray-300" />
                        <p className="text-sm">No citations match your filters</p>
                        <p className="text-xs text-gray-400">Try adjusting your search criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      {row.getVisibleCells().map((cell) => (
                        <td 
                          key={cell.id} 
                          className="px-4 py-3 border-b border-gray-200"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
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
  );

  if (hideCard) {
    return tableContent;
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Sources Analysis
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tableContent}
      </CardContent>
    </Card>
  );
}