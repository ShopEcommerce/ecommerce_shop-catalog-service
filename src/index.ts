import 'dotenv/config';
import { app } from './app';
import { rabbitmqWrapper } from '@teleshop/common';
import { startOutboxWorker } from './workers/outbox.worker';
import pino from 'pino';
import { OrderCreatedListener } from './events/listeners/order-created-listener';
import { OrderCancelledListener } from './events/listeners/order-cancelled-listener';
import { ReviewDeletedListener } from './events/listeners/review-deleted-listener';
import { ReviewCreatedListener } from './events/listeners/review-created-listener';

const logger = pino();

const start = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be defined');
  }
  if (!process.env.RABBITMQ_URL) {
    throw new Error('RABBITMQ_URL must be defined');
  }

  try {
    await rabbitmqWrapper.connect(process.env.RABBITMQ_URL);

    startOutboxWorker();

    // Graceful Shutdown
    process.on('SIGINT', () => rabbitmqWrapper.close());
    process.on('SIGTERM', () => rabbitmqWrapper.close());

    new OrderCreatedListener(rabbitmqWrapper.channel).listen();
    new OrderCancelledListener(rabbitmqWrapper.channel).listen();
    new ReviewCreatedListener(rabbitmqWrapper.channel).listen();
    new ReviewDeletedListener(rabbitmqWrapper.channel).listen();

    const port = process.env.PORT;
    app.listen(port, () => {
      logger.info(`[Catalog Service] is running on port ${port}`);
    });
  } catch (err) {
    logger.error({ msg: 'Failed to start Catalog Service', error: err });
  }
};

start();
