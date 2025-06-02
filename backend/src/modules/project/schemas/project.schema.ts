import { z } from 'zod';

export const ProjectZodSchema = z.object({
  companyId: z.string().uuid().optional(),
  brandName: z.string(),
  website: z.string().url(),
  industry: z.string(),
  shortDescription: z.string(),
  fullDescription: z.string(),
  keyBrandAttributes: z.array(z.string()),
  competitors: z.array(z.string()),
  language: z.string(),
  updatedAt: z.date().optional(),
});

export type ProjectInput = z.infer<typeof ProjectZodSchema>;

export const CreateProjectInputSchema = z
  .object({
    url: z.string().url().optional(),
    data: z
      .object({
        brandName: z.string().optional(),
        website: z.string().url().optional(),
        industry: z.string().optional(),
        shortDescription: z.string().optional(),
        fullDescription: z.string().optional(),
        keyBrandAttributes: z.array(z.string()).optional(),
        competitors: z.array(z.string()).optional(),
        language: z.string().optional(),
      })
      .optional(),
  })
  .refine((data) => data.url || data.data, {
    message: 'Either url or data must be provided',
    path: ['url', 'data'],
  });

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
