import { Controller } from '@nestjs/common';
import { EventPattern, GrpcMethod, Payload } from '@nestjs/microservices';
import {
  AnswerRecordedEvent,
  EVENT_PATTERNS,
  GRPC_SERVICES,
  HealthCheckRequest,
  HealthCheckResponse,
} from '@lms/common';
import { AnswerRecordedConsumer } from './events/answer-recorded.consumer';
import { MasteryService } from './mastery.service';

@Controller()
export class MasteryController {
  constructor(
    private readonly masteryService: MasteryService,
    private readonly answerRecordedConsumer: AnswerRecordedConsumer,
  ) {}

  @GrpcMethod(GRPC_SERVICES.HEALTH, 'Check')
  check(_request: HealthCheckRequest): HealthCheckResponse {
    return this.masteryService.checkHealth();
  }

  @GrpcMethod(GRPC_SERVICES.MASTERY, 'SeedStudentMastery')
  seedStudentMastery(request: { student_id: string; concept_ids?: string[] }) {
    return this.masteryService.seedStudentMastery(
      request.student_id,
      request.concept_ids ?? [],
    );
  }

  @GrpcMethod(GRPC_SERVICES.MASTERY, 'RecordAnswer')
  recordAnswer(request: {
    student_id: string;
    concept_id: string;
    correct: boolean;
    difficulty: number;
    time_taken_sec: number;
  }) {
    return this.masteryService.recordAnswer(request);
  }

  @EventPattern(EVENT_PATTERNS.ANSWER_RECORDED)
  onAnswerRecorded(@Payload() event: AnswerRecordedEvent) {
    return this.answerRecordedConsumer.handle(event);
  }

  @GrpcMethod(GRPC_SERVICES.MASTERY, 'MarkConceptMastered')
  markConceptMastered(request: {
    student_id: string;
    concept_id: string;
    grade: number;
  }) {
    return this.masteryService.markConceptMastered(request);
  }

  @GrpcMethod(GRPC_SERVICES.MASTERY, 'GetHeatmap')
  getHeatmap(request: { student_id: string; course_id: string }) {
    return this.masteryService.getHeatmap(request.student_id, request.course_id);
  }

  @GrpcMethod(GRPC_SERVICES.MASTERY, 'GetSmartQueue')
  getSmartQueue(request: { student_id: string; course_id: string }) {
    return this.masteryService.getSmartQueue(
      request.student_id,
      request.course_id,
    );
  }

  @GrpcMethod(GRPC_SERVICES.MASTERY, 'GetClassReport')
  getClassReport(request: { course_id: string }) {
    return this.masteryService.getClassReport(request.course_id);
  }
}
