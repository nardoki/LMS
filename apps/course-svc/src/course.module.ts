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
import { CourseController } from './course.controller';
import { CourseService } from './course.service';
import { CourseRepository } from './repository/course.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    ClientsModule.registerAsync([
      {
        name: GRPC_CLIENTS.MASTERY,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) =>
          buildGrpcClientOptions({
            name: GRPC_CLIENTS.MASTERY,
            url: config.get<string>('MASTERY_SERVICE_TARGET') ?? 'localhost:50053',
            packages: [GRPC_PACKAGES.MASTERY],
            protoFiles: [PROTO_FILES.MASTERY],
          }),
      },
    ]),
  ],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository],
})
export class CourseModule {}
