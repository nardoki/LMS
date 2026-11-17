import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import {
  NotificationQueueService,
  SpacedReviewJobData,
  GradeAlertJobData,
  BlindSpotJobData,
} from '../queues/notification-queue.service';
import { NotificationService } from '../notification.service';

@Injectable()
export class NotificationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorkerService.name);
  private redisConnection: Redis | null = null;
  private reviewWorker: Worker<SpacedReviewJobData> | null = null;
  private gradeWorker: Worker<GradeAlertJobData> | null = null;
  private blindSpotWorker: Worker<BlindSpotJobData> | null = null;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly queueService: NotificationQueueService,
  ) {}

  onModuleInit(): void {
    const redisHost = process.env.REDIS_HOST || '127.0.0.1';
    const redisPort = Number(process.env.REDIS_PORT || 6379);

    try {
      this.redisConnection = new Redis({
        host: redisHost,
        port: redisPort,
        maxRetriesPerRequest: null,
        lazyConnect: true,
        connectTimeout: 3000,
      });

      this.redisConnection.on('error', (err) => {
        this.logger.warn(`BullMQ worker Redis offline: ${err.message}. Worker paused.`);
      });

      // 1. Spaced Repetition Worker
      this.reviewWorker = new Worker<SpacedReviewJobData>(
        'spaced-repetition',
        async (job: Job<SpacedReviewJobData>) => {
          this.logger.log(`Processing spaced review job ${job.id}`);
          const count = await this.notificationService.processDueSpacedReviews(job.data);
          return { processed: count };
        },
        { connection: this.redisConnection },
      );

      // 2. Grade Alerts Worker
      this.gradeWorker = new Worker<GradeAlertJobData>(
        'grade-alerts',
        async (job: Job<GradeAlertJobData>) => {
          this.logger.log(`Processing grade alert job ${job.id} for student ${job.data.studentId}`);
          await this.notificationService.processGradeAlert(job.data);
          return { success: true };
        },
        { connection: this.redisConnection },
      );

      // 3. Blind Spot Alerts Worker
      this.blindSpotWorker = new Worker<BlindSpotJobData>(
        'blind-spot-alerts',
        async (job: Job<BlindSpotJobData>) => {
          this.logger.log(`Processing blind spot alert job ${job.id} for student ${job.data.studentId}`);
          await this.notificationService.processBlindSpotAlert(job.data);
          return { success: true };
        },
        { connection: this.redisConnection },
      );

      this.reviewWorker.on('completed', (job) => {
        this.logger.log(`Review reminder job ${job.id} completed successfully`);
      });

      this.gradeWorker.on('completed', (job) => {
        this.logger.log(`Grade alert job ${job.id} completed successfully`);
      });

      this.blindSpotWorker.on('completed', (job) => {
        this.logger.log(`Blind spot alert job ${job.id} completed successfully`);
      });

      this.redisConnection.connect().catch(() => {
        // Suppress initial connection warning in environments without active Redis
      });
    } catch (err: unknown) {
      this.logger.warn(`Worker initialization skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.reviewWorker?.close();
      await this.gradeWorker?.close();
      await this.blindSpotWorker?.close();
      if (this.redisConnection) {
        await this.redisConnection.quit();
      }
    } catch {
      // Ignore disconnect errors during teardown
    }
  }
}
