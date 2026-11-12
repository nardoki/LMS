import { IsOptional, IsString } from 'class-validator';

export class HealthQueryDto {
  @IsOptional()
  @IsString()
  service?: string;
}

export interface ServiceHealthStatus {
  service: string;
  status: 'SERVING' | 'UNREACHABLE';
  timestamp?: string;
  error?: string;
}

export interface GatewayHealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: ServiceHealthStatus[];
}
