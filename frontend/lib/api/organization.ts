/**
 * Organization API
 */

import { API_ENDPOINTS } from './constants';
import { apiFetch } from './utils';

// Organization types
export interface Organization {
  id: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: string;
  subscriptionCancelAt?: string;
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
    maxSpontaneousPrompts: number;
    maxUrls: number;
    maxUsers: number;
  };
  selectedModels: string[];
  createdAt: string;
  updatedAt: string;
  currentUsers?: number;
  currentProjects?: number;
}

export interface OrganizationUser {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  organizationId: string;
  lastConnectionAt?: string;
  createdAt: string;
  updatedAt: string;
  projectIds?: string[];
}

export interface OrganizationModelsResponse {
  selectedModels: string[];
  maxModels: number;
}

/**
 * Get the current user's organization
 */
export async function getMyOrganization(token: string): Promise<Organization> {
  try {
    return await apiFetch<Organization>(API_ENDPOINTS.ORGANIZATION.MY_ORGANIZATION, {
      method: 'GET',
      token,
    });
  } catch (error) {
    console.error('Get organization error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get organization'
    );
  }
}

/**
 * Get all users in the organization
 */
export async function getOrganizationUsers(
  token: string
): Promise<OrganizationUser[]> {
  try {
    return await apiFetch<OrganizationUser[]>(API_ENDPOINTS.ORGANIZATION.USERS, {
      method: 'GET',
      token,
    });
  } catch (error) {
    console.error('Get organization users error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get organization users'
    );
  }
}

/**
 * Add a user to the organization
 */
export async function addUserToOrganization(
  token: string,
  userData: { email: string; language?: string }
): Promise<OrganizationUser> {
  try {
    return await apiFetch<OrganizationUser>(API_ENDPOINTS.ORGANIZATION.USERS, {
      method: 'POST',
      body: JSON.stringify(userData),
      token,
    });
  } catch (error) {
    console.error('Add user to organization error:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to add user to organization'
    );
  }
}

/**
 * Remove a user from the organization
 */
export async function removeUserFromOrganization(
  token: string,
  userId: string
): Promise<void> {
  try {
    await apiFetch<void>(API_ENDPOINTS.ORGANIZATION.USER_BY_ID(userId), {
      method: 'DELETE',
      token,
    });
  } catch (error) {
    console.error('Remove user from organization error:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to remove user from organization'
    );
  }
}

/**
 * Update an organization user's details
 */
export async function updateOrganizationUser(
  token: string,
  userId: string,
  updateData: { email?: string; language?: string; phoneNumber?: string }
): Promise<OrganizationUser> {
  try {
    return await apiFetch<OrganizationUser>(
      API_ENDPOINTS.ORGANIZATION.USER_BY_ID(userId),
      {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        token,
      }
    );
  } catch (error) {
    console.error('Update organization user error:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to update organization user'
    );
  }
}

/**
 * Get organization's selected models
 */
export async function getOrganizationModels(
  token: string
): Promise<OrganizationModelsResponse> {
  try {
    return await apiFetch<OrganizationModelsResponse>(
      API_ENDPOINTS.ORGANIZATION.MODELS,
      {
        method: 'GET',
        token,
      }
    );
  } catch (error) {
    console.error('Get organization models error:', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to get organization models'
    );
  }
}