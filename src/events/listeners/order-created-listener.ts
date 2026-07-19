import crypto from 'crypto';
import { Message } from 'amqplib';
import { BaseListener, DomainEvent, QueueGroupNames, Subjects } from '@teleshop/common';
import { prisma } from '../../db/prisma';
import { InboxRepository } from '../../modules/inbox/inbox.repository';
import pino from 'pino';

const logger = pino({ name: 'Catalog-OrderCreatedListener' });

type OrderCreatedEvent = Extract<DomainEvent, { subject: Subjects.OrderCreated }>;
type InventoryReservedEventData = Extract<
  DomainEvent,
  { subject: Subjects.InventoryReserved }
>['data'];
type InventoryFailedEventData = Extract<DomainEvent, { subject: Subjects.InventoryFailed }>['data'];

export class OrderCreatedListener extends BaseListener<OrderCreatedEvent> {
  readonly subject = Subjects.OrderCreated;
  queueGroupName = QueueGroupNames.CatalogService;

  async onMessage(data: OrderCreatedEvent['data'], _msg: Message) {
    const eventId = data.id || (data as OrderCreatedEvent['data'] & { eventId?: string }).eventId;
    const correlationId = data.correlationId || 'N/A';
    const { orderId, items } = data;

    if (!eventId || !orderId || !items) {
      throw new Error('Invalid OrderCreated payload: missing event identifier, orderId, or items');
    }

    logger.info(
      { correlationId, eventId, orderId },
      'Catalog received request: check and reserve inventory',
    );

    try {
      if (await InboxRepository.isEventProcessed(eventId)) {
        logger.info({ correlationId, eventId }, 'Event has already been processed. Skipping.');
        return;
      }

      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
          });

          if (!variant) {
            throw new Error(`Product variant (ID: ${item.variantId}) not found.`);
          }

          if (variant.stock < item.quantity) {
            throw new Error(
              `Product (Variant: ${item.variantId}) does not have sufficient stock. Available: ${variant.stock}, Requested: ${item.quantity}.`,
            );
          }

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
              `Failed to reserve stock for variant ${item.variantId}. Stock may have been exhausted by another order.`,
            );
          }
        }

        await InboxRepository.markAsProcessed(eventId, this.subject, tx);

        const outboxPayload: InventoryReservedEventData = {
          id: crypto.randomUUID(),
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
          'Inventory reduction successful. InventoryReserved has been written to outbox.',
        );
      });
    } catch (error: any) {
      logger.warn({ correlationId, orderId, reason: error.message }, 'Inventory reduction failed.');

      await prisma.$transaction(async (tx) => {
        await InboxRepository.markAsProcessed(eventId, this.subject, tx);

        const failedPayload: InventoryFailedEventData = {
          id: crypto.randomUUID(),
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
        'Inventory reduction failed. Sent InventoryFailed response to Order Service.',
      );
    }
  }
}
