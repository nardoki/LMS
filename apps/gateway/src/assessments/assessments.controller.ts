import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  OnModuleInit,
  Param,
  ParseBoolPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Observable } from 'rxjs';
import {
  AuthUser,
  callGrpc,
  CurrentUser,
  GRPC_CLIENTS,
  GRPC_SERVICES,
  ParsePgUuidPipe,
  Role,
  Roles,
} from '@lms/common';
import {
  GatewayStorageService,
  SUBMISSION_MIME_TYPES,
  type UploadedMediaFile,
} from '../storage/storage.service';
import {
  CreateAssignmentDto,
  CreateQuestionDto,
  GradeSubmissionDto,
  SubmitAnswerDto,
  SubmitAssignmentDto,
  TagAssessmentConceptDto,
  UpdateAssignmentDto,
} from './dto/assessment-tagging.dto';

interface AssessmentGrpcClient {
  createQuestion(req: Record<string, unknown>): Observable<unknown>;
  tagQuestionConcept(req: { target_id: string; concept_id: string }): Observable<unknown>;
  getQuiz(req: { module_id: string; diagnostic_only: boolean }): Observable<unknown>;
  submitAnswer(req: Record<string, unknown>): Observable<unknown>;
  createAssignment(req: Record<string, unknown>): Observable<unknown>;
  listAssignments(req: Record<string, unknown>): Observable<unknown>;
  getAssignment(req: { assignment_id: string }): Observable<unknown>;
  updateAssignment(req: Record<string, unknown>): Observable<unknown>;
  deleteAssignment(req: { assignment_id: string }): Observable<unknown>;
  tagAssignmentConcept(req: { target_id: string; concept_id: string }): Observable<unknown>;
  submitAssignment(req: Record<string, unknown>): Observable<unknown>;
  gradeSubmission(req: Record<string, unknown>): Observable<unknown>;
}

@ApiTags('assessments')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentsController implements OnModuleInit {
  private assessmentClient!: AssessmentGrpcClient;

  constructor(
    @Inject(GRPC_CLIENTS.ASSESSMENT) private readonly grpcClient: ClientGrpc,
    private readonly storageService: GatewayStorageService,
  ) {}

  onModuleInit(): void {
    this.assessmentClient =
      this.grpcClient.getService<AssessmentGrpcClient>(GRPC_SERVICES.ASSESSMENT);
  }

  // ---------------------------------------------------------------------------
  // Quizzes & Answers
  // ---------------------------------------------------------------------------
  @Post('modules/:moduleId/questions')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Create a quiz question tagged with a concept' })
  createQuestion(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return callGrpc(
      this.assessmentClient.createQuestion({
        module_id: moduleId,
        concept_id: dto.conceptId,
        question_text: dto.questionText,
        options: dto.options,
        correct_answer: dto.correctAnswer,
        difficulty: dto.difficulty ?? 1,
        is_diagnostic: Boolean(dto.isDiagnostic),
      }),
    );
  }

  @Patch('questions/:questionId/concept')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Tag an existing quiz question with a concept' })
  tagQuestionConcept(
    @Param('questionId') questionId: string,
    @Body() dto: TagAssessmentConceptDto,
  ) {
    return callGrpc(
      this.assessmentClient.tagQuestionConcept({
        target_id: questionId,
        concept_id: dto.conceptId,
      }),
    );
  }

  @Get('modules/:moduleId/quiz')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Get quiz questions for a module (1-2 per concept if diagnosticOnly)' })
  @ApiQuery({ name: 'diagnosticOnly', required: false, type: Boolean })
  getQuiz(
    @Param('moduleId') moduleId: string,
    @Query('diagnosticOnly', new ParseBoolPipe({ optional: true }))
    diagnosticOnly?: boolean,
  ) {
    return callGrpc(
      this.assessmentClient.getQuiz({
        module_id: moduleId,
        diagnostic_only: Boolean(diagnosticOnly),
      }),
    );
  }

  @Post('quiz/answer')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Submit a quiz answer, store attempt, and update mastery' })
  submitAnswer(@CurrentUser() user: AuthUser, @Body() dto: SubmitAnswerDto) {
    return callGrpc(
      this.assessmentClient.submitAnswer({
        student_id: user.id,
        question_id: dto.questionId,
        selected_answer: dto.selectedAnswer,
        time_taken_sec: dto.timeTakenSec ?? 0,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Assignments & Submissions
  // ---------------------------------------------------------------------------
  @Post('modules/:moduleId/assignments')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Create a tiered assignment tagged with a concept' })
  createAssignment(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return callGrpc(
      this.assessmentClient.createAssignment({
        module_id: moduleId,
        concept_id: dto.conceptId,
        title: dto.title,
        description: dto.description ?? '',
        tier: dto.tier ?? 'standard',
        due_date: dto.dueDate ?? '',
      }),
    );
  }

  @Get('assignments')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'List assignments filtered by module, concept, or tier' })
  @ApiQuery({ name: 'moduleId', required: false })
  @ApiQuery({ name: 'conceptId', required: false })
  @ApiQuery({ name: 'tier', required: false })
  listAssignments(
    @Query('moduleId') moduleId?: string,
    @Query('conceptId') conceptId?: string,
    @Query('tier') tier?: string,
  ) {
    return callGrpc(
      this.assessmentClient.listAssignments({
        module_id: moduleId ?? '',
        concept_id: conceptId ?? '',
        tier: tier ?? '',
      }),
    );
  }

  @Get('assignments/:assignmentId')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Get assignment details' })
  getAssignment(@Param('assignmentId') assignmentId: string) {
    return callGrpc(
      this.assessmentClient.getAssignment({ assignment_id: assignmentId }),
    );
  }

  @Patch('assignments/:assignmentId')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Update an assignment' })
  updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return callGrpc(
      this.assessmentClient.updateAssignment({
        assignment_id: assignmentId,
        title: dto.title ?? '',
        description: dto.description ?? '',
        tier: dto.tier ?? '',
        due_date: dto.dueDate ?? '',
      }),
    );
  }

  @Delete('assignments/:assignmentId')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Delete an assignment' })
  deleteAssignment(@Param('assignmentId') assignmentId: string) {
    return callGrpc(
      this.assessmentClient.deleteAssignment({ assignment_id: assignmentId }),
    );
  }

  @Patch('assignments/:assignmentId/concept')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Tag an existing assignment with a concept' })
  tagAssignmentConcept(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: TagAssessmentConceptDto,
  ) {
    return callGrpc(
      this.assessmentClient.tagAssignmentConcept({
        target_id: assignmentId,
        concept_id: dto.conceptId,
      }),
    );
  }

  @Post('assignments/:assignmentId/submit')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Submit an assignment (text or URL)' })
  submitAssignment(
    @CurrentUser() user: AuthUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return callGrpc(
      this.assessmentClient.submitAssignment({
        assignment_id: assignmentId,
        student_id: user.id,
        file_url: dto.fileUrl ?? '',
        content_text: dto.contentText ?? '',
      }),
    );
  }

  @Post('assignments/:assignmentId/submit-file')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload submission file to Supabase Storage & submit' })
  async submitAssignmentFile(
    @CurrentUser() user: AuthUser,
    @Param('assignmentId') assignmentId: string,
    @UploadedFile() file: UploadedMediaFile,
  ) {
    await callGrpc(
      this.assessmentClient.getAssignment({ assignment_id: assignmentId }),
    );

    const uploaded = await this.storageService.uploadObject({
      bucket: 'submissions',
      objectPrefix: `assignments/${assignmentId}/${user.id}`,
      file,
      allowedMimeTypes: SUBMISSION_MIME_TYPES,
    });

    const submission = await callGrpc(
      this.assessmentClient.submitAssignment({
        assignment_id: assignmentId,
        student_id: user.id,
        file_url: uploaded.path,
        content_text: '',
      }),
    );

    return {
      storagePath: uploaded.path,
      signedUrl: uploaded.signedUrl,
      submission,
    };
  }

  @Post('submissions/:submissionId/grade')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Grade a submission and mark concept mastered if passing' })
  gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return callGrpc(
      this.assessmentClient.gradeSubmission({
        submission_id: submissionId,
        grade: dto.grade,
        feedback: dto.feedback ?? '',
      }),
    );
  }
}
