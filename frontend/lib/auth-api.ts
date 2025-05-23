/**
 * Authentication API utilities for frontend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface CreateUserRequest {
  email: string;
  language?: string;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  companyIds: string[];
}

export interface GenerateTokenRequest {
  userId: string;
}

export interface GenerateTokenResponse {
  success: boolean;
  message: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  userId?: string;
}

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkResponse {
  success: boolean;
  message: string;
  userId: string;
}

export interface CreateIdentityCardRequest {
  url: string;
  market: string;
  language?: string;
}

export interface IdentityCardResponse {
  id: string;
  brandName: string;
  website: string;
  url: string;
  industry: string;
  market: string;
  language?: string;
  shortDescription: string;
  fullDescription: string;
  longDescription: string;
  keyBrandAttributes: string[];
  competitors: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  userEmail: string;
  userLanguage?: string;
}

/**
 * Create a new user
 */
export async function createUser(email: string, language = 'en'): Promise<CreateUserResponse> {
  const response = await fetch(`${API_BASE_URL}/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, language }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create user' }));
    throw new Error(error.message || 'Failed to create user');
  }

  return response.json();
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<CreateUserResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/email/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return null; // User not found
    }

    if (!response.ok) {
      throw new Error('Failed to find user');
    }

    return response.json();
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

/**
 * Generate a token for a user and send magic link email
 */
export async function generateTokenAndSendEmail(userId: string): Promise<GenerateTokenResponse> {
  const response = await fetch(`${API_BASE_URL}/tokens/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to generate token' }));
    throw new Error(error.message || 'Failed to generate token');
  }

  return response.json();
}

/**
 * Validate a token
 */
export async function validateToken(token: string): Promise<ValidateTokenResponse> {
  const response = await fetch(`${API_BASE_URL}/tokens/validate?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to validate token' }));
    throw new Error(error.message || 'Failed to validate token');
  }

  return response.json();
}

/**
 * Send magic link using the new dedicated auth endpoint
 */
export async function sendMagicLink(email: string): Promise<MagicLinkResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to send magic link' }));
      throw new Error(error.message || 'Failed to send magic link');
    }

    return response.json();
  } catch (error) {
    console.error('Magic link error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to send magic link');
  }
}

/**
 * Analyze website from URL without saving (requires token authentication)
 */
export async function analyzeWebsite(
  request: CreateIdentityCardRequest,
  token: string
): Promise<IdentityCardResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/identity-card/analyze-from-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to analyze website' }));
      throw new Error(error.message || 'Failed to analyze website');
    }

    return response.json();
  } catch (error) {
    console.error('Website analysis error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze website');
  }
}

export interface CreateFullIdentityCardRequest {
  url: string;
  brandName: string;
  description?: string;
  industry?: string;
  market: string;
  language?: string;
  keyBrandAttributes?: string[];
  competitors?: string[];
}

/**
 * Create and save identity card (requires token authentication)
 */
export async function createIdentityCard(
  request: CreateFullIdentityCardRequest,
  token: string
): Promise<IdentityCardResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/identity-card/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create identity card' }));
      throw new Error(error.message || 'Failed to create identity card');
    }

    return response.json();
  } catch (error) {
    console.error('Identity card creation error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create identity card');
  }
}

export interface GeneratePromptsRequest {
  brandName: string;
  website: string;
  industry: string;
  market: string;
  language?: string;
  keyBrandAttributes: string[];
  competitors: string[];
  shortDescription?: string;
  fullDescription?: string;
}

export interface GeneratePromptsResponse {
  spontaneous: string[];
  direct: string[];
  comparison: string[];
  accuracy: string[];
  brandBattle: string[];
}

/**
 * Generate prompts for brand analysis (requires token authentication)
 */
export async function generatePrompts(
  request: GeneratePromptsRequest,
  token: string
): Promise<GeneratePromptsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/prompts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to generate prompts' }));
      throw new Error(error.message || 'Failed to generate prompts');
    }

    return response.json();
  } catch (error) {
    console.error('Prompt generation error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to generate prompts');
  }
}

export interface UpdatePhoneRequest {
  phoneNumber: string;
}

export interface UpdatePhoneResponse {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
  companyIds?: string[];
}

/**
 * Update user phone number (requires token authentication)
 */
export async function updatePhoneNumber(
  request: UpdatePhoneRequest,
  token: string
): Promise<UpdatePhoneResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/user/profile/phone`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to update phone number' }));
      throw new Error(error.message || 'Failed to update phone number');
    }

    return response.json();
  } catch (error) {
    console.error('Phone number update error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update phone number');
  }
}