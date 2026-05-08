import { Message } from 'amqplib';
import { BaseListener, QueueGroupNames } from '@teleshop/common';
import { prisma } from '../../db/prisma';
import { InboxRepository } from '../../modules/inbox/inbox.repository';
import pino from 'pino';

const logger = pino({ name: 'Catalog-ReviewCreatedListener' });

export class ReviewCreatedListener extends BaseListener<any> {
  subject: any = 'ReviewCreated';
  queueGroupName = QueueGroupNames.CatalogService;

  async onMessage(data: any, msg: Message) {
    const { eventId, productId, rating } = data;
    const correlationId = data.correlationId || 'N/A';

    logger.info({ correlationId, eventId, productId, rating }, 'Received event: New review created. Calculating new average rating.');

    try {
      if (await InboxRepository.isEventProcessed(eventId)) {
        return;
      }

      await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: productId }
        });

        if (!product) {
          throw new Error('Product not found');
        }

        const currentTotalScore = product.ratingAverage * product.reviewCount;
        const newReviewCount = product.reviewCount + 1;
        
        const rawNewAverage = (currentTotalScore + rating) / newReviewCount;
        const newRatingAverage = Math.round(rawNewAverage * 10) / 10;

        await tx.product.update({
          where: { id: productId },
          data: {
            ratingAverage: newRatingAverage,
            reviewCount: newReviewCount
          }
        });

        await InboxRepository.markAsProcessed(eventId, this.subject, tx);
      });

      logger.info({ correlationId, productId }, 'Successfully updated the average rating.');

    } catch (error: any) {
      logger.error({ err: error.message }, 'Error occurred while processing ReviewCreated event');
      throw error;
    }
  }
}