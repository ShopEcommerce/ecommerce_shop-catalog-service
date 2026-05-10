import { Message } from 'amqplib';
import { BaseListener, QueueGroupNames, Subjects } from '@teleshop/common';
import { prisma } from '../../db/prisma';
import { InboxRepository } from '../../modules/inbox/inbox.repository';
import pino from 'pino';

const logger = pino({ name: 'Catalog-ReviewDeletedListener' });

export class ReviewDeletedListener extends BaseListener<any> {
  readonly subject = Subjects.ReviewDeleted;
  queueGroupName = QueueGroupNames.CatalogService;

  async onMessage(data: any, _msg: Message) {
    // Note: Review Service when deleting must include the old `rating` in the payload
    const { eventId, productId, rating } = data;
    const correlationId = data.correlationId || 'N/A';

    logger.info(
      { correlationId, eventId, productId },
      'Received event: Review deleted. Recalculating average rating.',
    );

    try {
      if (await InboxRepository.isEventProcessed(eventId)) return;

      await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: productId },
        });

        if (!product) throw new Error('Product not found');

        const currentTotalScore = product.ratingAverage * product.reviewCount;
        const newReviewCount = product.reviewCount - 1;

        // Handle division by zero if this is the only review being deleted
        let newRatingAverage = 0;
        if (newReviewCount > 0) {
          const rawNewAverage = (currentTotalScore - rating) / newReviewCount;
          newRatingAverage = Math.round(rawNewAverage * 10) / 10;
        }

        await tx.product.update({
          where: { id: productId },
          data: {
            ratingAverage: newRatingAverage,
            reviewCount: newReviewCount,
          },
        });

        await InboxRepository.markAsProcessed(eventId, this.subject, tx);
      });

      logger.info({ correlationId, productId }, 'Successfully recalculated the average rating.');
    } catch (error: any) {
      logger.error({ err: error.message }, 'Error occurred while processing ReviewDeleted event');
      throw error;
    }
  }
}
