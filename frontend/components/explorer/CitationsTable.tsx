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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/persistent-tooltip";
import {
  ExternalLink,
  Search,
  LinkIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
} from "lucide-react";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { getModelFriendlyName } from "@/utils/model-utils";
import { getPromptTypeFriendlyName } from "@/utils/prompt-utils";

// Types
interface CitationRow {
  id: string;
  searchQuery: string;
  source: string;
  link: string | null;
  model: string;
  promptType: string;
  promptText: string | null;
  domain: string;
}

interface CitationsTableProps {
  citations?: Array<{
    website: string;
    link?: string;
    model?: string;
    promptType?: string;
    promptText?: string | null;
    webSearchQueries?: Array<{ query: string }>;
  }>;
  webSearchResults?: Array<{
    query: string;
    timestamp?: string;
    models: string[];
    promptTypes: string[];
    citations: Array<{
      website: string;
      link?: string;
      model: string;
      promptType: string;
      promptIndex: number;
      source?: string;
    }>;
  }>;
  onExport: () => void;
  searchQueryFilter?: string;
  promptSet?: {
    visibility: string[];
    sentiment: string[];
    alignment: string[];
    competition: string[];
  };
}

// Custom filter functions
const fuzzyFilter: FilterFn<CitationRow> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value);
  addMeta({
    itemRank,
  });
  return itemRank.passed;
};

// Multi-select filter function
const multiSelectFilter: FilterFn<CitationRow> = (row, columnId, value) => {
  if (!value || !Array.isArray(value) || value.length === 0) return true;
  const rowValue = row.getValue(columnId) as string;
  return value.includes(rowValue);
};

// Simple fuzzy matching function
function rankItem(item: any, term: string): { passed: boolean; rank: number } {
  if (!term) return { passed: true, rank: 0 };
  
  const searchTerm = term.toLowerCase();
  const searchValue = String(item || "").toLowerCase();
  
  if (searchValue.includes(searchTerm)) {
    const exactMatch = searchValue === searchTerm;
    const startsWithMatch = searchValue.startsWith(searchTerm);
    
    return {
      passed: true,
      rank: exactMatch ? 3 : startsWithMatch ? 2 : 1,
    };
  }
  
  return { passed: false, rank: 0 };
}

// Get domain from URL
const getDomain = (url: string) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
};

export function CitationsTable({ citations, webSearchResults, onExport, searchQueryFilter, promptSet }: CitationsTableProps) {
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Get prompt text based on type and index
  const getPromptText = (promptType?: string, promptIndex?: number): string | null => {
    if (!promptSet || promptType === undefined || promptIndex === undefined) {
      return null;
    }

    // Map old prompt types to new ones for backward compatibility
    const promptTypeMap: Record<string, string[]> = {
      // New names
      visibility: promptSet.visibility || [],
      sentiment: promptSet.sentiment || [],
      alignment: promptSet.alignment || [],
      competition: promptSet.competition || [],
      // Old names for backward compatibility
      spontaneous: promptSet.visibility || [],
      direct: promptSet.sentiment || [],
      accuracy: promptSet.alignment || [],
      brandBattle: promptSet.competition || [],
    };

    const prompts = promptTypeMap[promptType];
    if (prompts && promptIndex >= 0 && promptIndex < prompts.length) {
      return prompts[promptIndex];
    }

    return null;
  };

  // Transform citations data for table with grouping
  const { data, groupedData } = React.useMemo(() => {
    const rows: CitationRow[] = [];
    const groups = new Map<string, CitationRow[]>();
    let idCounter = 0;

    // Use new structure if available, otherwise fall back to old structure
    if (webSearchResults && webSearchResults.length > 0) {
      // New structure: process webSearchResults
      webSearchResults.forEach((searchResult) => {
        const query = searchResult.query;
        
        searchResult.citations.forEach((citation) => {
          const row: CitationRow = {
            id: `${idCounter++}`,
            searchQuery: query,
            source: citation.website,
            link: citation.link || null,
            model: citation.model,
            promptType: citation.promptType,
            promptText: getPromptText(citation.promptType, citation.promptIndex),
            domain: citation.link ? getDomain(citation.link) : "No link",
          };
          
          rows.push(row);
          
          if (!groups.has(query)) {
            groups.set(query, []);
          }
          groups.get(query)!.push(row);
        });
      });
    } else if (citations) {
      // Fallback to old structure
      citations.forEach((citation) => {
        if (citation.webSearchQueries && citation.webSearchQueries.length > 0) {
          citation.webSearchQueries.forEach((queryObj) => {
            const query = queryObj.query;
            const row: CitationRow = {
              id: `${idCounter++}`,
              searchQuery: query,
              source: citation.website,
              link: citation.link || null,
              model: citation.model || "Unknown",
              promptType: citation.promptType || "Unknown",
              promptText: citation.promptText || null,
              domain: citation.link ? getDomain(citation.link) : "No link",
            };
            
            rows.push(row);
            
            if (!groups.has(query)) {
              groups.set(query, []);
            }
            groups.get(query)!.push(row);
          });
        } else {
          const query = "No search query";
          const row: CitationRow = {
            id: `${idCounter++}`,
            searchQuery: query,
            source: citation.website,
            link: citation.link || null,
            model: citation.model || "Unknown",
            promptType: citation.promptType || "Unknown",
            promptText: citation.promptText || null,
            domain: citation.link ? getDomain(citation.link) : "No link",
          };
          
          rows.push(row);
          
          if (!groups.has(query)) {
            groups.set(query, []);
          }
          groups.get(query)!.push(row);
        }
      });
    }

    return { data: rows, groupedData: groups };
  }, [citations, webSearchResults]);

  // Get unique domains for favicon fetching
  const uniqueDomains = React.useMemo(() => {
    const domains = new Set<string>();
    data.forEach(row => {
      if (row.domain && row.domain !== 'No link') {
        domains.add(row.domain);
      }
    });
    return Array.from(domains);
  }, [data]);

  // Fetch favicons for all domains
  const { favicons } = useFavicons(uniqueDomains);

  // Column definitions
  const columnHelper = createColumnHelper<CitationRow>();

  const columns = React.useMemo<ColumnDef<CitationRow, any>[]>(
    () => [
      columnHelper.accessor("searchQuery", {
        header: ({ column }) => (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
            >
              Search Queries
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
            <Input
              placeholder="Filter queries..."
              value={(column.getFilterValue() as string) ?? ""}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        ),
        cell: ({ getValue }) => {
          const query = getValue() as string;
          return (
            <div className="flex items-start gap-2">
              <Search className="h-3 w-3 mt-1 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 break-words">
                  {query === "No search query" ? (
                    <span className="italic text-gray-400">{query}</span>
                  ) : (
                    query
                  )}
                </p>
              </div>
            </div>
          );
        },
        filterFn: fuzzyFilter,
        enableSorting: true,
        enableColumnFilter: true,
      }),

      columnHelper.accessor("source", {
        header: ({ column }) => (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
            >
              Source
              {column.getIsSorted() === "asc" ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
            <Input
              placeholder="Filter sources..."
              value={(column.getFilterValue() as string) ?? ""}
              onChange={(e) => column.setFilterValue(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
        ),
        cell: ({ row }) => {
          const source = row.original.source;
          const domain = row.original.domain;
          const faviconUrl = domain !== "No link" ? favicons[domain] : null;
          
          return (
            <div className="flex items-center gap-2 min-w-0">
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt={`${domain} favicon`}
                  className="w-4 h-4 rounded-sm flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-medium text-gray-900 truncate cursor-default">
                      {source}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs break-all">{source}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
        filterFn: fuzzyFilter,
        enableSorting: true,
        enableColumnFilter: true,
      }),

      columnHelper.accessor("domain", {
        header: ({ column }) => {
          const sortedUniqueValues = React.useMemo(
            () => Array.from(column.getFacetedUniqueValues().keys()).sort(),
            [column.getFacetedUniqueValues()]
          );

          return (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
              >
                Link
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
              <MultiSelectFilter
                title="Domain"
                options={sortedUniqueValues}
                selectedValues={(column.getFilterValue() as string[]) || []}
                onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
                placeholder={`Filter domains... (${column.getFacetedUniqueValues().size})`}
              />
            </div>
          );
        },
        cell: ({ row }) => {
          const link = row.original.link;
          const domain = row.original.domain;
          
          return domain === "No link" ? (
            <span className="text-sm text-gray-400 italic">No link</span>
          ) : (
            <a
              href={link || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              <span className="text-sm">{domain}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        },
        filterFn: multiSelectFilter,
        enableSorting: true,
        enableColumnFilter: true,
      }),

      columnHelper.accessor("model", {
        header: ({ column }) => {
          const sortedUniqueValues = React.useMemo(
            () => Array.from(column.getFacetedUniqueValues().keys()).sort(),
            [column.getFacetedUniqueValues()]
          );

          return (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
              >
                Model
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
              <MultiSelectFilter
                title="Model"
                options={sortedUniqueValues}
                selectedValues={(column.getFilterValue() as string[]) || []}
                onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
                placeholder={`Filter models... (${column.getFacetedUniqueValues().size})`}
              />
            </div>
          );
        },
        cell: ({ getValue }) => {
          const modelId = getValue() as string;
          const friendlyName = getModelFriendlyName(modelId);
          return (
            <span className="text-sm text-gray-900">{friendlyName}</span>
          );
        },
        filterFn: multiSelectFilter,
        enableSorting: true,
        enableColumnFilter: true,
      }),

      columnHelper.accessor("promptType", {
        header: ({ column }) => {
          const sortedUniqueValues = React.useMemo(
            () => Array.from(column.getFacetedUniqueValues().keys()).sort(),
            [column.getFacetedUniqueValues()]
          );

          return (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
              >
                Prompt Category
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
              <MultiSelectFilter
                title="Prompt Category"
                options={sortedUniqueValues}
                selectedValues={(column.getFilterValue() as string[]) || []}
                onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
                placeholder={`Filter categories... (${column.getFacetedUniqueValues().size})`}
              />
            </div>
          );
        },
        cell: ({ getValue }) => {
          const promptType = getValue() as string;
          return (
            <Badge variant="outline" className="text-xs">
              {getPromptTypeFriendlyName(promptType)}
            </Badge>
          );
        },
        filterFn: multiSelectFilter,
        enableSorting: true,
        enableColumnFilter: true,
      }),

      columnHelper.accessor("promptText", {
        header: ({ column }) => {
          const sortedUniqueValues = React.useMemo(
            () => Array.from(column.getFacetedUniqueValues().keys())
              .filter(value => value !== null)
              .sort(),
            [column.getFacetedUniqueValues()]
          );

          return (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="h-auto p-0 font-semibold text-gray-700 hover:text-gray-900"
              >
                Prompt Detail
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="ml-2 h-4 w-4" />
                ) : (
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                )}
              </Button>
              <MultiSelectFilter
                title="Prompt Detail"
                options={sortedUniqueValues}
                selectedValues={(column.getFilterValue() as string[]) || []}
                onSelectionChange={(values) => column.setFilterValue(values.length > 0 ? values : undefined)}
                placeholder={`Filter prompts... (${column.getFacetedUniqueValues().size})`}
              />
            </div>
          );
        },
        cell: ({ getValue }) => {
          const promptText = getValue() as string | null;
          return (
            <div className="max-w-xs">
              {promptText ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-gray-700 cursor-help line-clamp-2 overflow-hidden">
                        {promptText}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-md">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {promptText}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="text-sm text-gray-400 italic">N/A</span>
              )}
            </div>
          );
        },
        filterFn: multiSelectFilter,
        enableSorting: true,
        enableColumnFilter: true,
      }),
    ],
    []
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
        pageSize: 50,
      },
    },
  });

  // Apply search query filter effect
  React.useEffect(() => {
    if (searchQueryFilter) {
      const searchQueryColumn = table.getColumn("searchQuery");
      if (searchQueryColumn) {
        searchQueryColumn.setFilterValue(searchQueryFilter);
      }
    }
  }, [searchQueryFilter, table]);

  return (
    <div className="space-y-4">
      {/* Header with search and export */}
      <div className="flex items-center justify-between">
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
        <Button
          onClick={onExport}
          variant="outline"
          size="sm"
          disabled={data.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export All to CSV
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full min-w-[1200px] border-collapse table-fixed">
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[10%]" />
            <col className="w-[15%]" />
            <col className="w-[25%]" />
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
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-start gap-2">
                      <Search className="h-3 w-3 mt-1 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 break-words">
                          {row.original.searchQuery === "No search query" ? (
                            <span className="italic text-gray-400">{row.original.searchQuery}</span>
                          ) : (
                            row.original.searchQuery
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center gap-2 min-w-0">
                      {row.original.domain !== "No link" && favicons[row.original.domain] ? (
                        <img
                          src={favicons[row.original.domain] || undefined}
                          alt={`${row.original.domain} favicon`}
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium text-gray-900 truncate cursor-default">
                              {row.original.source}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs break-all">{row.original.source}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200">
                    {row.original.domain === "No link" ? (
                      <span className="text-sm text-gray-400 italic">No link</span>
                    ) : (
                      <a
                        href={row.original.link || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors duration-200"
                      >
                        <span className="text-sm">{row.original.domain}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200">
                    <span className="text-sm text-gray-900">{getModelFriendlyName(row.original.model)}</span>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200">
                    <Badge variant="outline" className="text-xs">
                      {getPromptTypeFriendlyName(row.original.promptType)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200">
                    <div className="max-w-xs">
                      {row.original.promptText ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-sm text-gray-700 cursor-help line-clamp-2 overflow-hidden">
                                {row.original.promptText}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-md">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {row.original.promptText}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-sm text-gray-400 italic">N/A</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Database className="h-8 w-8 text-gray-300" />
                    <p className="text-sm">No citations match your filters</p>
                    <p className="text-xs text-gray-400">Try adjusting your search criteria</p>
                  </div>
                </td>
              </tr>
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
              {[25, 50, 100, 200].map((pageSize) => (
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
}