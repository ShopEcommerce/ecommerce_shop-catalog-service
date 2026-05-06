import { CategoryRepository } from './category.repository';
import { BadRequestError, NotFoundError } from '@teleshop/common';
import { CreateCategoryInput, UpdateCategoryInput } from './category.schema';

export class CategoryService {
  
  static async createCategory(data: CreateCategoryInput) {
    // Check if the slug is unique
    const existingCategory = await CategoryRepository.findBySlug(data.slug);
    if (existingCategory) {
      throw new BadRequestError('This slug is already used by another category.');
    }

    // If parentId is provided, check if the parent category exists
    if (data.parentId) {
      const parentCategory = await CategoryRepository.findById(data.parentId);
      if (!parentCategory) {
        throw new NotFoundError('Parent category does not exist.');
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
      throw new NotFoundError('Category not found.');
    }
    return category;
  }

  static async updateCategory(id: string, data: UpdateCategoryInput) {
    const category = await this.getCategoryById(id);

    // If the slug is being updated, ensure the new slug is unique
    if (data.slug && data.slug !== category.slug) {
      const existingSlug = await CategoryRepository.findBySlug(data.slug);
      if (existingSlug) {
        throw new BadRequestError('This slug is already used by another category.');
      }
    }

    if (data.parentId) {
      if (data.parentId === id) {
        throw new BadRequestError('Category cannot be its own parent.');
      }
      const parentCategory = await CategoryRepository.findById(data.parentId);
      if (!parentCategory) {
        throw new NotFoundError('Parent category does not exist.');
      }
    }

    return CategoryRepository.update(id, data);
  }

  static async deleteCategory(id: string) {
    await this.getCategoryById(id);

    const hasChildren = await CategoryRepository.hasChildren(id);
    if (hasChildren) {
      throw new BadRequestError(
        'Cannot delete category. This category contains child categories. Please delete or move child categories first.'
      );
    }

    const hasProducts = await CategoryRepository.hasProducts(id);
    if (hasProducts) {
      throw new BadRequestError(
        'Cannot delete category. This category contains products. Please delete or move products first.'
      );
    }

    await CategoryRepository.delete(id);
  }
}