import { Message } from 'amqplib';
import { BaseListener, QueueGroupNames, Subjects } from '@teleshop/common';
import { prisma } from '../../db/prisma';
import { InboxRepository } from '../../modules/inbox/inbox.repository';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'Catalog-OrderCreatedListener' });

export class OrderCreatedListener extends BaseListener<any> {
  readonly subject = Subjects.OrderCreated;
  queueGroupName = QueueGroupNames.CatalogService;

  async onMessage(data: any, _msg: Message) {
    const eventId = data.eventId;
    const correlationId = data.correlationId || 'N/A';
    const orderId = data.orderId;
    const items = data.items;

    logger.info(
      { correlationId, eventId, orderId },
      'Catalog received request: Check and reduce inventory',
    );

    try {
      if (await InboxRepository.isEventProcessed(eventId)) {
        logger.info({ correlationId, eventId }, 'Event has already been processed. Skipping.');
        return;
      }

      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          const result = await tx.productVariant.updateMany({
            where: {
              id: item.variantId,
              stock: { gte: item.quantity },
            },
            data: {
              stock: { decrement: item.quantity },
            },
          });

          if (result.count === 0) {
            throw new Error(
              `Product (Variant: ${item.variantId}) is out of stock or does not have sufficient quantity.`,
            );
          }
        }

        await InboxRepository.markAsProcessed(eventId, this.subject, tx);

        const outboxPayload = {
          eventId: crypto.randomUUID(),
          type: Subjects.InventoryReserved,
          occurredAt: new Date().toISOString(),
          version: 1,
          correlationId: data.correlationId,
          orderId: data.orderId,
        };

        await tx.outboxEvent.create({
          data: { subject: Subjects.InventoryReserved, payload: outboxPayload as any },
        });

        logger.info(
          { correlationId, orderId },
          'Inventory reduction SUCCESSFUL. Event InventoryReserved has been written to Outbox.',
        );
      });
    } catch (error: any) {
      logger.warn({ correlationId, orderId, reason: error.message }, 'Inventory reduction FAILED.');

      await prisma.$transaction(async (tx) => {
        await InboxRepository.markAsProcessed(eventId, this.subject, tx);

        const failedPayload = {
          eventId: crypto.randomUUID(),
          type: Subjects.InventoryFailed,
          occurredAt: new Date().toISOString(),
          correlationId,
          version: 1,
          orderId,
          reason: error.message,
        };

        await tx.outboxEvent.create({
          data: { subject: Subjects.InventoryFailed, payload: failedPayload as any },
        });
      });

      logger.info(
        { correlationId, orderId },
        'Inventory reduction FAILED. Sent InventoryFailed response to Order Service.',
      );
    }
  }
}
