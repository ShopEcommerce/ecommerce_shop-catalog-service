import express, { RequestHandler } from 'express';
import { CategoryController } from './category.controller';
import { createCategorySchema, updateCategorySchema } from './category.schema';
import { validateZod } from '../../middlewares/validate.middleware';
import { asyncHandler, requireAuth, requireRole } from '@teleshop/common';

const router = express.Router();

const requireAuthMw = requireAuth as unknown as RequestHandler;
const requireAdminMw = requireRole(['ADMIN']) as unknown as RequestHandler;

// --- PUBLIC ROUTES ---
router.get('/', asyncHandler(CategoryController.getCategories as any));
router.get('/:id', asyncHandler(CategoryController.getCategoryById as any));

// --- ADMIN ROUTES ---
router.use(requireAuthMw);
router.use(requireAdminMw);

router.post(
  '/',
  validateZod(createCategorySchema),
  asyncHandler(CategoryController.createCategory as any),
);

router.put(
  '/:id',
  validateZod(updateCategorySchema),
  asyncHandler(CategoryController.updateCategory as any),
);

router.delete('/:id', asyncHandler(CategoryController.deleteCategory as any));

export { router as categoryRouter };
