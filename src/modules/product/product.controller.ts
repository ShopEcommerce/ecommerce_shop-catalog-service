import { Request, Response } from 'express';
import { ProductService } from './product.service';
import { CreateProductInput, UpdateProductInput, ListProductQuery } from './product.schema';
import { CatalogMessages } from '../../helpers/messages';

export class ProductController {
  static async createProduct(req: Request<unknown, unknown, CreateProductInput>, res: Response) {
    const sellerId = req.currentUser!.id;
    const correlationId = req.correlationId;

    const product = await ProductService.createProduct(req.body, sellerId, correlationId);
    res.status(201).json(CatalogMessages.buildSuccessResponse(CatalogMessages.MSG_28, product));
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
    res.status(200).json(CatalogMessages.buildSuccessResponse(CatalogMessages.MSG_29, product));
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
    res.status(200).json(CatalogMessages.buildSuccessResponse(CatalogMessages.MSG_30));
  }

  static async validatePrices(
    req: Request<unknown, unknown, { variantIds: string[] }>,
    res: Response,
  ) {
    const { variantIds } = req.body;

    const priceMap = await ProductService.validatePrices(variantIds);
    res.status(200).send(priceMap);
  }

  static async getMyProducts(
    req: Request<unknown, unknown, unknown, ListProductQuery>,
    res: Response,
  ) {
    const sellerId = req.currentUser!.id;
    const products = await ProductService.getSellerProducts(sellerId, req.query);
    res.status(200).send({ data: products });
  }

  static async updateStatus(
    req: Request<{ id: string }, unknown, { status: string }>,
    res: Response,
  ) {
    const { id } = req.params;
    const { status } = req.body;
    const sellerId = req.currentUser!.id;
    const role = req.currentUser!.role;

    const updatedProduct = await ProductService.changeProductStatus(
      id,
      status,
      sellerId,
      role,
      req.correlationId,
    );

    res.status(200).send({ message: 'Status updated successfully', data: updatedProduct });
  }
}
