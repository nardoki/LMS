import { Global, Module } from '@nestjs/common';
import { SupabaseModule } from '@lms/supabase';
import { GatewayStorageService } from './storage.service';

@Global()
@Module({
  imports: [SupabaseModule],
  providers: [GatewayStorageService],
  exports: [GatewayStorageService],
})
export class GatewayStorageModule {}
