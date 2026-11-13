import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { GRPC_CLIENTS } from '@lms/common';
import { CourseController } from '../src/course.controller';
import { CourseService } from '../src/course.service';
import { CourseRepository } from '../src/repository/course.repository';

describe('CourseController gRPC Health', () => {
  it('returns SERVING for HealthService.Check', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CourseController],
      providers: [
        CourseService,
        { provide: CourseRepository, useValue: {} },
        {
          provide: GRPC_CLIENTS.MASTERY,
          useValue: { getService: () => ({ seedStudentMastery: () => of({ seeded_count: 0 }) }) },
        },
      ],
    }).compile();

    const controller = moduleRef.get(CourseController);
    const res = controller.check({ service: 'course-svc' });

    expect(res.status).toBe('SERVING');
    expect(res.service).toBe('course-svc');
    expect(typeof res.timestamp).toBe('string');
  });
});
