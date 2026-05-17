import { CategoryRepository } from './category.repository';
import { BadRequestError, NotFoundError } from '@teleshop/common';
import { CreateCategoryInput, UpdateCategoryInput } from './category.schema';
import { CatalogMessages } from '../../helpers/messages';

export class CategoryService {
  static async createCategory(data: CreateCategoryInput) {
    // Check if the slug is unique
    const existingCategory = await CategoryRepository.findBySlug(data.slug);
    if (existingCategory) {
      throw new BadRequestError(CatalogMessages.MSG_39.message);
    }

    // If parentId is provided, check if the parent category exists
    if (data.parentId) {
      const parentCategory = await CategoryRepository.findById(data.parentId);
      if (!parentCategory) {
        throw new NotFoundError(CatalogMessages.MSG_46.message);
      }
    }

    return CategoryRepository.create(data);
  }

  static async getCategories() {
    return CategoryRepository.getCategoryTree();
  }

  static async getCategoryById(id: string) {
    const category = await CategoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError(CatalogMessages.MSG_43.message);
    }
    return category;
  }

  static async updateCategory(id: string, data: UpdateCategoryInput) {
    const category = await this.getCategoryById(id);

    // If the slug is being updated, ensure the new slug is unique
    if (data.slug && data.slug !== category.slug) {
      const existingSlug = await CategoryRepository.findBySlug(data.slug);
      if (existingSlug) {
        throw new BadRequestError(CatalogMessages.MSG_39.message);
      }
    }

    if (data.parentId) {
      if (data.parentId === id) {
        throw new BadRequestError(CatalogMessages.MSG_45.message);
      }
      const parentCategory = await CategoryRepository.findById(data.parentId);
      if (!parentCategory) {
        throw new NotFoundError(CatalogMessages.MSG_46.message);
      }
    }

    return CategoryRepository.update(id, data);
  }

  static async deleteCategory(id: string) {
    await this.getCategoryById(id);

    const hasChildren = await CategoryRepository.hasChildren(id);
    if (hasChildren) {
      throw new BadRequestError(CatalogMessages.MSG_40.message);
    }

    const hasProducts = await CategoryRepository.hasProducts(id);
    if (hasProducts) {
      throw new BadRequestError(CatalogMessages.MSG_41.message);
    }

    await CategoryRepository.delete(id);
  }
}
