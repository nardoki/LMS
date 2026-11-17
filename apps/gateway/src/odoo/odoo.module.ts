import { Module } from '@nestjs/common';
import { SupabaseModule } from '@lms/supabase';
import { OdooController } from './odoo.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [OdooController],
})
export class OdooModule {}
