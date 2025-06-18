import { Project } from '../../project/entities/project.entity';

export class User {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  organizationId: string;
  lastConnectionAt?: Date;
  projects?: Project[];
  createdAt: Date;
  updatedAt: Date;
  shopifyShopDomain?: string;
  shopifyShopId?: string;
  authType?: string;
}