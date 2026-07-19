import { Message } from 'amqplib';
import { BaseListener, DomainEvent, QueueGroupNames, Subjects } from '@teleshop/common';
import { prisma } from '../../db/prisma';
import { InboxRepository } from '../../modules/inbox/inbox.repository';
import pino from 'pino';

const logger = pino({ name: 'Catalog-ReviewCreatedListener' });

type ReviewCreatedEvent = Extract<DomainEvent, { subject: Subjects.ReviewCreated }>;

export class ReviewCreatedListener extends BaseListener<ReviewCreatedEvent> {
  readonly subject = Subjects.ReviewCreated;
  queueGroupName = QueueGroupNames.CatalogService;

  async onMessage(data: ReviewCreatedEvent['data'], _msg: Message) {
    const eventId = data.id || (data as ReviewCreatedEvent['data'] & { eventId?: string }).eventId;
    const { productId, rating } = data;
    const correlationId = data.correlationId || 'N/A';

    if (!eventId || !productId) {
      throw new Error('Invalid ReviewCreated payload: missing event identifier or productId');
    }

    logger.info(
      { correlationId, eventId, productId, rating },
      'Received event: New review created. Calculating new average rating.',
    );

    try {
      if (await InboxRepository.isEventProcessed(eventId)) {
        return;
      }

      await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: productId },
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
            reviewCount: newReviewCount,
          },
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
