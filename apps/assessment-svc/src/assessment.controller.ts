import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { GRPC_SERVICES, HealthCheckRequest, HealthCheckResponse } from '@lms/common';
import { AssessmentService } from './assessment.service';

@Controller()
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @GrpcMethod(GRPC_SERVICES.HEALTH, 'Check')
  check(_request: HealthCheckRequest): HealthCheckResponse {
    return this.assessmentService.checkHealth();
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'CreateQuestion')
  createQuestion(request: {
    module_id: string;
    concept_id: string;
    question_text: string;
    options: string[];
    correct_answer: string;
    difficulty: number;
    is_diagnostic: boolean;
  }) {
    return this.assessmentService.createQuestion(request);
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'TagQuestionConcept')
  tagQuestionConcept(request: { target_id: string; concept_id: string }) {
    return this.assessmentService.tagQuestionConcept(
      request.target_id,
      request.concept_id,
    );
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'GetQuiz')
  getQuiz(request: { module_id: string; diagnostic_only: boolean }) {
    return this.assessmentService.getQuiz(
      request.module_id,
      Boolean(request.diagnostic_only),
    );
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'SubmitAnswer')
  submitAnswer(request: {
    student_id: string;
    question_id: string;
    selected_answer: string;
    time_taken_sec: number;
  }) {
    return this.assessmentService.submitAnswer(request);
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'CreateAssignment')
  createAssignment(request: {
    module_id: string;
    concept_id: string;
    title: string;
    description: string;
    tier: string;
    due_date?: string;
  }) {
    return this.assessmentService.createAssignment(request);
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'ListAssignments')
  listAssignments(request: {
    module_id?: string;
    concept_id?: string;
    tier?: string;
  }) {
    return this.assessmentService.listAssignments(request);
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'GetAssignment')
  getAssignment(request: { assignment_id: string }) {
    return this.assessmentService.getAssignment(request.assignment_id);
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'UpdateAssignment')
  updateAssignment(request: {
    assignment_id: string;
    title?: string;
    description?: string;
    tier?: string;
    due_date?: string;
  }) {
    return this.assessmentService.updateAssignment(request);
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'DeleteAssignment')
  deleteAssignment(request: { assignment_id: string }) {
    return this.assessmentService.deleteAssignment(request.assignment_id);
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'TagAssignmentConcept')
  tagAssignmentConcept(request: { target_id: string; concept_id: string }) {
    return this.assessmentService.tagAssignmentConcept(
      request.target_id,
      request.concept_id,
    );
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'SubmitAssignment')
  submitAssignment(request: {
    assignment_id: string;
    student_id: string;
    file_url?: string;
    content_text?: string;
  }) {
    return this.assessmentService.submitAssignment(request);
  }

  @GrpcMethod(GRPC_SERVICES.ASSESSMENT, 'GradeSubmission')
  gradeSubmission(request: {
    submission_id: string;
    grade: number;
    feedback?: string;
  }) {
    return this.assessmentService.gradeSubmission(request);
  }
}
