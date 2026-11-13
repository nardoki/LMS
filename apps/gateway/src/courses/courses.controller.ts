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
import {
  AuthUser,
  callGrpc,
  CurrentUser,
  GRPC_CLIENTS,
  GRPC_SERVICES,
  ParsePgUuidPipe,
  Public,
  Role,
  Roles,
} from '@lms/common';
import { CourseGrpcServiceClient } from './courses-grpc.types';
import {
  AddPrerequisiteDto,
  CreateConceptDto,
  CreateCourseDto,
  CreateLessonDto,
  CreateModuleDto,
  TagConceptDto,
  UpdateConceptDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from './dto/course.dto';
import {
  GatewayStorageService,
  LESSON_MIME_TYPES,
  type UploadedMediaFile,
} from '../storage/storage.service';

@ApiTags('courses')
@Controller('courses')
export class CoursesController implements OnModuleInit {
  private courseClient!: CourseGrpcServiceClient;

  constructor(
    @Inject(GRPC_CLIENTS.COURSE) private readonly grpcClient: ClientGrpc,
    private readonly storageService: GatewayStorageService,
  ) {}

  onModuleInit(): void {
    this.courseClient = this.grpcClient.getService<CourseGrpcServiceClient>(
      GRPC_SERVICES.COURSE,
    );
  }

  // ---------------------------------------------------------------------------
  // Courses
  // ---------------------------------------------------------------------------
  @Public()
  @Get()
  @ApiOperation({ summary: 'List courses (optionally filter published only)' })
  @ApiQuery({ name: 'publishedOnly', required: false, type: Boolean })
  listCourses(
    @Query('publishedOnly', new ParseBoolPipe({ optional: true }))
    publishedOnly?: boolean,
  ) {
    return callGrpc(
      this.courseClient.listCourses({ published_only: Boolean(publishedOnly) }),
    );
  }

  @Public()
  @Get(':courseId')
  @ApiOperation({ summary: 'Get course details, modules, lessons, concepts, prerequisites' })
  getCourse(@Param('courseId') courseId: string) {
    return callGrpc(this.courseClient.getCourse({ course_id: courseId }));
  }

  @Post()
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new course (instructor/admin)' })
  createCourse(@CurrentUser() user: AuthUser, @Body() dto: CreateCourseDto) {
    return callGrpc(
      this.courseClient.createCourse({
        instructor_id: user.id,
        title: dto.title,
        description: dto.description ?? '',
        is_published: Boolean(dto.isPublished),
      }),
    );
  }

  @Patch(':courseId')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Update a course owned by the instructor' })
  updateCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return callGrpc(
      this.courseClient.updateCourse({
        course_id: courseId,
        actor_id: user.id,
        actor_role: user.role,
        title: dto.title ?? '',
        description: dto.description ?? '',
        has_is_published: dto.isPublished !== undefined,
        is_published: Boolean(dto.isPublished),
      }),
    );
  }

  @Delete(':courseId')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a course owned by the instructor' })
  deleteCourse(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
  ) {
    return callGrpc(
      this.courseClient.deleteCourse({
        course_id: courseId,
        actor_id: user.id,
        actor_role: user.role,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Modules
  // ---------------------------------------------------------------------------
  @Post(':courseId/modules')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Add a module to a course' })
  addModule(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
    @Body() dto: CreateModuleDto,
  ) {
    return callGrpc(
      this.courseClient.addModule({
        course_id: courseId,
        actor_id: user.id,
        actor_role: user.role,
        title: dto.title,
        order_index: dto.orderIndex ?? 0,
        status: dto.status ?? 'draft',
      }),
    );
  }

  @Patch('modules/:moduleId')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Update a module' })
  updateModule(
    @CurrentUser() user: AuthUser,
    @Param('moduleId') moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return callGrpc(
      this.courseClient.updateModule({
        module_id: moduleId,
        actor_id: user.id,
        actor_role: user.role,
        title: dto.title ?? '',
        order_index: dto.orderIndex ?? 0,
        has_order_index: dto.orderIndex !== undefined,
        status: dto.status ?? '',
      }),
    );
  }

  @Delete('modules/:moduleId')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a module' })
  deleteModule(
    @CurrentUser() user: AuthUser,
    @Param('moduleId') moduleId: string,
  ) {
    return callGrpc(
      this.courseClient.deleteModule({
        module_id: moduleId,
        actor_id: user.id,
        actor_role: user.role,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Lessons & Supabase Storage Media Upload
  // ---------------------------------------------------------------------------
  @Post('modules/:moduleId/lessons')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Add a lesson to a module' })
  addLesson(
    @CurrentUser() user: AuthUser,
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return callGrpc(
      this.courseClient.addLesson({
        module_id: moduleId,
        actor_id: user.id,
        actor_role: user.role,
        concept_id: dto.conceptId ?? '',
        title: dto.title,
        content_markdown: dto.contentMarkdown ?? '',
        media_url: dto.mediaUrl ?? '',
        order_index: dto.orderIndex ?? 0,
        status: dto.status ?? 'draft',
      }),
    );
  }

  @Get('lessons/:lessonId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single lesson' })
  getLesson(@Param('lessonId') lessonId: string) {
    return callGrpc(this.courseClient.getLesson({ lesson_id: lessonId }));
  }

  @Patch('lessons/:lessonId')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Update a lesson' })
  updateLesson(
    @CurrentUser() user: AuthUser,
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return callGrpc(
      this.courseClient.updateLesson({
        lesson_id: lessonId,
        actor_id: user.id,
        actor_role: user.role,
        concept_id: dto.conceptId ?? '',
        title: dto.title ?? '',
        content_markdown: dto.contentMarkdown ?? '',
        media_url: dto.mediaUrl ?? '',
        order_index: dto.orderIndex ?? 0,
        has_order_index: dto.orderIndex !== undefined,
        status: dto.status ?? '',
      }),
    );
  }

  @Delete('lessons/:lessonId')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a lesson' })
  deleteLesson(
    @CurrentUser() user: AuthUser,
    @Param('lessonId') lessonId: string,
  ) {
    return callGrpc(
      this.courseClient.deleteLesson({
        lesson_id: lessonId,
        actor_id: user.id,
        actor_role: user.role,
      }),
    );
  }

  @Patch('lessons/:lessonId/concept')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Tag a lesson with a course concept' })
  tagLessonConcept(
    @CurrentUser() user: AuthUser,
    @Param('lessonId') lessonId: string,
    @Body() dto: TagConceptDto,
  ) {
    return callGrpc(
      this.courseClient.tagLessonConcept({
        lesson_id: lessonId,
        concept_id: dto.conceptId,
        actor_id: user.id,
        actor_role: user.role,
      }),
    );
  }

  @Post('lessons/:lessonId/media')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
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
  @ApiOperation({ summary: 'Upload lesson video/file to Supabase Storage' })
  async uploadLessonMedia(
    @CurrentUser() user: AuthUser,
    @Param('lessonId') lessonId: string,
    @UploadedFile() file: UploadedMediaFile,
  ) {
    // Verify lesson ownership before uploading media
    await callGrpc(this.courseClient.getLesson({ lesson_id: lessonId }));

    const uploaded = await this.storageService.uploadObject({
      bucket: 'lesson-media',
      objectPrefix: `lessons/${lessonId}`,
      file,
      allowedMimeTypes: LESSON_MIME_TYPES,
    });
    const updatedLesson = await callGrpc(
      this.courseClient.updateLesson({
        lesson_id: lessonId,
        actor_id: user.id,
        actor_role: user.role,
        media_url: uploaded.path,
      }),
    );

    return {
      storagePath: uploaded.path,
      signedUrl: uploaded.signedUrl,
      lesson: updatedLesson,
    };
  }

  // ---------------------------------------------------------------------------
  // Concepts, Prerequisites & Course Path
  // ---------------------------------------------------------------------------
  @Post(':courseId/concepts')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Create a concept in a course' })
  createConcept(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
    @Body() dto: CreateConceptDto,
  ) {
    return callGrpc(
      this.courseClient.createConcept({
        course_id: courseId,
        actor_id: user.id,
        actor_role: user.role,
        name: dto.name,
        description: dto.description ?? '',
        difficulty: dto.difficulty ?? 1,
      }),
    );
  }

  @Patch('concepts/:conceptId')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Update a concept' })
  updateConcept(
    @CurrentUser() user: AuthUser,
    @Param('conceptId') conceptId: string,
    @Body() dto: UpdateConceptDto,
  ) {
    return callGrpc(
      this.courseClient.updateConcept({
        concept_id: conceptId,
        actor_id: user.id,
        actor_role: user.role,
        name: dto.name ?? '',
        description: dto.description ?? '',
        difficulty: dto.difficulty ?? 0,
      }),
    );
  }

  @Delete('concepts/:conceptId')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a concept' })
  deleteConcept(
    @CurrentUser() user: AuthUser,
    @Param('conceptId') conceptId: string,
  ) {
    return callGrpc(
      this.courseClient.deleteConcept({
        concept_id: conceptId,
        actor_id: user.id,
        actor_role: user.role,
      }),
    );
  }

  @Post('concepts/:conceptId/prerequisites')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Link a prerequisite concept (cycle-checked DAG)' })
  addPrerequisite(
    @CurrentUser() user: AuthUser,
    @Param('conceptId') conceptId: string,
    @Body() dto: AddPrerequisiteDto,
  ) {
    return callGrpc(
      this.courseClient.addConceptPrerequisite({
        concept_id: conceptId,
        requires_concept_id: dto.requiresConceptId,
        actor_id: user.id,
        actor_role: user.role,
      }),
    );
  }

  @Delete('concepts/:conceptId/prerequisites/:requiresConceptId')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Remove a prerequisite link' })
  removePrerequisite(
    @CurrentUser() user: AuthUser,
    @Param('conceptId') conceptId: string,
    @Param('requiresConceptId') requiresConceptId: string,
  ) {
    return callGrpc(
      this.courseClient.removeConceptPrerequisite({
        concept_id: conceptId,
        requires_concept_id: requiresConceptId,
        actor_id: user.id,
        actor_role: user.role,
      }),
    );
  }

  @Get(':courseId/path')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the course concept prerequisite graph' })
  getCoursePath(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
  ) {
    return callGrpc(
      this.courseClient.getCoursePath({
        course_id: courseId,
        student_id: user.id,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Enrollment (seeds not_started rows in mastery-svc)
  // ---------------------------------------------------------------------------
  @Post(':courseId/enroll')
  @ApiBearerAuth()
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Enroll current user and seed concept mastery rows' })
  enroll(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
  ) {
    return callGrpc(
      this.courseClient.enroll({
        student_id: user.id,
        course_id: courseId,
      }),
    );
  }
}
