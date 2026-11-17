import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationQueueService } from '../queues/notification-queue.service';
import { NotificationService } from '../notification.service';

@Injectable()
export class SpacedRepetitionScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SpacedRepetitionScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private initialTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly queueService: NotificationQueueService,
    private readonly notificationService: NotificationService,
  ) {}

  onModuleInit(): void {
    // Schedule initial review scan 15s after startup
    this.initialTimeout = setTimeout(() => {
      this.triggerScan();
    }, 15000);

    // Schedule regular cron interval every 10 minutes
    const intervalMs = Number(process.env.SPACED_REVIEW_INTERVAL_MS || 600000);
    this.timer = setInterval(() => {
      this.triggerScan();
    }, intervalMs);

    this.logger.log(`Spaced repetition scheduler active (interval: ${intervalMs / 1000}s)`);
  }

  private async triggerScan(): Promise<void> {
    try {
      // First try enqueuing through BullMQ
      await this.queueService.enqueueSpacedRepetitionScan();
    } catch {
      // Fallback: direct database scan
      await this.notificationService.processDueSpacedReviews();
    }
  }

  onModuleDestroy(): void {
    if (this.initialTimeout) clearTimeout(this.initialTimeout);
    if (this.timer) clearInterval(this.timer);
  }
}
