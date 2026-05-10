import request from 'supertest';
import { app } from '../../../app';
import { ProductRepository } from '../product.repository';
import jwt from 'jsonwebtoken';
import { CategoryRepository } from '../../category/category.repository';

jest.mock('../product.repository');
jest.mock('../../category/category.repository');

// Use valid UUIDs for testing to pass Zod validations
const VALID_PRODUCT_ID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_CATEGORY_ID = '987fcdeb-51a2-43d7-9012-345678901234';

const getAuthCookie = () => {
  const payload = {
    id: 'current-seller-id',
    email: 'seller@test.com',
    role: 'SELLER',
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!);
  const session = { jwt: token };
  const sessionJSON = JSON.stringify(session);
  const base64 = Buffer.from(sessionJSON).toString('base64');

  return [`session=${base64}`];
};

describe('Product API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/product', () => {
    it('returns 200 and a list of products', async () => {
      (ProductRepository.findProducts as jest.Mock).mockResolvedValue({
        products: [{ id: VALID_PRODUCT_ID, name: 'iPhone 15' }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await request(app).get('/api/product').expect(200);
      const responseData = response.body.data || response.body;

      expect(responseData.products).toHaveLength(1);
      expect(responseData.products[0].name).toEqual('iPhone 15');
    });
  });

  describe('POST /api/product', () => {
    it('returns 201 when creating a product successfully', async () => {
      // Mock the category check in the service to return true
      (CategoryRepository.findById as jest.Mock).mockResolvedValue({ id: VALID_CATEGORY_ID });
      (ProductRepository.findBySlug as jest.Mock).mockResolvedValue(null);
      (ProductRepository.findExistingSkus as jest.Mock).mockResolvedValue([]);

      (ProductRepository.createProductWithVariants as jest.Mock).mockResolvedValue({
        id: VALID_PRODUCT_ID,
        name: 'Macbook Pro M3',
        status: 'PUBLISHED',
        variants: [{ sku: 'MAC-M3-16GB', price: 50000000 }],
      });

      const response = await request(app)
        .post('/api/product')
        .set('Cookie', getAuthCookie())
        .send({
          name: 'Macbook Pro M3',
          slug: 'macbook-pro-m3',
          brand: 'Apple',
          categoryId: VALID_CATEGORY_ID, // Use valid UUID
          status: 'PUBLISHED',
          mainImage: 'http://image.com/mac.jpg',
          variants: [{ sku: 'MAC-M3-16GB', price: 50000000, stock: 10 }],
        })
        .expect(201);

      const responseData = response.body.data || response.body;
      expect(responseData.id).toEqual(VALID_PRODUCT_ID);
      expect(ProductRepository.createProductWithVariants).toHaveBeenCalledTimes(1);
    });

    it('returns 400 if SKU is duplicated', async () => {
      (CategoryRepository.findById as jest.Mock).mockResolvedValue({ id: VALID_CATEGORY_ID });
      (ProductRepository.findBySlug as jest.Mock).mockResolvedValue(null);
      (ProductRepository.findExistingSkus as jest.Mock).mockResolvedValue([{ sku: 'MAC-M3-16GB' }]);

      const response = await request(app)
        .post('/api/product')
        .set('Cookie', getAuthCookie())
        .send({
          name: 'Macbook Pro M3',
          slug: 'macbook-pro-m3',
          brand: 'Apple',
          categoryId: VALID_CATEGORY_ID, // Use valid UUID
          status: 'PUBLISHED',
          mainImage: 'http://image.com/mac.jpg',
          variants: [{ sku: 'MAC-M3-16GB', price: 50000000, stock: 10 }],
        })
        .expect(400);

      // We expect the validation middleware or the service to return an error containing "SKU"
      // Since response.body might be an array of errors (from shared error handler)
      const errorMessage = Array.isArray(response.body)
        ? response.body[0].message
        : response.body.errors[0].message;
      expect(errorMessage).toContain('SKU');
    });
  });

  describe('PUT /api/product/:id', () => {
    it('returns 200 when updating a product successfully', async () => {
      (ProductRepository.findById as jest.Mock).mockResolvedValue({
        id: VALID_PRODUCT_ID,
        sellerId: 'current-seller-id',
      });

      (ProductRepository.findBySlug as jest.Mock).mockResolvedValue(null);
      (ProductRepository.findExistingSkus as jest.Mock).mockResolvedValue([]);

      (ProductRepository.updateProduct as jest.Mock).mockResolvedValue({
        id: VALID_PRODUCT_ID,
        name: 'Macbook Pro M3 Updated',
      });

      const response = await request(app)
        .put(`/api/product/${VALID_PRODUCT_ID}`)
        .set('Cookie', getAuthCookie())
        .send({
          name: 'Macbook Pro M3 Updated',
          status: 'PUBLISHED',
          variants: [],
        })
        .expect(200);

      const responseData = response.body.data || response.body;
      expect(responseData.name).toEqual('Macbook Pro M3 Updated');
    });
  });
});
