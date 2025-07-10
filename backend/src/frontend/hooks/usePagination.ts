import { useState, useCallback, useMemo } from 'react';

interface PaginationState {
  page: number;
  limit: number;
  search: string;
}

interface UsePaginationReturn {
  page: number;
  limit: number;
  search: string;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSearch: (search: string) => void;
  reset: () => void;
  queryParams: Record<string, any>;
}

export const usePagination = (
  initialPage = 1,
  initialLimit = 20,
  initialSearch = ''
): UsePaginationReturn => {
  const [state, setState] = useState<PaginationState>({
    page: initialPage,
    limit: initialLimit,
    search: initialSearch,
  });

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setState((prev) => ({ ...prev, limit, page: 1 })); // Reset to page 1 when changing limit
  }, []);

  const setSearch = useCallback((search: string) => {
    setState((prev) => ({ ...prev, search, page: 1 })); // Reset to page 1 when searching
  }, []);

  const reset = useCallback(() => {
    setState({
      page: initialPage,
      limit: initialLimit,
      search: initialSearch,
    });
  }, [initialPage, initialLimit, initialSearch]);

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      page: state.page,
      limit: state.limit,
    };
    if (state.search) {
      params.search = state.search;
    }
    return params;
  }, [state]);

  return {
    page: state.page,
    limit: state.limit,
    search: state.search,
    setPage,
    setLimit,
    setSearch,
    reset,
    queryParams,
  };
};