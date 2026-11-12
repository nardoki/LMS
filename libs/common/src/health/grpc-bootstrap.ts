import 'dotenv/config';
import { Logger, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { buildGrpcServerOptions } from '../constants/grpc.constants';

export async function bootstrapGrpcService(params: {
  module: Type<unknown>;
  serviceName: string;
  envUrlKey: string;
  defaultUrl: string;
  packages: string[];
  protoFiles: string[];
}): Promise<void> {
  const url = process.env[params.envUrlKey] ?? params.defaultUrl;
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    params.module,
    buildGrpcServerOptions({
      url,
      packages: params.packages,
      protoFiles: params.protoFiles,
    }),
  );

  await app.listen();
  Logger.log(`${params.serviceName} gRPC listening on ${url}`, 'Bootstrap');
}
