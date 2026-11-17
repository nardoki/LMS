import { bootstrapGrpcService, GRPC_PACKAGES, PROTO_FILES } from '@lms/common';
import { NotificationModule } from './notification.module';

void bootstrapGrpcService({
  module: NotificationModule,
  serviceName: 'notification-svc',
  envUrlKey: 'NOTIFICATION_GRPC_URL',
  defaultUrl: '0.0.0.0:50054',
  packages: [GRPC_PACKAGES.HEALTH],
  protoFiles: [PROTO_FILES.HEALTH],
});
