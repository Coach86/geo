export class Organization {
  id: string;
  name: string;
  shopifyShopDomain?: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
  subscriptionCurrentPeriodEnd?: Date;
  planSettings: {
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
}