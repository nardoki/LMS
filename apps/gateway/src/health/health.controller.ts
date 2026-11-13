import { Controller, Get, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom, timeout } from 'rxjs';
import {
  GatewayHealthResponse,
  GRPC_CLIENTS,
  GRPC_SERVICES,
  HealthServiceClient,
  Public,
  ServiceHealthStatus,
} from '@lms/common';

interface ServiceClientEntry {
  name: string;
  grpcClient: ClientGrpc;
  health?: HealthServiceClient;
}

@ApiTags('health')
@Controller('health')
export class HealthController implements OnModuleInit {
  private readonly entries: ServiceClientEntry[];

  constructor(
    @Inject(GRPC_CLIENTS.COURSE) courseClient: ClientGrpc,
    @Inject(GRPC_CLIENTS.ASSESSMENT) assessmentClient: ClientGrpc,
    @Inject(GRPC_CLIENTS.MASTERY) masteryClient: ClientGrpc,
  ) {
    this.entries = [
      { name: 'course-svc', grpcClient: courseClient },
      { name: 'assessment-svc', grpcClient: assessmentClient },
      { name: 'mastery-svc', grpcClient: masteryClient },
    ];
  }

  onModuleInit(): void {
    for (const entry of this.entries) {
      entry.health = entry.grpcClient.getService<HealthServiceClient>(
        GRPC_SERVICES.HEALTH,
      );
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Check gateway and downstream gRPC service health' })
  async checkAll(): Promise<GatewayHealthResponse> {
    const services: ServiceHealthStatus[] = await Promise.all(
      this.entries.map(async (entry): Promise<ServiceHealthStatus> => {
        try {
          const response = await firstValueFrom(
            entry.health!.check({ service: entry.name }).pipe(timeout(2000)),
          );
          return {
            service: entry.name,
            status: response.status === 'SERVING' ? 'SERVING' : 'UNREACHABLE',
            timestamp: response.timestamp,
          };
        } catch (err) {
          return {
            service: entry.name,
            status: 'UNREACHABLE',
            error: err instanceof Error ? err.message : 'Unknown gRPC error',
          };
        }
      }),
    );

    const allHealthy = services.every((svc) => svc.status === 'SERVING');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    };
  }
}
