import { Request, Response } from 'express';
import { ProductService } from './product.service';
import { CreateProductInput, UpdateProductInput, ListProductQuery } from './product.schema';

export class ProductController {
  static async createProduct(req: Request<unknown, unknown, CreateProductInput>, res: Response) {
    const sellerId = req.currentUser!.id;
    const correlationId = req.correlationId;

    const product = await ProductService.createProduct(req.body, sellerId, correlationId);
    res.status(201).send({ message: 'Product created successfully', data: product });
  }

  static async updateProduct(
    req: Request<{ id: string }, unknown, UpdateProductInput>,
    res: Response,
  ) {
    const sellerId = req.currentUser!.id;
    const role = req.currentUser!.role;
    const correlationId = req.correlationId;

    const product = await ProductService.updateProduct(
      req.params.id,
      req.body,
      sellerId,
      role,
      correlationId,
    );
    res.status(200).send({ message: 'Product updated successfully', data: product });
  }

  static async getProducts(
    req: Request<unknown, unknown, unknown, ListProductQuery>,
    res: Response,
  ) {
    const result = await ProductService.getProducts(req.query);
    res.status(200).send(result);
  }

  static async getProduct(req: Request<{ idOrSlug: string }>, res: Response) {
    const product = await ProductService.getProductByIdOrSlug(req.params.idOrSlug);
    res.status(200).send({ data: product });
  }

  static async archiveProduct(req: Request<{ id: string }>, res: Response) {
    const sellerId = req.currentUser!.id;
    const role = req.currentUser!.role;
    const correlationId = req.correlationId;

    await ProductService.archiveProduct(req.params.id, sellerId, role, correlationId);
    res.status(200).send({ message: 'Product archived successfully' });
  }

  static async validatePrices(
    req: Request<unknown, unknown, { variantIds: string[] }>,
    res: Response,
  ) {
    const { variantIds } = req.body;

    const priceMap = await ProductService.validatePrices(variantIds);
    res.status(200).send(priceMap);
  }
}
