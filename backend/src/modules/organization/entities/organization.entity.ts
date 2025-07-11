export class Organization {
  id: string;
  name: string;
  shopifyShopDomain?: string;
  shopifyAccessToken?: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: Date;
  subscriptionCancelAt?: Date;
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
  createdAt: Date;
  updatedAt: Date;
  
  // Trial-related fields
  trialStartDate?: Date;
  trialEndDate?: Date;
  isOnTrial?: boolean;
  trialPlanId?: string;

  // Promo code tracking
  promoCode?: string;

  // Free plan activation tracking
  hasActivatedFreePlan?: boolean;
  freePlanActivatedAt?: Date;
}