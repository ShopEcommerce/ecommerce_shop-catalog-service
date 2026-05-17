import { OutboxRepository } from '../modules/outbox/outbox.repository';
import { BasePublisher, Subjects, rabbitmqWrapper } from '@teleshop/common';
import pino from 'pino';

const logger = pino();

interface ProcessedEvent {
  id: string;
  retries: number;
  lastError?: string;
}

class DynamicPublisher extends BasePublisher<any> {
  subject: Subjects;
  constructor(channel: any, subject: Subjects) {
    super(channel);
    this.subject = subject;
  }
}

let isProcessing = false;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const processedEvents = new Map<string, ProcessedEvent>();

function getExponentialBackoffDelay(retries: number): number {
  return INITIAL_RETRY_DELAY * Math.pow(2, retries);
}

export const startOutboxWorker = () => {
  logger.info('[Catalog Outbox Worker] Started watching for pending events...');

  setInterval(async () => {
    if (isProcessing) return;

    isProcessing = true;

    try {
      const events = await OutboxRepository.getPendingEvents();
      if (events.length === 0) return;

      for (const event of events) {
        const processedEvent = processedEvents.get(event.id) || {
          id: event.id,
          retries: 0,
        };

        try {
          const publisher = new DynamicPublisher(
            rabbitmqWrapper.channel,
            event.subject as Subjects,
          );
          await publisher.publish(event.payload as any);

          await OutboxRepository.markAsPublished(event.id);
          logger.info(
            `[Outbox] Successfully sent event ${event.subject} (ID: ${event.id}) after ${processedEvent.retries} retries`,
          );

          // Remove from tracking on success
          processedEvents.delete(event.id);
        } catch (error: any) {
          processedEvent.lastError = error.message || 'Undefined error';

          if (processedEvent.retries < MAX_RETRIES) {
            processedEvent.retries++;
            processedEvents.set(event.id, processedEvent);

            const delay = getExponentialBackoffDelay(processedEvent.retries - 1);
            logger.warn(
              `[Outbox] Failed to send event ${event.id}. Retry ${processedEvent.retries}/${MAX_RETRIES} scheduled in ${delay}ms. Error: ${processedEvent.lastError}`,
            );

            // Wait before retry (note: this blocks the worker, but ensures sequential processing)
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            // Max retries exceeded, mark as failed
            await OutboxRepository.markAsFailed(
              event.id,
              `Failed after ${MAX_RETRIES} retries: ${processedEvent.lastError}`,
            );

            logger.error(
              `[Outbox] Failed to send event ${event.id} after ${MAX_RETRIES} retries. Marked as FAILED.`,
            );

            // Remove from tracking on permanent failure
            processedEvents.delete(event.id);
          }
        }
      }
    } catch (err) {
      logger.error({ err }, '[Catalog Outbox Worker] Error querying Database');
    } finally {
      isProcessing = false;
    }
  }, 3000);
};
