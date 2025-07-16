import { apiFetch } from './api/utils';

export class AuthClient {
  private static getToken(): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  }

  private static getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Make an authenticated API request
   */
  public static async request<T>(
    url: string,
    options?: RequestInit
  ): Promise<T> {
    const authHeaders = this.getAuthHeaders();
    
    return apiFetch<T>(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
    });
  }

  /**
   * Make an authenticated GET request
   */
  public static async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * Make an authenticated POST request
   */
  public static async post<T>(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  /**
   * Make an authenticated PUT request
   */
  public static async put<T>(
    url: string,
    body?: any,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  /**
   * Make an authenticated DELETE request
   */
  public static async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' });
  }

  /**
   * Check if user is authenticated
   */
  public static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Get the current token (for debugging or special cases)
   */
  public static getAuthToken(): string | null {
    return this.getToken();
  }
}