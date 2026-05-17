import { ProductRepository } from './product.repository';
import { CategoryRepository } from '../category/category.repository';
import { BadRequestError, NotFoundError, ForbiddenError } from '@teleshop/common';
import { CreateProductInput, UpdateProductInput, ListProductQuery } from './product.schema';
import { CatalogMessages } from '../../helpers/messages';

export class ProductService {
  static async createProduct(data: CreateProductInput, sellerId: string, correlationId?: string) {
    const category = await CategoryRepository.findById(data.categoryId);
    if (!category) {
      throw new NotFoundError(CatalogMessages.MSG_43.message);
    }

    const existingSlug = await ProductRepository.findBySlug(data.slug);
    if (existingSlug) {
      throw new BadRequestError(CatalogMessages.MSG_32.message);
    }

    const incomingSkus = data.variants.map((v) => v.sku);

    const uniqueSkus = new Set(incomingSkus);
    if (uniqueSkus.size !== incomingSkus.length) {
      throw new BadRequestError(CatalogMessages.MSG_49.message);
    }

    const duplicatedSkus = await ProductRepository.findExistingSkus(incomingSkus);
    if (duplicatedSkus.length > 0) {
      throw new BadRequestError(CatalogMessages.MSG_48.message);
    }

    return ProductRepository.createProductWithVariants(data, sellerId, correlationId);
  }

  static async updateProduct(
    id: string,
    data: UpdateProductInput,
    sellerId: string,
    role: string,
    correlationId?: string,
  ) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError(CatalogMessages.MSG_42.message);
    }

    // Check permission: Only the seller who owns the product
    if (product.sellerId !== sellerId && role !== 'ADMIN') {
      throw new ForbiddenError(CatalogMessages.MSG_44.message);
    }

    if (data.slug && data.slug !== product.slug) {
      const existingSlug = await ProductRepository.findBySlug(data.slug);
      if (existingSlug) {
        throw new BadRequestError(CatalogMessages.MSG_32.message);
      }
    }

    if (data.categoryId && data.categoryId !== product.categoryId) {
      const category = await CategoryRepository.findById(data.categoryId);
      if (!category) {
        throw new NotFoundError(CatalogMessages.MSG_47.message);
      }
    }

    if (data.variants && data.variants.length > 0) {
      const incomingSkus = data.variants.map((v) => v.sku);

      const uniqueSkus = new Set(incomingSkus);
      if (uniqueSkus.size !== incomingSkus.length) {
        throw new BadRequestError(CatalogMessages.MSG_49.message);
      }

      const duplicatedSkus = await ProductRepository.findExistingSkus(incomingSkus, id);
      if (duplicatedSkus.length > 0) {
        throw new BadRequestError(CatalogMessages.MSG_48.message);
      }
    }

    return ProductRepository.updateProduct(id, data, correlationId);
  }

  static async getProductByIdOrSlug(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);

    const product = isUuid
      ? await ProductRepository.findById(idOrSlug)
      : await ProductRepository.findBySlug(idOrSlug);

    if (!product) {
      throw new NotFoundError(CatalogMessages.MSG_42.message);
    }
    return product;
  }

  static async getProducts(query: ListProductQuery) {
    return ProductRepository.findProducts(query);
  }

  static async archiveProduct(id: string, sellerId: string, role: string, correlationId?: string) {
    const product = await ProductRepository.findById(id);
    if (!product) throw new NotFoundError(CatalogMessages.MSG_42.message);

    if (product.sellerId !== sellerId && role !== 'ADMIN') {
      throw new ForbiddenError(CatalogMessages.MSG_44.message);
    }

    return ProductRepository.updateProduct(id, { status: 'ARCHIVED' } as any, correlationId);
  }

  static async validatePrices(variantIds: string[]) {
    const variants = await ProductRepository.getVariantsById(variantIds);

    const priceMap: Record<string, number> = {};
    variants.forEach((v) => {
      priceMap[v.id] = Number(v.price);
    });

    return priceMap;
  }

  static async getSellerProducts(sellerId: string, query: ListProductQuery) {
    return ProductRepository.findSellerProducts(sellerId, query);
  }

  static async changeProductStatus(
    id: string,
    status: string,
    sellerId: string,
    role: string,
    correlationId?: string,
  ) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError(CatalogMessages.MSG_42.message);
    }

    if (product.sellerId !== sellerId && role !== 'ADMIN') {
      throw new ForbiddenError(CatalogMessages.MSG_44.message);
    }

    return ProductRepository.updateProduct(id, { status } as any, correlationId);
  }
}
