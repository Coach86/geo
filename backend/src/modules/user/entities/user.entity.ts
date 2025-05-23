import { CompanyIdentityCard } from '../../identity-card/entities/company-identity-card.entity';

export class User {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  companies?: CompanyIdentityCard[];
  createdAt: Date;
  updatedAt: Date;
}