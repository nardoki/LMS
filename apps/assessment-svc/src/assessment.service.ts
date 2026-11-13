import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { ClientGrpc, RpcException } from '@nestjs/microservices';
import { firstValueFrom, Observable, timeout } from 'rxjs';
import {
  createHealthResponse,
  GRPC_CLIENTS,
  GRPC_SERVICES,
  HealthCheckResponse,
} from '@lms/common';
import { AssessmentRepository } from './repository/assessment.repository';

interface MasteryEventGrpcClient {
  recordAnswer(req: {
    student_id: string;
    concept_id: string;
    correct: boolean;
    difficulty: number;
    time_taken_sec: number;
  }): Observable<unknown>;
  markConceptMastered(req: {
    student_id: string;
    concept_id: string;
    grade: number;
  }): Observable<unknown>;
}

@Injectable()
export class AssessmentService implements OnModuleInit {
  private masteryClient!: MasteryEventGrpcClient;

  constructor(
    private readonly assessmentRepository: AssessmentRepository,
    @Inject(GRPC_CLIENTS.MASTERY) private readonly masteryGrpc: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.masteryClient = this.masteryGrpc.getService<MasteryEventGrpcClient>(
      GRPC_SERVICES.MASTERY,
    );
  }

  checkHealth(): HealthCheckResponse {
    return createHealthResponse('assessment-svc');
  }

  // ---------------------------------------------------------------------------
  // Quizzes & Answer Grading
  // ---------------------------------------------------------------------------
  async createQuestion(input: {
    module_id: string;
    concept_id: string;
    question_text: string;
    options: string[];
    correct_answer: string;
    difficulty: number;
    is_diagnostic: boolean;
  }) {
    const row = await this.assessmentRepository.createQuestion(input);
    return this.toQuestionResponse(row);
  }

  async tagQuestionConcept(questionId: string, conceptId: string) {
    const row = await this.assessmentRepository.tagQuestionConcept(
      questionId,
      conceptId,
    );
    return this.toQuestionResponse(row);
  }

  /**
   * Returns module quiz questions (1-2 diagnostic questions per concept when diagnosticOnly=true).
   * Strips correct_answer so students cannot read answers before submitting.
   */
  async getQuiz(moduleId: string, diagnosticOnly = false) {
    const rows = await this.assessmentRepository.getQuizQuestionsByModule(
      moduleId,
      diagnosticOnly,
    );

    const selected = diagnosticOnly
      ? this.pickUpToTwoPerConcept(rows)
      : rows;

    return {
      module_id: moduleId,
      questions: selected.map((r) => this.toQuestionResponse(r)),
    };
  }

  async submitAnswer(input: {
    student_id: string;
    question_id: string;
    selected_answer: string;
    time_taken_sec: number;
  }) {
    const question = await this.assessmentRepository.findQuestionById(
      input.question_id,
    );
    if (!question) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Question ${input.question_id} not found`,
      });
    }

    const correctAnswer = String(question.correct_answer);
    const correct =
      input.selected_answer.trim().toLowerCase() ===
      correctAnswer.trim().toLowerCase();

    const attempt = await this.assessmentRepository.createAttempt({
      student_id: input.student_id,
      question_id: input.question_id,
      selected_answer: input.selected_answer,
      correct,
      time_taken_sec: input.time_taken_sec,
    });

    // Notify mastery-svc (AnswerRecorded flow -> updates student_concept_mastery)
    await firstValueFrom(
      this.masteryClient
        .recordAnswer({
          student_id: input.student_id,
          concept_id: String(question.concept_id),
          correct,
          difficulty: Number(question.difficulty ?? 1),
          time_taken_sec: input.time_taken_sec ?? 0,
        })
        .pipe(timeout(5000)),
    );

    return {
      attempt_id: String(attempt.id),
      question_id: String(attempt.question_id),
      concept_id: String(question.concept_id),
      correct,
      correct_answer: correctAnswer,
      answered_at: String(attempt.answered_at),
    };
  }

  // ---------------------------------------------------------------------------
  // Assignments & Submissions
  // ---------------------------------------------------------------------------
  async createAssignment(input: {
    module_id: string;
    concept_id: string;
    title: string;
    description: string;
    tier: string;
    due_date?: string;
  }) {
    const row = await this.assessmentRepository.createAssignment(input);
    return this.toAssignmentResponse(row);
  }

  async listAssignments(filters: {
    module_id?: string;
    concept_id?: string;
    tier?: string;
  }) {
    const rows = await this.assessmentRepository.listAssignments(filters);
    return { assignments: rows.map((r) => this.toAssignmentResponse(r)) };
  }

  async getAssignment(assignmentId: string) {
    const row = await this.assessmentRepository.findAssignmentById(assignmentId);
    if (!row) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Assignment ${assignmentId} not found`,
      });
    }
    return this.toAssignmentResponse(row);
  }

  async updateAssignment(input: {
    assignment_id: string;
    title?: string;
    description?: string;
    tier?: string;
    due_date?: string;
  }) {
    const patch: Record<string, unknown> = {};
    if (input.title) patch.title = input.title;
    if (input.description !== undefined && input.description !== '') {
      patch.description = input.description;
    }
    if (input.tier) patch.tier = input.tier;
    if (input.due_date !== undefined && input.due_date !== '') {
      patch.due_date = input.due_date;
    }
    const row = await this.assessmentRepository.updateAssignment(
      input.assignment_id,
      patch,
    );
    return this.toAssignmentResponse(row);
  }

  async deleteAssignment(assignmentId: string) {
    return this.assessmentRepository.deleteAssignment(assignmentId);
  }

  async tagAssignmentConcept(assignmentId: string, conceptId: string) {
    const row = await this.assessmentRepository.tagAssignmentConcept(
      assignmentId,
      conceptId,
    );
    return this.toAssignmentResponse(row);
  }

  async submitAssignment(input: {
    assignment_id: string;
    student_id: string;
    file_url?: string;
    content_text?: string;
  }) {
    const assignment = await this.assessmentRepository.findAssignmentById(
      input.assignment_id,
    );
    if (!assignment) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Assignment ${input.assignment_id} not found`,
      });
    }
    if (!input.file_url && !input.content_text) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Provide either file_url or content_text',
      });
    }

    const row = await this.assessmentRepository.upsertSubmission(input);
    return this.toSubmissionResponse(row);
  }

  async gradeSubmission(input: {
    submission_id: string;
    grade: number;
    feedback?: string;
  }) {
    if (input.grade < 0 || input.grade > 100) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Grade must be between 0 and 100',
      });
    }

    const existing = await this.assessmentRepository.findSubmissionById(
      input.submission_id,
    );
    if (!existing) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Submission ${input.submission_id} not found`,
      });
    }

    const assignment = await this.assessmentRepository.findAssignmentById(
      String(existing.assignment_id),
    );
    const graded = await this.assessmentRepository.gradeSubmission(input);

    if (assignment) {
      await firstValueFrom(
        this.masteryClient
          .markConceptMastered({
            student_id: String(graded.student_id),
            concept_id: String(assignment.concept_id),
            grade: input.grade,
          })
          .pipe(timeout(5000)),
      );
    }

    return this.toSubmissionResponse(graded);
  }

  private pickUpToTwoPerConcept(rows: Array<Record<string, unknown>>) {
    const counts = new Map<string, number>();
    const picked: Array<Record<string, unknown>> = [];
    for (const row of rows) {
      const cid = String(row.concept_id);
      const count = counts.get(cid) ?? 0;
      if (count < 2) {
        counts.set(cid, count + 1);
        picked.push(row);
      }
    }
    return picked;
  }

  private toQuestionResponse(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      module_id: String(row.module_id),
      concept_id: String(row.concept_id),
      question_text: String(row.question_text),
      options: Array.isArray(row.options_json)
        ? row.options_json.map(String)
        : [],
      difficulty: Number(row.difficulty ?? 1),
      is_diagnostic: Boolean(row.is_diagnostic),
    };
  }

  private toAssignmentResponse(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      module_id: String(row.module_id),
      concept_id: String(row.concept_id),
      title: String(row.title),
      description: String(row.description ?? ''),
      tier: String(row.tier ?? 'standard'),
      due_date: row.due_date ? String(row.due_date) : '',
    };
  }

  private toSubmissionResponse(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      assignment_id: String(row.assignment_id),
      student_id: String(row.student_id),
      file_url: row.file_url ? String(row.file_url) : '',
      content_text: row.content_text ? String(row.content_text) : '',
      grade: row.grade !== null && row.grade !== undefined ? Number(row.grade) : 0,
      feedback: row.feedback ? String(row.feedback) : '',
      status: String(row.status),
      submitted_at: String(row.submitted_at ?? ''),
      graded_at: row.graded_at ? String(row.graded_at) : '',
    };
  }
}
