import { Message } from 'amqplib';
import { BaseListener, QueueGroupNames, Subjects } from '@teleshop/common';
import { prisma } from '../../db/prisma';
import { InboxRepository } from '../../modules/inbox/inbox.repository';
import pino from 'pino';

const logger = pino({ name: 'Catalog-OrderCancelledListener' });

export class OrderCancelledListener extends BaseListener<any> {
  readonly subject = Subjects.OrderCancelled;
  queueGroupName = QueueGroupNames.CatalogService;

  async onMessage(data: any, _msg: Message) {
    const { eventId, orderId, items } = data;
    const correlationId = data.correlationId || 'N/A';

    logger.info(
      { correlationId, orderId },
      'Catalog received OrderCancelled. Refunding inventory...',
    );

    try {
      if (await InboxRepository.isEventProcessed(eventId)) return;

      await prisma.$transaction(async (tx) => {
        if (items && items.length > 0) {
          for (const item of items) {
            await tx.productVariant.updateMany({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
        await InboxRepository.markAsProcessed(eventId, this.subject, tx);
      });

      logger.info(
        { correlationId, orderId },
        'Successfully refunded inventory for cancelled order.',
      );
    } catch (error: any) {
      logger.error({ correlationId, orderId, reason: error.message }, 'Failed to refund inventory');
      throw error;
    }
  }
}
