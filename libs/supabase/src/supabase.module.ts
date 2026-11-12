import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PgPoolService } from './pg-pool.service';
import { SupabaseService } from './supabase.service';

@Module({
  imports: [ConfigModule],
  providers: [SupabaseService, PgPoolService],
  exports: [SupabaseService, PgPoolService],
})
export class SupabaseModule {}
