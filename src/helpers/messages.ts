export enum MessageCode {
  MSG_28 = 'MSG_28',
  MSG_29 = 'MSG_29',
  MSG_30 = 'MSG_30',
  MSG_31 = 'MSG_31',
  MSG_32 = 'MSG_32',
  MSG_33 = 'MSG_33',
  MSG_34 = 'MSG_34',
  MSG_35 = 'MSG_35',
  MSG_36 = 'MSG_36',
  MSG_37 = 'MSG_37',
  MSG_38 = 'MSG_38',
  MSG_39 = 'MSG_39',
  MSG_40 = 'MSG_40',
  MSG_41 = 'MSG_41',
  MSG_42 = 'MSG_42',
  MSG_43 = 'MSG_43',
  MSG_44 = 'MSG_44',
  MSG_45 = 'MSG_45',
  MSG_46 = 'MSG_46',
  MSG_47 = 'MSG_47',
  MSG_48 = 'MSG_48',
  MSG_49 = 'MSG_49',
}

export interface MessageDefinition {
  code: MessageCode;
  message: string;
  httpStatus: number;
  category: 'validation' | 'success' | 'not-found' | 'conflict' | 'server-error';
}

export class CatalogMessages {
  // Product Messages
  static readonly MSG_28: MessageDefinition = {
    code: MessageCode.MSG_28,
    message: 'Product created successfully',
    httpStatus: 201,
    category: 'success',
  };

  static readonly MSG_29: MessageDefinition = {
    code: MessageCode.MSG_29,
    message: 'Product updated successfully',
    httpStatus: 200,
    category: 'success',
  };

  static readonly MSG_30: MessageDefinition = {
    code: MessageCode.MSG_30,
    message: 'Product archived successfully',
    httpStatus: 200,
    category: 'success',
  };

  static readonly MSG_31: MessageDefinition = {
    code: MessageCode.MSG_31,
    message:
      'Invalid product slug format. Slug must contain only lowercase letters, numbers, and hyphens',
    httpStatus: 400,
    category: 'validation',
  };

  static readonly MSG_32: MessageDefinition = {
    code: MessageCode.MSG_32,
    message: 'Product slug already exists. Please choose a different slug',
    httpStatus: 409,
    category: 'conflict',
  };

  static readonly MSG_33: MessageDefinition = {
    code: MessageCode.MSG_33,
    message: 'SKU values must be unique within the product variants',
    httpStatus: 400,
    category: 'validation',
  };

  // Category Messages
  static readonly MSG_34: MessageDefinition = {
    code: MessageCode.MSG_34,
    message: 'Category created successfully',
    httpStatus: 201,
    category: 'success',
  };

  static readonly MSG_35: MessageDefinition = {
    code: MessageCode.MSG_35,
    message: 'Category updated successfully',
    httpStatus: 200,
    category: 'success',
  };

  static readonly MSG_36: MessageDefinition = {
    code: MessageCode.MSG_36,
    message: 'Category deleted successfully',
    httpStatus: 200,
    category: 'success',
  };

  static readonly MSG_37: MessageDefinition = {
    code: MessageCode.MSG_37,
    message: 'Inventory check failed or insufficient stock',
    httpStatus: 400,
    category: 'validation',
  };

  static readonly MSG_38: MessageDefinition = {
    code: MessageCode.MSG_38,
    message: 'Inventory reserved successfully',
    httpStatus: 200,
    category: 'success',
  };

  static readonly MSG_39: MessageDefinition = {
    code: MessageCode.MSG_39,
    message: 'Invalid category slug format',
    httpStatus: 400,
    category: 'validation',
  };

  static readonly MSG_40: MessageDefinition = {
    code: MessageCode.MSG_40,
    message: 'Cannot delete category. This category contains child categories',
    httpStatus: 400,
    category: 'validation',
  };

  static readonly MSG_41: MessageDefinition = {
    code: MessageCode.MSG_41,
    message: 'Cannot delete category. This category contains products',
    httpStatus: 400,
    category: 'validation',
  };

  // Not Found Messages
  static readonly MSG_42: MessageDefinition = {
    code: MessageCode.MSG_42,
    message: 'Product not found',
    httpStatus: 404,
    category: 'not-found',
  };

  static readonly MSG_43: MessageDefinition = {
    code: MessageCode.MSG_43,
    message: 'Category not found',
    httpStatus: 404,
    category: 'not-found',
  };

  // Permission Messages
  static readonly MSG_44: MessageDefinition = {
    code: MessageCode.MSG_44,
    message: 'You do not have permission to perform this action',
    httpStatus: 403,
    category: 'validation',
  };

  // Business Rule Messages
  static readonly MSG_45: MessageDefinition = {
    code: MessageCode.MSG_45,
    message: 'Category cannot be its own parent',
    httpStatus: 400,
    category: 'validation',
  };

  static readonly MSG_46: MessageDefinition = {
    code: MessageCode.MSG_46,
    message: 'Parent category does not exist',
    httpStatus: 404,
    category: 'not-found',
  };

  static readonly MSG_47: MessageDefinition = {
    code: MessageCode.MSG_47,
    message: 'New category not found',
    httpStatus: 404,
    category: 'not-found',
  };

  static readonly MSG_48: MessageDefinition = {
    code: MessageCode.MSG_48,
    message: 'SKU already exists in another product',
    httpStatus: 409,
    category: 'conflict',
  };

  static readonly MSG_49: MessageDefinition = {
    code: MessageCode.MSG_49,
    message: 'Duplicate SKU values within the same variants array',
    httpStatus: 400,
    category: 'validation',
  };
  static buildResponse(success: boolean, message: MessageDefinition, data?: any) {
    return {
      success,
      message: message.message,
      code: message.code,
      data: data || null,
      timestamp: new Date().toISOString(),
    };
  }

  static buildSuccessResponse(message: MessageDefinition, data?: any) {
    return this.buildResponse(true, message, data);
  }

  static buildErrorResponse(message: MessageDefinition) {
    return this.buildResponse(false, message);
  }
}

export class MessageValidator {
  static validateProductSlug(slug?: string): MessageDefinition | null {
    if (!slug) return null;
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return CatalogMessages.MSG_31;
    }
    return null;
  }

  static validateCategorySlug(slug?: string): MessageDefinition | null {
    if (!slug) return null;
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return CatalogMessages.MSG_39;
    }
    return null;
  }

  static validateSkuUniqueness(skus: string[]): MessageDefinition | null {
    const uniqueSkus = new Set(skus);
    if (uniqueSkus.size !== skus.length) {
      return CatalogMessages.MSG_33;
    }
    return null;
  }
}
