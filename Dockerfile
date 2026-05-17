FROM node:20-alpine AS builder

WORKDIR /app

COPY shared/teleshop-common-1.0.0.tgz ./shared/
COPY shared/teleshop-common-1.0.3.tgz ./shared/
COPY catalog-service/package*.json ./catalog-service/

WORKDIR /app/catalog-service
RUN npm ci

COPY catalog-service/ ./
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner

WORKDIR /app/catalog-service
ENV NODE_ENV=production

COPY --from=builder /app/catalog-service /app/catalog-service

EXPOSE 3003
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
