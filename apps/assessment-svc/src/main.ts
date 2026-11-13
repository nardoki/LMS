import { bootstrapGrpcService, GRPC_PACKAGES, PROTO_FILES } from '@lms/common';
import { AssessmentModule } from './assessment.module';

void bootstrapGrpcService({
  module: AssessmentModule,
  serviceName: 'assessment-svc',
  envUrlKey: 'ASSESSMENT_GRPC_URL',
  defaultUrl: '0.0.0.0:50052',
  packages: [GRPC_PACKAGES.ASSESSMENT, GRPC_PACKAGES.HEALTH],
  protoFiles: [PROTO_FILES.ASSESSMENT, PROTO_FILES.HEALTH],
});
