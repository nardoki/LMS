import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { GRPC_CLIENTS } from '@lms/common';
import { AssessmentController } from '../src/assessment.controller';
import { AssessmentService } from '../src/assessment.service';
import { AssessmentRepository } from '../src/repository/assessment.repository';

describe('AssessmentController & Service', () => {
  it('returns SERVING for HealthService.Check', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AssessmentController],
      providers: [
        AssessmentService,
        { provide: AssessmentRepository, useValue: {} },
        {
          provide: GRPC_CLIENTS.MASTERY,
          useValue: { getService: () => ({}) },
        },
      ],
    }).compile();

    const controller = moduleRef.get(AssessmentController);
    const res = controller.check({ service: 'assessment-svc' });

    expect(res.status).toBe('SERVING');
    expect(res.service).toBe('assessment-svc');
  });

  it('caps diagnostic quiz at 2 questions per concept and strips correct_answer', async () => {
    const mockRepo = {
      getQuizQuestionsByModule: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([
        { id: 'q1', module_id: 'm1', concept_id: 'c1', question_text: 'Q1', options_json: ['a', 'b'], correct_answer: 'a', difficulty: 1, is_diagnostic: true },
        { id: 'q2', module_id: 'm1', concept_id: 'c1', question_text: 'Q2', options_json: ['a', 'b'], correct_answer: 'b', difficulty: 2, is_diagnostic: true },
        { id: 'q3', module_id: 'm1', concept_id: 'c1', question_text: 'Q3', options_json: ['a', 'b'], correct_answer: 'a', difficulty: 3, is_diagnostic: true },
        { id: 'q4', module_id: 'm1', concept_id: 'c2', question_text: 'Q4', options_json: ['x', 'y'], correct_answer: 'x', difficulty: 1, is_diagnostic: true },
      ]),
    } as unknown as AssessmentRepository;

    const service = new AssessmentService(mockRepo, { getService: () => ({}) } as never);
    const quiz = await service.getQuiz('m1', true);

    expect(quiz.questions).toHaveLength(3);
    expect('correct_answer' in quiz.questions[0]).toBe(false);
  });

  it('grades SubmitAnswer, stores attempt, and notifies MasteryService', async () => {
    const recordAnswerMock = jest.fn(() => of({ concept_id: 'c1', mastery: 0.45 }));
    const mockRepo = {
      findQuestionById: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: 'q1',
        concept_id: 'c1',
        correct_answer: '<main>',
        difficulty: 2,
      }),
      createAttempt: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: 'att-1',
        question_id: 'q1',
        answered_at: '2026-11-12T12:00:00Z',
      }),
    } as unknown as AssessmentRepository;

    const service = new AssessmentService(mockRepo, {
      getService: () => ({ recordAnswer: recordAnswerMock }),
    } as never);
    service.onModuleInit();

    const result = await service.submitAnswer({
      student_id: 'stu-1',
      question_id: 'q1',
      selected_answer: '<main>',
      time_taken_sec: 12,
    });

    expect(result.correct).toBe(true);
    expect(recordAnswerMock).toHaveBeenCalledWith({
      student_id: 'stu-1',
      concept_id: 'c1',
      correct: true,
      difficulty: 2,
      time_taken_sec: 12,
    });
  });
});
