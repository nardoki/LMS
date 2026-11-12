import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { Observable, firstValueFrom, timeout } from 'rxjs';

/**
 * Translates gRPC status codes thrown by domain services into HTTP exceptions
 * at the API Gateway boundary.
 */
export function mapGrpcErrorToHttp(err: unknown): HttpException {
  if (err instanceof HttpException) {
    return err;
  }

  const rpcErr = err as { code?: number; details?: string; message?: string };
  const message = rpcErr?.details || rpcErr?.message || 'Downstream service error';

  switch (rpcErr?.code) {
    case GrpcStatus.INVALID_ARGUMENT:
      return new BadRequestException(message);
    case GrpcStatus.NOT_FOUND:
      return new NotFoundException(message);
    case GrpcStatus.ALREADY_EXISTS:
      return new ConflictException(message);
    case GrpcStatus.PERMISSION_DENIED:
      return new ForbiddenException(message);
    default:
      return new InternalServerErrorException(message);
  }
}

export async function callGrpc<T>(obs: Observable<T>, timeoutMs = 5000): Promise<T> {
  try {
    return await firstValueFrom(obs.pipe(timeout(timeoutMs)));
  } catch (err) {
    throw mapGrpcErrorToHttp(err);
  }
}
