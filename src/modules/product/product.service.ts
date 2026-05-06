import { ProductRepository } from './product.repository';
import { CategoryRepository } from '../category/category.repository';
import { BadRequestError, NotFoundError, ForbiddenError } from '@teleshop/common';
import { CreateProductInput, UpdateProductInput, ListProductQuery } from './product.schema';

export class ProductService {
  
  static async createProduct(data: CreateProductInput, sellerId: string, correlationId?: string) {
    const category = await CategoryRepository.findById(data.categoryId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const existingSlug = await ProductRepository.findBySlug(data.slug);
    if (existingSlug) {
      throw new BadRequestError('Product slug already exists. Please choose a different slug.');
    }

    const incomingSkus = data.variants.map(v => v.sku);
    
    const uniqueSkus = new Set(incomingSkus);
    if (uniqueSkus.size !== incomingSkus.length) {
      throw new BadRequestError('SKU values in the variants array must be unique. Please remove duplicates.');
    }

    const duplicatedSkus = await ProductRepository.findExistingSkus(incomingSkus);
    if (duplicatedSkus.length > 0) {
      const dupList = duplicatedSkus.map(s => s.sku).join(', ');
      throw new BadRequestError(`The following SKU values already exist in the system: ${dupList}`);
    }

    return ProductRepository.createProductWithVariants(data, sellerId, correlationId);
  }

  static async updateProduct(
    id: string, 
    data: UpdateProductInput, 
    sellerId: string, 
    role: string, 
    correlationId?: string
  ) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Check permission: Only the seller who owns the product
    if (product.sellerId !== sellerId && role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to edit this product');
    }

    if (data.slug && data.slug !== product.slug) {
      const existingSlug = await ProductRepository.findBySlug(data.slug);
      if (existingSlug) {
        throw new BadRequestError('Product slug already exists. Please choose a different slug.');
      }
    }

    if (data.categoryId && data.categoryId !== product.categoryId) {
      const category = await CategoryRepository.findById(data.categoryId);
      if (!category) {
        throw new NotFoundError('New category not found');
      }
    }

    if (data.variants && data.variants.length > 0) {
      const incomingSkus = data.variants.map(v => v.sku);
      
      const uniqueSkus = new Set(incomingSkus);
      if (uniqueSkus.size !== incomingSkus.length) {
        throw new BadRequestError('SKU values in the variants array must be unique. Please remove duplicates.');
      }

      const duplicatedSkus = await ProductRepository.findExistingSkus(incomingSkus, id);
      if (duplicatedSkus.length > 0) {
        const dupList = duplicatedSkus.map(s => s.sku).join(', ');
        throw new BadRequestError(`The following SKU values already exist in the system: ${dupList}`);
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
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  static async getProducts(query: ListProductQuery) {
    return ProductRepository.findProducts(query);
  }

  static async archiveProduct(id: string, sellerId: string, role: string, correlationId?: string) {
    const product = await ProductRepository.findById(id);
    if (!product) throw new NotFoundError('Product not found');

    if (product.sellerId !== sellerId && role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to archive this product');
    }

    return ProductRepository.updateProduct(id, { status: 'ARCHIVED' } as any, correlationId);
  }
}