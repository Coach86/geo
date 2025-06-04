/**
 * Organization API utilities
 * 
 * This file re-exports organization API functions from the new modular structure
 * for backward compatibility
 */

// Re-export organization functions and types from the new API structure
export {
  getMyOrganization,
  getOrganizationUsers,
  addUserToOrganization,
  removeUserFromOrganization,
  updateOrganizationUser,
  getOrganizationModels,
  type Organization,
  type OrganizationUser,
  type OrganizationModelsResponse,
} from './api/organization';