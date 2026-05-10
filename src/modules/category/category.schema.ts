import { z } from 'zod';

export const categoryPayload = z.object({
  name: z
    .string({ error: 'Category name is required' })
    .min(2, 'Name must be at least 2 characters long'),
  slug: z
    .string({ error: 'Slug is required' })
    .min(2)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must contain only lowercase letters, numbers, and hyphens (e.g., electronic-devices)',
    ),
  description: z.string().max(500, 'Description must be at most 500 characters long').optional(),
  parentId: z.string().uuid('Invalid parent category ID').optional(),
  thumbnailUrl: z.string().url('Invalid image URL').optional(),
});

export const createCategorySchema = z.object({
  body: categoryPayload,
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID'),
  }),
  body: categoryPayload.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];
