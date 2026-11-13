import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { GRPC_CLIENTS } from '@lms/common';
import { AnswerRecordedConsumer } from '../src/events/answer-recorded.consumer';
import { MasteryController } from '../src/mastery.controller';
import { MasteryService } from '../src/mastery.service';
import { MasteryRepository } from '../src/repository/mastery.repository';

describe('MasteryController gRPC Health', () => {
  it('returns SERVING for HealthService.Check', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MasteryController],
      providers: [
        MasteryService,
        AnswerRecordedConsumer,
        { provide: MasteryRepository, useValue: {} },
        {
          provide: GRPC_CLIENTS.COURSE,
          useValue: {
            getService: () => ({
              getCoursePath: () => of({ course_id: 'c1', nodes: [] }),
              getCourseEnrollments: () => of({ course_id: 'c1', student_ids: [] }),
            }),
          },
        },
      ],
    }).compile();

    const controller = moduleRef.get(MasteryController);
    const res = controller.check({ service: 'mastery-svc' });

    expect(res.status).toBe('SERVING');
    expect(res.service).toBe('mastery-svc');
  });
});
