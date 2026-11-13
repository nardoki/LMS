import { bootstrapGrpcService, GRPC_PACKAGES, PROTO_FILES } from '@lms/common';
import { CourseModule } from './course.module';

void bootstrapGrpcService({
  module: CourseModule,
  serviceName: 'course-svc',
  envUrlKey: 'COURSE_GRPC_URL',
  defaultUrl: '0.0.0.0:50051',
  packages: [GRPC_PACKAGES.COURSE, GRPC_PACKAGES.HEALTH],
  protoFiles: [PROTO_FILES.COURSE, PROTO_FILES.HEALTH],
});
