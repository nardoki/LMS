import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard, RolesGuard } from '@lms/common';
import { AssessmentsModule } from './assessments/assessments.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { GrpcClientsModule } from './grpc/grpc-clients.module';
import { HealthController } from './health/health.controller';
import { MasteryModule } from './mastery/mastery.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OdooModule } from './odoo/odoo.module';
import { GatewayStorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    GrpcClientsModule,
    GatewayStorageModule,
    AuthModule,
    CoursesModule,
    AssessmentsModule,
    MasteryModule,
    NotificationsModule,
    OdooModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
