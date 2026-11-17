import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export interface SpacedReviewJobData {
  studentId?: string;
  conceptId?: string;
  courseId?: string;
}

export interface GradeAlertJobData {
  studentId: string;
  assignmentId: string;
  submissionId: string;
  grade: number;
  passed: boolean;
  conceptId?: string;
}

export interface BlindSpotJobData {
  studentId: string;
  conceptId: string;
  courseId?: string;
  conceptName?: string;
}

@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private redisConnection: Redis | null = null;
  private reviewQueue: Queue<SpacedReviewJobData> | null = null;
  private gradeQueue: Queue<GradeAlertJobData> | null = null;
  private blindSpotQueue: Queue<BlindSpotJobData> | null = null;
  private isConnected = false;

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

      this.redisConnection.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`BullMQ connected to Redis at ${redisHost}:${redisPort}`);
      });

      this.redisConnection.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`BullMQ Redis unavailable: ${err.message}. Operating in fallback mode.`);
      });

      this.reviewQueue = new Queue<SpacedReviewJobData>('spaced-repetition', {
        connection: this.redisConnection,
      });

      this.gradeQueue = new Queue<GradeAlertJobData>('grade-alerts', {
        connection: this.redisConnection,
      });

      this.blindSpotQueue = new Queue<BlindSpotJobData>('blind-spot-alerts', {
        connection: this.redisConnection,
      });

      this.redisConnection.connect().catch((err) => {
        this.isConnected = false;
        this.logger.warn(`Initial Redis connection for BullMQ skipped: ${err.message}`);
      });
    } catch (err: unknown) {
      this.isConnected = false;
      this.logger.warn(`BullMQ setup exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async enqueueSpacedRepetitionScan(data: SpacedReviewJobData = {}): Promise<void> {
    if (this.reviewQueue && this.isConnected) {
      await this.reviewQueue.add('scan-due-reviews', data, {
        removeOnComplete: true,
        attempts: 3,
      });
      this.logger.log(`Enqueued spaced repetition scan job`);
    } else {
      this.logger.debug(`Redis queue offline; skipping queueing spaced repetition scan`);
    }
  }

  async enqueueGradeAlert(data: GradeAlertJobData): Promise<void> {
    if (this.gradeQueue && this.isConnected) {
      await this.gradeQueue.add('send-grade-alert', data, {
        removeOnComplete: true,
        attempts: 3,
      });
      this.logger.log(`Enqueued grade alert job for student ${data.studentId}`);
    } else {
      this.logger.debug(`Redis queue offline; skipping queueing grade alert`);
    }
  }

  async enqueueBlindSpotAlert(data: BlindSpotJobData): Promise<void> {
    if (this.blindSpotQueue && this.isConnected) {
      await this.blindSpotQueue.add('send-blind-spot-warning', data, {
        removeOnComplete: true,
        attempts: 3,
      });
      this.logger.log(`Enqueued blind spot warning job for student ${data.studentId}`);
    } else {
      this.logger.debug(`Redis queue offline; skipping queueing blind spot warning`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.reviewQueue?.close();
      await this.gradeQueue?.close();
      await this.blindSpotQueue?.close();
      if (this.redisConnection) {
        await this.redisConnection.quit();
      }
    } catch {
      // Ignore disconnect errors during shutdown
    }
  }
}
