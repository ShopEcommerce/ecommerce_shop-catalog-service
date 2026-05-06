import express, { RequestHandler } from 'express';
import { ProductController } from './product.controller';
import { createProductSchema, updateProductSchema, listProductQuerySchema } from './product.schema';
import { validateZod } from '../../middlewares/validate.middleware'; // Đảm bảo đường dẫn đúng
import { asyncHandler, requireAuth, requireRole } from '@teleshop/common';

const router = express.Router();

const requireAuthMw = requireAuth as unknown as RequestHandler;
const requireSellerMw = requireRole(['ADMIN', 'SELLER']) as unknown as RequestHandler;


// PUBLIC ROUTES 

// GET /api/catalog/products?page=1&limit=10&search=ao-thun
router.get(
  '/',
  validateZod(listProductQuerySchema),
  asyncHandler(ProductController.getProducts as any)
);

// GET /api/catalog/products/:idOrSlug
router.get(
  '/:idOrSlug',
  asyncHandler(ProductController.getProduct as any)
);


// PROTECTED ROUTES 

router.use(requireAuthMw);
router.use(requireSellerMw);

router.post(
  '/',
  validateZod(createProductSchema),
  asyncHandler(ProductController.createProduct as any)
);

router.put(
  '/:id',
  validateZod(updateProductSchema),
  asyncHandler(ProductController.updateProduct as any)
);

router.delete(
  '/:id',
  asyncHandler(ProductController.archiveProduct as any)
);

export { router as productRouter };