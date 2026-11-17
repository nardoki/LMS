import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '@lms/supabase';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationQueueService } from './queues/notification-queue.service';
import { NotificationWorkerService } from './workers/notification-worker.service';
import { SpacedRepetitionScheduler } from './scheduler/spaced-repetition.scheduler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationQueueService,
    NotificationWorkerService,
    SpacedRepetitionScheduler,
  ],
  exports: [NotificationService, NotificationQueueService],
})
export class NotificationModule {}
