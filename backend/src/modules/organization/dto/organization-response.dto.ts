export class OrganizationResponseDto {
  id: string;
  name: string;
  shopifyShopDomain?: string;
  shopifyAccessToken?: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: string;
  subscriptionCancelAt?: string;
  planSettings: {
    _id?: string;
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
  projects?: Array<{ id: string; brandName: string }>;
  
  // Trial-related fields
  trialStartDate?: string;
  trialEndDate?: string;
  isOnTrial?: boolean;
  trialPlanId?: string;

  // Promo code tracking
  promoCode?: string;

  // Free plan activation tracking
  hasActivatedFreePlan?: boolean;
  freePlanActivatedAt?: string;
}