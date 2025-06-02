import { Project } from '../../project/entities/project.entity';

export class User {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  stripeCustomerId?: string;
  stripePlanId?: string;
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
    maxSpontaneousPrompts?: number;
    maxUrls: number;
  };
  selectedModels: string[];
  projects?: Project[];
  createdAt: Date;
  updatedAt: Date;
}