import express, { RequestHandler } from 'express';
import { ProductController } from './product.controller';
import {
  createProductSchema,
  listProductQuerySchema,
  updateProductSchema,
  updateProductStatusSchema,
  validatePricesSchema,
} from './product.schema';
import { validateZod } from '../../middlewares/validate.middleware';
import { asyncHandler, requireAuth, requireRole } from '@teleshop/common';

const router = express.Router();

const requireAuthMw = requireAuth as unknown as RequestHandler;
const requireSellerMw = requireRole(['ADMIN', 'SELLER']) as unknown as RequestHandler;

router.get(
  '/',
  validateZod(listProductQuerySchema),
  asyncHandler(ProductController.getProducts as any),
);

router.post(
  '/validate-prices',
  validateZod(validatePricesSchema),
  asyncHandler(ProductController.validatePrices as any),
);

router.use(requireAuthMw);
router.use(requireSellerMw);

router.get('/seller/me', asyncHandler(ProductController.getMyProducts as any));

router.post(
  '/',
  validateZod(createProductSchema),
  asyncHandler(ProductController.createProduct as any),
);

router.put(
  '/:id',
  validateZod(updateProductSchema),
  asyncHandler(ProductController.updateProduct as any),
);

router.delete('/:id', asyncHandler(ProductController.archiveProduct as any));

router.patch(
  '/:id/status',
  validateZod(updateProductStatusSchema),
  asyncHandler(ProductController.updateStatus as any),
);

router.get('/:idOrSlug', asyncHandler(ProductController.getProduct as any));

export { router as productRouter };
