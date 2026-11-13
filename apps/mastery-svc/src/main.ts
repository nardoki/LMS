import { bootstrapGrpcService, GRPC_PACKAGES, PROTO_FILES } from '@lms/common';
import { MasteryModule } from './mastery.module';

void bootstrapGrpcService({
  module: MasteryModule,
  serviceName: 'mastery-svc',
  envUrlKey: 'MASTERY_GRPC_URL',
  defaultUrl: '0.0.0.0:50053',
  packages: [GRPC_PACKAGES.MASTERY, GRPC_PACKAGES.HEALTH],
  protoFiles: [PROTO_FILES.MASTERY, PROTO_FILES.HEALTH],
});
