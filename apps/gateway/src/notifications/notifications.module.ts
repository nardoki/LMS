import { Module } from '@nestjs/common';
import { SupabaseModule } from '@lms/supabase';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
