import request from 'supertest';
import { app } from '../../../app';
import { CategoryRepository } from '../category.repository';
import jwt from 'jsonwebtoken';

jest.mock('../category.repository');

const VALID_CATEGORY_ID = '987fcdeb-51a2-43d7-9012-345678901234';

const getAdminAuthCookie = () => {
  const payload = {
    id: 'admin-user-id',
    email: 'admin@test.com',
    role: 'ADMIN',
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!);
  const session = { jwt: token };
  const sessionJSON = JSON.stringify(session);
  const base64 = Buffer.from(sessionJSON).toString('base64');

  return [`session=${base64}`];
};

describe('Category API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/category', () => {
    it('returns 200 and a list of categories', async () => {
      (CategoryRepository.getCategoryTree as jest.Mock).mockResolvedValue({
        categories: [
          { id: VALID_CATEGORY_ID, name: 'Điện thoại', slug: 'dien-thoai', isActive: true },
        ],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await request(app).get('/api/category').expect(200);
      const responseData = response.body.data || response.body;

      const categories = responseData.categories || responseData;
      expect(categories).toHaveLength(1);
      expect(categories[0].name).toEqual('Điện thoại');
    });
  });

  describe('POST /api/category', () => {
    it('returns 201 when creating a category successfully', async () => {
      (CategoryRepository.findBySlug as jest.Mock).mockResolvedValue(null);

      (CategoryRepository.create as jest.Mock).mockResolvedValue({
        id: VALID_CATEGORY_ID,
        name: 'Laptop',
        slug: 'laptop',
        isActive: true,
      });

      const response = await request(app)
        .post('/api/category')
        .set('Cookie', getAdminAuthCookie())
        .send({
          name: 'Laptop',
          slug: 'laptop',
          description: 'Danh mục laptop',
        })
        .expect(201);

      const responseData = response.body.data || response.body;
      expect(responseData.id).toEqual(VALID_CATEGORY_ID);
      expect(responseData.name).toEqual('Laptop');
    });

    it('returns 400 if slug is duplicated', async () => {
      (CategoryRepository.findBySlug as jest.Mock).mockResolvedValue({
        id: 'some-other-id',
        slug: 'laptop',
      });

      const response = await request(app)
        .post('/api/category')
        .set('Cookie', getAdminAuthCookie())
        .send({
          name: 'Laptop',
          slug: 'laptop',
        })
        .expect(400);

      const errorMessage = Array.isArray(response.body)
        ? response.body[0].message
        : response.body.errors[0].message;
      expect(errorMessage).toBeDefined();
    });
  });

  describe('PUT /api/category/:id', () => {
    it('returns 200 when updating a category successfully', async () => {
      (CategoryRepository.findById as jest.Mock).mockResolvedValue({
        id: VALID_CATEGORY_ID,
        name: 'Laptop',
        slug: 'laptop',
      });

      (CategoryRepository.findBySlug as jest.Mock).mockResolvedValue(null);

      (CategoryRepository.update as jest.Mock).mockResolvedValue({
        id: VALID_CATEGORY_ID,
        name: 'Laptop Gaming',
        slug: 'laptop-gaming',
      });

      const response = await request(app)
        .put(`/api/category/${VALID_CATEGORY_ID}`)
        .set('Cookie', getAdminAuthCookie())
        .send({
          name: 'Laptop Gaming',
          slug: 'laptop-gaming',
        })
        .expect(200);

      const responseData = response.body.data || response.body;
      expect(responseData.name).toEqual('Laptop Gaming');
    });
  });
});
