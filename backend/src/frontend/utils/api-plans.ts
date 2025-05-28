import { PlanResponseDto } from './types';
import authApi from './auth';

export async function getPlans(includeInactive = false): Promise<PlanResponseDto[]> {
  const response = await authApi.get(`/plans?includeInactive=${includeInactive}`);
  return response.data;
}

export async function getPlan(id: string): Promise<PlanResponseDto> {
  const response = await authApi.get(`/plans/${id}`);
  return response.data;
}

export async function createPlan(plan: Omit<PlanResponseDto, 'id' | 'createdAt' | 'updatedAt' | 'prices'>): Promise<PlanResponseDto> {
  const response = await authApi.post('/plans', plan);
  return response.data;
}

export async function updatePlan(id: string, plan: Partial<PlanResponseDto>): Promise<PlanResponseDto> {
  const response = await authApi.patch(`/plans/${id}`, plan);
  return response.data;
}

export async function deletePlan(id: string): Promise<void> {
  await authApi.delete(`/plans/${id}`);
}

export async function getStripeProducts(): Promise<any[]> {
  const response = await authApi.get('/plans/stripe-products');
  return response.data;
}

export async function getPublicPlans(): Promise<PlanResponseDto[]> {
  const response = await fetch('/api/public/plans');

  if (!response.ok) {
    throw new Error('Failed to fetch public plans');
  }

  return response.json();
}