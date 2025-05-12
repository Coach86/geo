import { z } from 'zod';

export const CompanyIdentityCardSchema = z.object({
  companyId: z.string().uuid().optional(),
  brandName: z.string().min(1).max(100),
  website: z.string().url(),
  industry: z.string().min(1).max(100),
  shortDescription: z.string().min(1).max(200),
  fullDescription: z.string().min(1),
  keyFeatures: z.array(z.string().min(1)).min(1),
  competitors: z.array(z.string().min(1)),
  updatedAt: z.date().optional(),
});

export type CompanyIdentityCardInput = z.infer<typeof CompanyIdentityCardSchema>;

export const CreateIdentityCardInputSchema = z.object({
  url: z.string().url().optional(),
  data: z.object({
    brandName: z.string().min(1).max(100).optional(),
    website: z.string().url().optional(),
    industry: z.string().min(1).max(100).optional(),
    shortDescription: z.string().min(1).max(200).optional(),
    fullDescription: z.string().min(1).optional(),
    keyFeatures: z.array(z.string().min(1)).optional(),
    competitors: z.array(z.string().min(1)).optional(),
  }).optional(),
}).refine(
  (data) => data.url || data.data,
  {
    message: 'Either url or data must be provided',
    path: ['url', 'data'],
  }
);

export type CreateIdentityCardInput = z.infer<typeof CreateIdentityCardInputSchema>;