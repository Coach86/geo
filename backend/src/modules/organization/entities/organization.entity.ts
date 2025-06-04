export class Organization {
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
  createdAt: Date;
  updatedAt: Date;
}