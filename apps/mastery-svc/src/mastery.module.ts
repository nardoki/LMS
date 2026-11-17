import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import {
  buildGrpcClientOptions,
  GRPC_CLIENTS,
  GRPC_PACKAGES,
  PROTO_FILES,
} from '@lms/common';
import { SupabaseModule } from '@lms/supabase';
import { AnswerRecordedConsumer } from './events/answer-recorded.consumer';
import { MasteryController } from './mastery.controller';
import { MasteryService } from './mastery.service';
import { MasteryRepository } from './repository/mastery.repository';
import { RedisCacheService } from './cache/redis-cache.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    ClientsModule.registerAsync([
      {
        name: GRPC_CLIENTS.COURSE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) =>
          buildGrpcClientOptions({
            name: GRPC_CLIENTS.COURSE,
            url: config.get<string>('COURSE_SERVICE_TARGET') ?? 'localhost:50051',
            packages: [GRPC_PACKAGES.COURSE],
            protoFiles: [PROTO_FILES.COURSE],
          }),
      },
    ]),
  ],
  controllers: [MasteryController],
  providers: [
    MasteryService,
    MasteryRepository,
    AnswerRecordedConsumer,
    RedisCacheService,
  ],
  exports: [RedisCacheService],
})
export class MasteryModule {}
