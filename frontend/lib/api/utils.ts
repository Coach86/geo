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

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
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

  // Handle empty response body (e.g., DELETE requests that return 200 with no content)
  const contentLength = response.headers.get('content-length');
  const contentType = response.headers.get('content-type');
  
  if (contentLength === '0' || !contentType?.includes('application/json')) {
    return {} as T;
  }

  // Handle empty response body by checking if there's actually content
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse response as JSON:', text);
    return {} as T;
  }
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