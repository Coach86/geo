import axios from 'axios';
import { PaginationParams, PaginatedResponse } from './api';

const API_URL = '/api/admin';

// Get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('auth_token');
  return token;
};

// Create axios instance with auth headers
const createAuthAxios = () => {
  const token = getAuthToken();
  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  // Intercept 401 responses and redirect to login
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        // Clear token and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('admin_data');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    },
  );

  return instance;
};

// Organization endpoints
export const getAllOrganizations = async (params?: PaginationParams & { includeProjects?: boolean }) => {
  const api = createAuthAxios();
  const response = await api.get('/organizations', { params });
  return response.data as PaginatedResponse<any>;
};

export const getOrganization = async (id: string) => {
  const api = createAuthAxios();
  const response = await api.get(`/organizations/${id}`);
  return response.data;
};

export const updateOrganization = async (id: string, data: { name?: string; stripePlanId?: string }) => {
  const api = createAuthAxios();
  const response = await api.patch(`/organizations/${id}`, data);
  return response.data;
};

export const getOrganizationUsers = async (organizationId: string) => {
  const api = createAuthAxios();
  const response = await api.get(`/users?organizationId=${organizationId}`);
  return response.data;
};

export const createOrganizationUser = async (userData: { email: string; language: string; phoneNumber?: string; organizationId: string }) => {
  const api = createAuthAxios();
  const response = await api.post('/users', userData);
  return response.data;
};

export const updateOrganizationUser = async (userId: string, userData: { email?: string; language?: string; phoneNumber?: string }) => {
  const api = createAuthAxios();
  const response = await api.patch(`/users/${userId}`, userData);
  return response.data;
};

export const deleteOrganizationUser = async (userId: string) => {
  const api = createAuthAxios();
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

export const updateOrganizationPlanSettings = async (organizationId: string, planSettings: {
  maxProjects?: number;
  maxAIModels?: number;
  maxSpontaneousPrompts?: number;
  maxUrls?: number;
  maxUsers?: number;
  maxCompetitors?: number;
}) => {
  const api = createAuthAxios();
  const response = await api.patch(`/organizations/${organizationId}/plan-settings`, planSettings);
  return response.data;
};

export const getOrganizationModels = async () => {
  const api = createAuthAxios();
  // Get all available models from config
  const configResponse = await api.get('/config');
  const llmModels = configResponse.data.llmModels || [];
  
  // Transform to the expected format
  return {
    models: llmModels.map((model: any) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      enabled: model.enabled !== false // Default to true if not specified
    }))
  };
};

export const updateOrganizationModels = async (organizationId: string, selectedModels: string[]) => {
  const api = createAuthAxios();
  const response = await api.patch(`/organizations/${organizationId}/selected-models`, { selectedModels });
  return response.data;
};

export const deleteOrganization = async (organizationId: string) => {
  const api = createAuthAxios();
  const response = await api.delete(`/organizations/${organizationId}`);
  return response.data;
};