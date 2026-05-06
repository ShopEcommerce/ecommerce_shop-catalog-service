import { prisma } from '../../db/prisma';
import { Prisma } from '@prisma/client';

export class CategoryRepository {
  
  static async create(data: Prisma.CategoryUncheckedCreateInput) {
    return prisma.category.create({ data });
  }

  static async findBySlug(slug: string) {
    return prisma.category.findUnique({ where: { slug } });
  }

  static async findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  }

  static async getCategoryTree() {
    return prisma.category.findMany({
      where: { parentId: null }, 
      include: {
        children: {
          include: {
            children: true, 
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async hasChildren(id: string) {
    const count = await prisma.category.count({
      where: { parentId: id },
    });
    return count > 0;
  }

  static async hasProducts(id: string) {
    const count = await prisma.product.count({
      where: { categoryId: id },
    });
    return count > 0;
  }

  static async update(id: string, data: Prisma.CategoryUpdateInput) {
    return prisma.category.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.category.delete({
      where: { id },
    });
  }
}