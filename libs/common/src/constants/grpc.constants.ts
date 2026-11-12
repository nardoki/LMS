import { join } from 'path';
import { existsSync } from 'fs';
import { ClientProviderOptions, GrpcOptions, Transport } from '@nestjs/microservices';

export const GRPC_PACKAGES = {
  HEALTH: 'health',
  COURSE: 'course',
  ASSESSMENT: 'assessment',
  MASTERY: 'mastery',
} as const;

export const GRPC_SERVICES = {
  HEALTH: 'HealthService',
  COURSE: 'CourseService',
  ASSESSMENT: 'AssessmentService',
  MASTERY: 'MasteryService',
} as const;

export const GRPC_CLIENTS = {
  COURSE: 'COURSE_GRPC_CLIENT',
  ASSESSMENT: 'ASSESSMENT_GRPC_CLIENT',
  MASTERY: 'MASTERY_GRPC_CLIENT',
} as const;

export const PROTO_FILES = {
  HEALTH: 'health.proto',
  COURSE: 'course.proto',
  ASSESSMENT: 'assessment.proto',
  MASTERY: 'mastery.proto',
} as const;

const GRPC_LOADER_OPTIONS = {
  // Preserve snake_case proto field names (e.g. student_id) instead of camelCasing them
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

/**
 * Resolves a .proto contract file from libs/proto/ regardless of whether the
 * process runs from source (ts-node/nest start) or compiled dist/.
 */
export function resolveProtoPath(filename: string): string {
  const candidates = [
    join(process.cwd(), 'libs', 'proto', filename),
    join(__dirname, '..', '..', '..', 'libs', 'proto', filename),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export function buildGrpcServerOptions(params: {
  url: string;
  packages: string[];
  protoFiles: string[];
}): GrpcOptions {
  return {
    transport: Transport.GRPC,
    options: {
      url: params.url,
      package: params.packages,
      protoPath: params.protoFiles.map(resolveProtoPath),
      loader: GRPC_LOADER_OPTIONS,
    },
  };
}

export function buildGrpcClientOptions(params: {
  name: string;
  url: string;
  packages: string[];
  protoFiles: string[];
}): ClientProviderOptions {
  return {
    name: params.name,
    transport: Transport.GRPC,
    options: {
      url: params.url,
      package: params.packages,
      protoPath: params.protoFiles.map(resolveProtoPath),
      loader: GRPC_LOADER_OPTIONS,
    },
  };
}
