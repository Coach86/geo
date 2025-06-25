/**
 * Main API export file
 * Re-exports all API functions and types for easy importing
 */

// Export all types
export * from './types';

// Export constants
export { API_BASE_URL, API_ENDPOINTS } from './constants';

// Export auth functions
export {
  generateTokenAndSendEmail,
  validateToken,
  sendMagicLink,
  activateFreePlan,
  getPromoInfo,
} from './auth';

// Export user functions
export {
  createUser,
  findUserByEmail,
  getUserProfile,
  updatePhoneNumber,
  updateEmail,
} from './user';

// Export project functions
export {
  analyzeWebsite,
  createProject,
  createProjectFromUrl,
  getUserProjects,
  getUserUrlUsage,
  getProjectById,
  updateProject,
  generatePrompts,
  getPromptSet,
  updatePromptSet,
  regeneratePromptType,
  runManualAnalysis,
} from './project';

// Export report functions
export {
  getProjectReports,
  getBatchResults,
  getReportExplorer,
  getReportVisibility,
  getReportSentiment,
  getReportAlignment,
  getReportCompetition,
} from './report';

// Export organization functions and types
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
} from './organization';

// Export config functions
export {
  getModelsConfig,
  type ModelConfig,
  type ModelsResponse,
} from './config';

// Export utils if needed
export { apiFetch, buildQueryString } from './utils';