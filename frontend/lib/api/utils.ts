/**
 * API Utility Functions
 */

import { API_BASE_URL } from './constants';

export interface FetchOptions extends RequestInit {
  token?: string;
}

/**
 * Generic fetch wrapper with error handling
 */
export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, headers = {}, ...restOptions } = options;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log('API Request:', {
    url,
    method: restOptions.method || 'GET',
    hasToken: !!token,
    headers: defaultHeaders
  });

  const response = await fetch(url, {
    ...restOptions,
    headers: defaultHeaders,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: 'Request failed' }));
    
    // Handle specific error codes
    if (error.code === 'PROJECT_LIMIT_EXCEEDED') {
      const customError = new Error(error.message);
      (customError as any).response = { data: error };
      throw customError;
    }
    
    throw new Error(error.message || 'Request failed');
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Build query string from object
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}