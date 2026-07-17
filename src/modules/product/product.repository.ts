import { prisma } from '../../db/prisma';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { DomainEvent, Subjects } from '@teleshop/common';
import { CreateProductInput, UpdateProductInput, ListProductQuery } from './product.schema';

type ProductCreatedEventData = Extract<DomainEvent, { subject: Subjects.ProductCreated }>['data'];
type ProductUpdatedEventData = Extract<DomainEvent, { subject: Subjects.ProductUpdated }>['data'];

const getMinVariantPrice = (variants: Array<{ price: Prisma.Decimal | number | string }>) => {
  if (variants.length === 0) return Number.POSITIVE_INFINITY;
  return Math.min(...variants.map((variant) => Number(variant.price)));
};

const sortProductsByPrice = <
  T extends {
    variants: Array<{ price: Prisma.Decimal | number | string }>;
    createdAt: Date;
  },
>(
  products: T[],
  sortOrder: 'asc' | 'desc',
) => {
  return [...products].sort((left, right) => {
    const leftPrice = getMinVariantPrice(left.variants);
    const rightPrice = getMinVariantPrice(right.variants);

    if (leftPrice === rightPrice) {
      return sortOrder === 'asc'
        ? left.createdAt.getTime() - right.createdAt.getTime()
        : right.createdAt.getTime() - left.createdAt.getTime();
    }

    return sortOrder === 'asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
  });
};

export class ProductRepository {
  static async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { variants: true, category: true },
    });
  }

  static async findBySlug(slug: string) {
    return prisma.product.findUnique({ where: { slug } });
  }

  static async findExistingSkus(skus: string[], excludeProductId?: string) {
    return prisma.productVariant.findMany({
      where: {
        sku: { in: skus },
        productId: excludeProductId ? { not: excludeProductId } : undefined,
      },
      select: { sku: true },
    });
  }

  static async createProductWithVariants(
    data: CreateProductInput,
    sellerId: string,
    correlationId?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sellerId,
          name: data.name,
          slug: data.slug,
          description: data.description ?? '',
          brand: data.brand,
          mainImage: data.mainImage,
          categoryId: data.categoryId,
          status: data.status,
        },
      });

      const variantsData = data.variants.map((v) => ({
        ...v,
        attributes: (v.attributes ? v.attributes : Prisma.DbNull) as Prisma.InputJsonValue,
        productId: product.id,
      }));
      await tx.productVariant.createMany({ data: variantsData });

      const eventPayload: ProductCreatedEventData = {
        id: crypto.randomUUID(),
        type: Subjects.ProductCreated,
        occurredAt: new Date().toISOString(),
        version: 1,
        correlationId,
        productId: product.id,
        sellerId,
        status: product.status,
      };

      await tx.outboxEvent.create({
        data: { subject: Subjects.ProductCreated, payload: eventPayload as any },
      });

      return tx.product.findUnique({
        where: { id: product.id },
        include: { variants: true },
      });
    });
  }

  static async updateProduct(id: string, data: UpdateProductInput, correlationId?: string) {
    return prisma.$transaction(async (tx) => {
      const { variants, ...productBaseData } = data;

      await tx.product.update({
        where: { id },
        data: productBaseData,
      });

      if (variants && variants.length > 0) {
        const incomingVariantIds = variants.filter((v) => v.id).map((v) => v.id as string);

        await tx.productVariant.deleteMany({
          where: {
            productId: id,
            id: { notIn: incomingVariantIds },
          },
        });

        for (const variant of variants) {
          const variantPayload = {
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
            imageUrl: variant.imageUrl,
            attributes: (variant.attributes
              ? variant.attributes
              : Prisma.DbNull) as Prisma.InputJsonValue,
          };

          if (variant.id) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: variantPayload,
            });
          } else {
            await tx.productVariant.create({
              data: {
                ...variantPayload,
                productId: id,
              },
            });
          }
        }
      }

      const eventPayload: ProductUpdatedEventData = {
        id: crypto.randomUUID(),
        type: Subjects.ProductUpdated,
        occurredAt: new Date().toISOString(),
        version: 1,
        correlationId,
        productId: id,
      };

      await tx.outboxEvent.create({
        data: { subject: Subjects.ProductUpdated, payload: eventPayload as any },
      });

      return tx.product.findUnique({ where: { id }, include: { variants: true } });
    });
  }

  static async findProducts(query: ListProductQuery) {
    const { page, limit, search, categoryId, minPrice, maxPrice, sortBy, sortOrder } = query;
    const currentPage = Number(page) || 1;
    const currentLimit = Number(limit) || 10;
    const skip = (currentPage - 1) * currentLimit;

    const whereCondition: Prisma.ProductWhereInput = {
      status: 'PUBLISHED',
    };

    if (search) {
      whereCondition.name = { contains: search, mode: 'insensitive' };
    }

    if (categoryId) {
      whereCondition.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereCondition.variants = {
        some: {
          price: {
            gte: minPrice,
            lte: maxPrice,
          },
        },
      };
    }

    const totalCount = await prisma.product.count({ where: whereCondition });

    const baseQuery = {
      where: whereCondition,
      include: {
        category: { select: { name: true, slug: true } },
        variants: true,
      },
    } satisfies Prisma.ProductFindManyArgs;

    let products;
    if (sortBy === 'price') {
      const allProducts = await prisma.product.findMany({
        ...baseQuery,
        orderBy: { createdAt: 'desc' },
      });
      products = sortProductsByPrice(allProducts, sortOrder).slice(skip, skip + currentLimit);
    } else {
      products = await prisma.product.findMany({
        ...baseQuery,
        skip,
        take: currentLimit,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      });
    }

    return {
      products,
      meta: {
        total: totalCount,
        page: currentPage,
        limit: currentLimit,
        totalPages: Math.ceil(totalCount / currentLimit),
      },
    };
  }

  static async getVariantsById(ids: string[]) {
    return prisma.productVariant.findMany({
      where: { id: { in: ids } },
      select: { id: true, price: true },
    });
  }

  static async findSellerProducts(sellerId: string, query: ListProductQuery) {
    // NOTE: This method returns ALL products for a seller regardless of status.
    // This is intentional - sellers need to see DRAFT, PUBLISHED, HIDDEN, and ARCHIVED products
    // to manage their complete inventory. Use getSellerProducts in product service for business logic.

    const { page, limit, search, categoryId, sortBy, sortOrder } = query;
    const currentPage = Number(page) || 1;
    const currentLimit = Number(limit) || 10;
    const skip = (currentPage - 1) * currentLimit;

    const whereCondition: Prisma.ProductWhereInput = {
      sellerId: sellerId,
    };

    if (search) {
      whereCondition.name = { contains: search, mode: 'insensitive' };
    }

    if (categoryId) {
      whereCondition.categoryId = categoryId;
    }

    const totalCount = await prisma.product.count({ where: whereCondition });

    const baseQuery = {
      where: whereCondition,
      include: {
        category: { select: { name: true, slug: true } },
        variants: true,
      },
    } satisfies Prisma.ProductFindManyArgs;

    let products;
    if (sortBy === 'price') {
      const allProducts = await prisma.product.findMany({
        ...baseQuery,
        orderBy: { createdAt: 'desc' },
      });
      products = sortProductsByPrice(allProducts, sortOrder).slice(skip, skip + currentLimit);
    } else {
      products = await prisma.product.findMany({
        ...baseQuery,
        skip,
        take: currentLimit,
        orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      });
    }

    return {
      products,
      meta: {
        total: totalCount,
        page: currentPage,
        limit: currentLimit,
        totalPages: Math.ceil(totalCount / currentLimit),
      },
    };
  }
}
