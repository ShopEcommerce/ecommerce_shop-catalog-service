import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const logger = pino();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL must be defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ids = {
  categoryRoot: '00000000-0000-0000-0000-000000000101',
  categoryPhones: '00000000-0000-0000-0000-000000000102',
  categoryLaptops: '00000000-0000-0000-0000-000000000103',
  productPhone: '00000000-0000-0000-0000-000000000201',
  productLaptop: '00000000-0000-0000-0000-000000000202',
  variantPhoneBlack: '00000000-0000-0000-0000-000000000301',
  variantPhoneBlue: '00000000-0000-0000-0000-000000000302',
  variantLaptopSilver: '00000000-0000-0000-0000-000000000303',
};

async function main() {
  logger.info('Seeding Catalog Service Database...');

  await prisma.outboxEvent.deleteMany({});
  await prisma.processedEvent.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});

  const root = await prisma.category.create({
    data: {
      id: ids.categoryRoot,
      name: 'Electronics',
      slug: 'electronics',
      description: 'Seed root category for electronics products',
    },
  });

  const phones = await prisma.category.create({
    data: {
      id: ids.categoryPhones,
      parentId: root.id,
      name: 'Phones',
      slug: 'phones',
      description: 'Seed mobile phones category',
    },
  });

  const laptops = await prisma.category.create({
    data: {
      id: ids.categoryLaptops,
      parentId: root.id,
      name: 'Laptops',
      slug: 'laptops',
      description: 'Seed laptops category',
    },
  });

  await prisma.product.create({
    data: {
      id: ids.productPhone,
      sellerId: '00000000-0000-0000-0000-000000000002',
      categoryId: phones.id,
      name: 'Teleshop Seed Phone',
      slug: 'teleshop-seed-phone',
      description: 'Seed smartphone for demo flows',
      brand: 'Teleshop',
      mainImage: 'https://picsum.photos/seed/teleshop-phone/800/800',
      status: 'PUBLISHED',
      variants: {
        create: [
          {
            id: ids.variantPhoneBlack,
            sku: 'TEL-PHONE-BLACK',
            attributes: { color: 'Black', storage: '128GB' },
            price: new Prisma.Decimal('18990000'),
            stock: 40,
            imageUrl: 'https://picsum.photos/seed/teleshop-phone-black/800/800',
          },
          {
            id: ids.variantPhoneBlue,
            sku: 'TEL-PHONE-BLUE',
            attributes: { color: 'Blue', storage: '256GB' },
            price: new Prisma.Decimal('20990000'),
            stock: 25,
            imageUrl: 'https://picsum.photos/seed/teleshop-phone-blue/800/800',
          },
        ],
      },
    },
  });

  await prisma.product.create({
    data: {
      id: ids.productLaptop,
      sellerId: '00000000-0000-0000-0000-000000000002',
      categoryId: laptops.id,
      name: 'Teleshop Seed Laptop',
      slug: 'teleshop-seed-laptop',
      description: 'Seed laptop for demo flows',
      brand: 'Teleshop',
      mainImage: 'https://picsum.photos/seed/teleshop-laptop/800/800',
      status: 'PUBLISHED',
      variants: {
        create: [
          {
            id: ids.variantLaptopSilver,
            sku: 'TEL-LAPTOP-SILVER',
            attributes: { color: 'Silver', ram: '16GB', storage: '512GB' },
            price: new Prisma.Decimal('26990000'),
            stock: 18,
            imageUrl: 'https://picsum.photos/seed/teleshop-laptop-silver/800/800',
          },
        ],
      },
    },
  });

  logger.info('Catalog seed complete: categories, products, and variants created.');
}

main()
  .catch((error) => {
    logger.error(error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
