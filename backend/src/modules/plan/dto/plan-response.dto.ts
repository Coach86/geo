export class PlanPriceDto {
  monthly: number;
  yearly: number;
  currency: string;
}

export class PlanResponseDto {
  id: string;
  name: string;
  tag: string;
  subtitle: string;
  included: string[];
  stripeProductId: string;
  maxModels: number;
  maxProjects: number;
  maxUrls: number;
  maxUsers: number;
  maxSpontaneousPrompts: number;
  maxCompetitors: number;
  isActive: boolean;
  isRecommended: boolean;
  isMostPopular: boolean;
  order: number;
  metadata: Record<string, any>;
  prices?: PlanPriceDto;
  refreshFrequency: string;
  shopifyMonthlyPrice?: number;
  shopifyAnnualPrice?: number;
  shopifyTrialDays?: number;
  createdAt: string;
  updatedAt: string;
}
