import { Observable } from 'rxjs';

export interface HealthCheckRequest {
  service: string;
}

export interface HealthCheckResponse {
  status: 'SERVING' | 'NOT_SERVING';
  service: string;
  timestamp: string;
}

export interface HealthServiceClient {
  check(request: HealthCheckRequest): Observable<HealthCheckResponse>;
}

export function createHealthResponse(service: string): HealthCheckResponse {
  return {
    status: 'SERVING',
    service,
    timestamp: new Date().toISOString(),
  };
}
