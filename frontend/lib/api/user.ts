/**
 * User API
 */

import { API_ENDPOINTS } from './constants';
import { apiFetch } from './utils';
import {
  CreateUserRequest,
  CreateUserResponse,
  UserProfile,
  UpdatePhoneRequest,
  UpdatePhoneResponse,
  UpdateEmailRequest,
  UpdateEmailResponse,
} from './types';

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  language = 'en'
): Promise<CreateUserResponse> {
  return apiFetch<CreateUserResponse>(API_ENDPOINTS.USER.BASE, {
    method: 'POST',
    body: JSON.stringify({ email, language }),
  });
}

/**
 * Find user by email
 */
export async function findUserByEmail(
  email: string
): Promise<CreateUserResponse | null> {
  try {
    return await apiFetch<CreateUserResponse>(
      API_ENDPOINTS.USER.BY_EMAIL(email),
      {
        method: 'GET',
      }
    );
  } catch (error: any) {
    // Handle 404 as user not found
    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      return null;
    }
    console.error('Error finding user by email:', error);
    return null;
  }
}

/**
 * Get user profile (requires token authentication)
 */
export async function getUserProfile(token: string): Promise<UserProfile> {
  try {
    return await apiFetch<UserProfile>(API_ENDPOINTS.USER.PROFILE, {
      method: 'GET',
      token,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get user profile'
    );
  }
}

/**
 * Update user phone number (requires token authentication)
 */
export async function updatePhoneNumber(
  request: UpdatePhoneRequest,
  token: string
): Promise<UpdatePhoneResponse> {
  try {
    return await apiFetch<UpdatePhoneResponse>(
      API_ENDPOINTS.USER.PROFILE_PHONE,
      {
        method: 'PATCH',
        body: JSON.stringify(request),
        token,
      }
    );
  } catch (error) {
    console.error('Phone number update error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to update phone number'
    );
  }
}

/**
 * Update user email (requires token authentication)
 */
export async function updateEmail(
  request: UpdateEmailRequest,
  token: string
): Promise<UpdateEmailResponse> {
  try {
    return await apiFetch<UpdateEmailResponse>(
      API_ENDPOINTS.USER.PROFILE_EMAIL,
      {
        method: 'PATCH',
        body: JSON.stringify(request),
        token,
      }
    );
  } catch (error) {
    console.error('Email update error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to update email'
    );
  }
}