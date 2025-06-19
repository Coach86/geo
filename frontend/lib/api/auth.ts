/**
 * Authentication API
 */

import { API_ENDPOINTS } from './constants';
import { apiFetch, buildQueryString } from './utils';
import {
  GenerateTokenRequest,
  GenerateTokenResponse,
  ValidateTokenResponse,
  MagicLinkRequest,
  MagicLinkResponse,
} from './types';

/**
 * Generate a token for a user and send magic link email
 */
export async function generateTokenAndSendEmail(
  userId: string
): Promise<GenerateTokenResponse> {
  return apiFetch<GenerateTokenResponse>(API_ENDPOINTS.TOKENS.GENERATE, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

/**
 * Validate a token
 */
export async function validateToken(
  token: string
): Promise<ValidateTokenResponse> {
  const queryString = buildQueryString({ token });
  return apiFetch<ValidateTokenResponse>(
    `${API_ENDPOINTS.TOKENS.VALIDATE}${queryString}`,
    {
      method: 'GET',
    }
  );
}

/**
 * Send magic link using the new dedicated auth endpoint
 */
export async function sendMagicLink(email: string, promoCode?: string): Promise<MagicLinkResponse> {
  try {
    const body: any = { email };
    if (promoCode) {
      body.promoCode = promoCode;
    }
    
    return await apiFetch<MagicLinkResponse>(API_ENDPOINTS.AUTH.MAGIC_LINK, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Magic link error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to send magic link'
    );
  }
}