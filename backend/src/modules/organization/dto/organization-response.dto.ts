export class OrganizationResponseDto {
  id: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: string;
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
    maxSpontaneousPrompts: number;
    maxUrls: number;
    maxUsers: number;
    maxCompetitors: number;
  };
  selectedModels: string[];
  createdAt: string;
  updatedAt: string;
  currentUsers?: number;
  currentProjects?: number;
}