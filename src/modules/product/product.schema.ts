import { z } from 'zod';

export const variantPayload = z.object({
  sku: z.string({ error: 'SKU is required' }).min(3, 'SKU is too short'),
  attributes: z.record(z.string(), z.unknown()).optional(),
  price: z.number({ error: 'Price is required' }).positive('Price must be a positive number'),
  stock: z.number().int().nonnegative('Stock cannot be negative').default(0),
  imageUrl: z.string().url('Invalid image URL').optional(),
});

export const updateVariantPayload = variantPayload.extend({
  id: z.string().uuid('Invalid variant ID').optional(),
});

export const productBasePayload = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters long'),
  slug: z.string().min(3).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().min(10, 'Description is too short').optional(),
  brand: z.string().optional(),
  mainImage: z.string().url('Invalid main image URL').optional(),
  categoryId: z.string().uuid('Invalid category ID'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED']).default('DRAFT'),
});


export const createProductSchema = z.object({
  body: productBasePayload.extend({
    variants: z.array(variantPayload).min(1, 'Product must have at least 1 variant'),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid product ID'),
  }),
  body: productBasePayload.partial().extend({
    variants: z.array(updateVariantPayload).optional(),
  }).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update"
  }),
});

export const listProductQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    search: z.string().optional(),
    categoryId: z.string().uuid().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    sortBy: z.enum(['createdAt', 'price', 'name']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export type CreateProductInput = z.infer<typeof createProductSchema>['body'];
export type UpdateProductInput = z.infer<typeof updateProductSchema>['body'];
export type ListProductQuery = z.infer<typeof listProductQuerySchema>['query'];