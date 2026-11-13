import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import {
  buildGrpcClientOptions,
  GRPC_CLIENTS,
  GRPC_PACKAGES,
  PROTO_FILES,
} from '@lms/common';

const GRPC_CLIENT_DEFINITIONS = [
  {
    name: GRPC_CLIENTS.COURSE,
    envKey: 'COURSE_SERVICE_TARGET',
    defaultTarget: 'localhost:50051',
    packages: [GRPC_PACKAGES.COURSE, GRPC_PACKAGES.HEALTH],
    protoFiles: [PROTO_FILES.COURSE, PROTO_FILES.HEALTH],
  },
  {
    name: GRPC_CLIENTS.ASSESSMENT,
    envKey: 'ASSESSMENT_SERVICE_TARGET',
    defaultTarget: 'localhost:50052',
    packages: [GRPC_PACKAGES.ASSESSMENT, GRPC_PACKAGES.HEALTH],
    protoFiles: [PROTO_FILES.ASSESSMENT, PROTO_FILES.HEALTH],
  },
  {
    name: GRPC_CLIENTS.MASTERY,
    envKey: 'MASTERY_SERVICE_TARGET',
    defaultTarget: 'localhost:50053',
    packages: [GRPC_PACKAGES.MASTERY, GRPC_PACKAGES.HEALTH],
    protoFiles: [PROTO_FILES.MASTERY, PROTO_FILES.HEALTH],
  },
];

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync(
      GRPC_CLIENT_DEFINITIONS.map((def) => ({
        name: def.name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) =>
          buildGrpcClientOptions({
            name: def.name,
            url: config.get<string>(def.envKey) ?? def.defaultTarget,
            packages: def.packages,
            protoFiles: def.protoFiles,
          }),
      })),
    ),
  ],
  exports: [ClientsModule],
})
export class GrpcClientsModule {}
