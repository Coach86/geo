export class OrganizationResponseDto {
  id: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
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