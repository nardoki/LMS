import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { GRPC_CLIENTS } from '@lms/common';
import { HealthController } from '../src/health/health.controller';

function makeMockClient(status: 'SERVING' | 'FAIL', service: string) {
  return {
    getService: () => ({
      check: () =>
        status === 'SERVING'
          ? of({ status: 'SERVING', service, timestamp: '2026-01-01T00:00:00.000Z' })
          : throwError(() => new Error('ECONNREFUSED')),
    }),
  };
}

describe('Gateway HealthController', () => {
  it('reports ok when all downstream gRPC services are SERVING', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: GRPC_CLIENTS.COURSE, useValue: makeMockClient('SERVING', 'course-svc') },
        { provide: GRPC_CLIENTS.ASSESSMENT, useValue: makeMockClient('SERVING', 'assessment-svc') },
        { provide: GRPC_CLIENTS.MASTERY, useValue: makeMockClient('SERVING', 'mastery-svc') },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);
    controller.onModuleInit();

    const result = await controller.checkAll();
    expect(result.status).toBe('ok');
    expect(result.services.every((s) => s.status === 'SERVING')).toBe(true);
  });

  it('reports degraded when one gRPC service is unreachable', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: GRPC_CLIENTS.COURSE, useValue: makeMockClient('SERVING', 'course-svc') },
        { provide: GRPC_CLIENTS.ASSESSMENT, useValue: makeMockClient('FAIL', 'assessment-svc') },
        { provide: GRPC_CLIENTS.MASTERY, useValue: makeMockClient('SERVING', 'mastery-svc') },
      ],
    }).compile();

    const controller = moduleRef.get(HealthController);
    controller.onModuleInit();

    const result = await controller.checkAll();
    expect(result.status).toBe('degraded');
    expect(result.services.find((s) => s.service === 'assessment-svc')?.status).toBe('UNREACHABLE');
  });
});
