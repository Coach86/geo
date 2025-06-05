export class Organization {
  id: string;
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
}