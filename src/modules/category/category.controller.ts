import { Request, Response } from 'express';
import { CategoryService } from './category.service';
import { CreateCategoryInput, UpdateCategoryInput } from './category.schema';
import { CatalogMessages } from '../../helpers/messages';

export class CategoryController {
  static async createCategory(req: Request<unknown, unknown, CreateCategoryInput>, res: Response) {
    const category = await CategoryService.createCategory(req.body);
    res.status(201).json(CatalogMessages.buildSuccessResponse(CatalogMessages.MSG_34, category));
  }

  static async getCategories(req: Request, res: Response) {
    const categories = await CategoryService.getCategories();
    res.status(200).send({ data: categories });
  }

  static async getCategoryById(req: Request<{ id: string }>, res: Response) {
    const category = await CategoryService.getCategoryById(req.params.id);
    res.status(200).send({ data: category });
  }

  static async updateCategory(
    req: Request<{ id: string }, unknown, UpdateCategoryInput>,
    res: Response,
  ) {
    const category = await CategoryService.updateCategory(req.params.id, req.body);
    res.status(200).json(CatalogMessages.buildSuccessResponse(CatalogMessages.MSG_35, category));
  }

  static async deleteCategory(req: Request<{ id: string }>, res: Response) {
    await CategoryService.deleteCategory(req.params.id);
    res.status(200).json(CatalogMessages.buildSuccessResponse(CatalogMessages.MSG_36));
  }
}
