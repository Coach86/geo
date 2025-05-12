import { z } from 'zod';

export const PromptSetSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  spontaneous: z.array(z.string().min(1)),
  direct: z.array(z.string().min(1)),
  comparison: z.array(z.string().min(1)),
  updatedAt: z.date().optional(),
  createdAt: z.date().optional(),
});

export type PromptSetInput = z.infer<typeof PromptSetSchema>;