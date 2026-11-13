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
import { CourseRepository } from './repository/course.repository';

interface MasteryGrpcClient {
  seedStudentMastery(req: {
    student_id: string;
    concept_ids: string[];
  }): Observable<{ seeded_count: number }>;
}

@Injectable()
export class CourseService implements OnModuleInit {
  private masteryClient!: MasteryGrpcClient;

  constructor(
    private readonly courseRepository: CourseRepository,
    @Inject(GRPC_CLIENTS.MASTERY) private readonly masteryGrpc: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.masteryClient = this.masteryGrpc.getService<MasteryGrpcClient>(
      GRPC_SERVICES.MASTERY,
    );
  }

  checkHealth(): HealthCheckResponse {
    return createHealthResponse('course-svc');
  }

  // ---------------------------------------------------------------------------
  // Ownership & Graph Guards
  // ---------------------------------------------------------------------------
  private async requireCourse(courseId: string) {
    const course = await this.courseRepository.findCourseById(courseId);
    if (!course) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Course ${courseId} not found`,
      });
    }
    return course;
  }

  private async assertCourseOwner(
    courseId: string,
    actorId: string,
    actorRole: string,
  ) {
    const course = await this.requireCourse(courseId);
    if (actorRole !== 'admin' && course.instructor_id !== actorId) {
      throw new RpcException({
        code: GrpcStatus.PERMISSION_DENIED,
        message: 'Only the owning instructor or an admin can modify this course',
      });
    }
    return course;
  }

  private async requireModuleOwned(
    moduleId: string,
    actorId: string,
    actorRole: string,
  ) {
    const mod = await this.courseRepository.findModuleById(moduleId);
    if (!mod) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Module ${moduleId} not found`,
      });
    }
    await this.assertCourseOwner(String(mod.course_id), actorId, actorRole);
    return mod;
  }

  private async requireLessonOwned(
    lessonId: string,
    actorId: string,
    actorRole: string,
  ) {
    const lesson = await this.courseRepository.findLessonById(lessonId);
    if (!lesson) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Lesson ${lessonId} not found`,
      });
    }
    const mod = await this.requireModuleOwned(
      String(lesson.module_id),
      actorId,
      actorRole,
    );
    return { lesson, module: mod };
  }

  private async requireConceptOwned(
    conceptId: string,
    actorId: string,
    actorRole: string,
  ) {
    const concept = await this.courseRepository.findConceptById(conceptId);
    if (!concept) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Concept ${conceptId} not found`,
      });
    }
    await this.assertCourseOwner(String(concept.course_id), actorId, actorRole);
    return concept;
  }

  // ---------------------------------------------------------------------------
  // Courses
  // ---------------------------------------------------------------------------
  async createCourse(input: {
    instructor_id: string;
    title: string;
    description: string;
    is_published: boolean;
  }) {
    const row = await this.courseRepository.createCourse(input);
    return this.toCourseDto(row);
  }

  async listCourses(publishedOnly = false, instructorId?: string) {
    const rows = await this.courseRepository.listCourses(
      publishedOnly,
      instructorId || undefined,
    );
    return { courses: rows.map((r) => this.toCourseDto(r)) };
  }

  async getCourse(courseId: string) {
    const course = await this.requireCourse(courseId);
    const [modules, concepts] = await Promise.all([
      this.courseRepository.listModulesByCourse(courseId),
      this.courseRepository.listConceptsByCourse(courseId),
    ]);

    const moduleIds = modules.map((m) => String(m.id));
    const conceptIds = concepts.map((c) => String(c.id));

    const [lessons, prerequisites] = await Promise.all([
      this.courseRepository.listLessonsByModuleIds(moduleIds),
      this.courseRepository.listPrerequisitesByConceptIds(conceptIds),
    ]);

    return {
      course: this.toCourseDto(course),
      modules: modules.map((m) => this.toModuleDto(m)),
      lessons: lessons.map((l) => this.toLessonDto(l)),
      concepts: concepts.map((c) => this.toConceptDto(c)),
      prerequisites: prerequisites.map((p) => ({
        concept_id: String(p.concept_id),
        requires_concept_id: String(p.requires_concept_id),
      })),
    };
  }

  async updateCourse(input: {
    course_id: string;
    actor_id: string;
    actor_role: string;
    title?: string;
    description?: string;
    has_is_published?: boolean;
    is_published?: boolean;
  }) {
    await this.assertCourseOwner(input.course_id, input.actor_id, input.actor_role);
    const patch: Record<string, unknown> = {};
    if (input.title) patch.title = input.title;
    if (input.description !== undefined && input.description !== '') {
      patch.description = input.description;
    }
    if (input.has_is_published) patch.is_published = Boolean(input.is_published);

    const row = await this.courseRepository.updateCourse(input.course_id, patch);
    return this.toCourseDto(row);
  }

  async deleteCourse(input: {
    course_id: string;
    actor_id: string;
    actor_role: string;
  }) {
    await this.assertCourseOwner(input.course_id, input.actor_id, input.actor_role);
    return this.courseRepository.deleteCourse(input.course_id);
  }

  // ---------------------------------------------------------------------------
  // Modules
  // ---------------------------------------------------------------------------
  async addModule(input: {
    course_id: string;
    actor_id: string;
    actor_role: string;
    title: string;
    order_index: number;
    status: string;
  }) {
    await this.assertCourseOwner(input.course_id, input.actor_id, input.actor_role);
    const row = await this.courseRepository.createModule(input);
    return this.toModuleDto(row);
  }

  async updateModule(input: {
    module_id: string;
    actor_id: string;
    actor_role: string;
    title?: string;
    order_index?: number;
    has_order_index?: boolean;
    status?: string;
  }) {
    await this.requireModuleOwned(input.module_id, input.actor_id, input.actor_role);
    const patch: Record<string, unknown> = {};
    if (input.title) patch.title = input.title;
    if (input.has_order_index) patch.order_index = input.order_index;
    if (input.status) patch.status = input.status;

    const row = await this.courseRepository.updateModule(input.module_id, patch);
    return this.toModuleDto(row);
  }

  async deleteModule(input: {
    module_id: string;
    actor_id: string;
    actor_role: string;
  }) {
    await this.requireModuleOwned(input.module_id, input.actor_id, input.actor_role);
    return this.courseRepository.deleteModule(input.module_id);
  }

  // ---------------------------------------------------------------------------
  // Lessons
  // ---------------------------------------------------------------------------
  async addLesson(input: {
    module_id: string;
    actor_id: string;
    actor_role: string;
    concept_id?: string;
    title: string;
    content_markdown: string;
    media_url?: string;
    order_index: number;
    status: string;
  }) {
    const mod = await this.requireModuleOwned(
      input.module_id,
      input.actor_id,
      input.actor_role,
    );

    if (input.concept_id) {
      await this.assertConceptInCourse(input.concept_id, String(mod.course_id));
    }

    const row = await this.courseRepository.createLesson(input);
    return this.toLessonDto(row);
  }

  async getLesson(lessonId: string) {
    const row = await this.courseRepository.findLessonById(lessonId);
    if (!row) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Lesson ${lessonId} not found`,
      });
    }
    return this.toLessonDto(row);
  }

  async updateLesson(input: {
    lesson_id: string;
    actor_id: string;
    actor_role: string;
    concept_id?: string;
    title?: string;
    content_markdown?: string;
    media_url?: string;
    order_index?: number;
    has_order_index?: boolean;
    status?: string;
  }) {
    const { module } = await this.requireLessonOwned(
      input.lesson_id,
      input.actor_id,
      input.actor_role,
    );

    const patch: Record<string, unknown> = {};
    if (input.concept_id) {
      await this.assertConceptInCourse(input.concept_id, String(module.course_id));
      patch.concept_id = input.concept_id;
    }
    if (input.title) patch.title = input.title;
    if (input.content_markdown) patch.content_markdown = input.content_markdown;
    if (input.media_url) patch.media_url = input.media_url;
    if (input.has_order_index) patch.order_index = input.order_index;
    if (input.status) patch.status = input.status;

    const row = await this.courseRepository.updateLesson(input.lesson_id, patch);
    return this.toLessonDto(row);
  }

  async deleteLesson(input: {
    lesson_id: string;
    actor_id: string;
    actor_role: string;
  }) {
    await this.requireLessonOwned(input.lesson_id, input.actor_id, input.actor_role);
    return this.courseRepository.deleteLesson(input.lesson_id);
  }

  async tagLessonConcept(input: {
    lesson_id: string;
    concept_id: string;
    actor_id: string;
    actor_role: string;
  }) {
    const { module } = await this.requireLessonOwned(
      input.lesson_id,
      input.actor_id,
      input.actor_role,
    );
    await this.assertConceptInCourse(input.concept_id, String(module.course_id));

    const row = await this.courseRepository.updateLesson(input.lesson_id, {
      concept_id: input.concept_id,
    });
    return this.toLessonDto(row);
  }

  // ---------------------------------------------------------------------------
  // Concepts & Prerequisite Graph (DAG)
  // ---------------------------------------------------------------------------
  private async assertConceptInCourse(conceptId: string, courseId: string) {
    const concept = await this.courseRepository.findConceptById(conceptId);
    if (!concept || String(concept.course_id) !== courseId) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: `Concept ${conceptId} does not belong to course ${courseId}`,
      });
    }
    return concept;
  }

  async createConcept(input: {
    course_id: string;
    actor_id: string;
    actor_role: string;
    name: string;
    description: string;
    difficulty: number;
  }) {
    await this.assertCourseOwner(input.course_id, input.actor_id, input.actor_role);
    const row = await this.courseRepository.createConcept(input);
    return this.toConceptDto(row);
  }

  async updateConcept(input: {
    concept_id: string;
    actor_id: string;
    actor_role: string;
    name?: string;
    description?: string;
    difficulty?: number;
  }) {
    await this.requireConceptOwned(input.concept_id, input.actor_id, input.actor_role);
    const patch: Record<string, unknown> = {};
    if (input.name) patch.name = input.name;
    if (input.description) patch.description = input.description;
    if (input.difficulty && input.difficulty > 0) patch.difficulty = input.difficulty;

    const row = await this.courseRepository.updateConcept(input.concept_id, patch);
    return this.toConceptDto(row);
  }

  async deleteConcept(input: {
    concept_id: string;
    actor_id: string;
    actor_role: string;
  }) {
    await this.requireConceptOwned(input.concept_id, input.actor_id, input.actor_role);
    return this.courseRepository.deleteConcept(input.concept_id);
  }

  async addConceptPrerequisite(input: {
    concept_id: string;
    requires_concept_id: string;
    actor_id: string;
    actor_role: string;
  }) {
    if (input.concept_id === input.requires_concept_id) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'A concept cannot require itself as a prerequisite',
      });
    }

    const target = await this.requireConceptOwned(
      input.concept_id,
      input.actor_id,
      input.actor_role,
    );
    await this.assertConceptInCourse(
      input.requires_concept_id,
      String(target.course_id),
    );

    // Ensure adding (concept_id -> requires_concept_id) will not introduce a cycle
    const courseConcepts = await this.courseRepository.listConceptsByCourse(
      String(target.course_id),
    );
    const existingLinks =
      await this.courseRepository.listPrerequisitesByConceptIds(
        courseConcepts.map((c) => String(c.id)),
      );

    if (
      this.wouldCreateCycle(
        existingLinks.map((l) => ({
          conceptId: String(l.concept_id),
          requiresId: String(l.requires_concept_id),
        })),
        input.concept_id,
        input.requires_concept_id,
      )
    ) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: 'Cannot add prerequisite: circular dependency detected',
      });
    }

    const row = await this.courseRepository.addPrerequisite(
      input.concept_id,
      input.requires_concept_id,
    );
    return {
      concept_id: String(row.concept_id),
      requires_concept_id: String(row.requires_concept_id),
    };
  }

  async removeConceptPrerequisite(input: {
    concept_id: string;
    requires_concept_id: string;
    actor_id: string;
    actor_role: string;
  }) {
    await this.requireConceptOwned(input.concept_id, input.actor_id, input.actor_role);
    return this.courseRepository.removePrerequisite(
      input.concept_id,
      input.requires_concept_id,
    );
  }

  async getCoursePath(courseId: string) {
    await this.requireCourse(courseId);
    const concepts = await this.courseRepository.listConceptsByCourse(courseId);
    const links = await this.courseRepository.listPrerequisitesByConceptIds(
      concepts.map((c) => String(c.id)),
    );

    const prereqByConcept = new Map<string, string[]>();
    for (const link of links) {
      const cid = String(link.concept_id);
      const list = prereqByConcept.get(cid) ?? [];
      list.push(String(link.requires_concept_id));
      prereqByConcept.set(cid, list);
    }

    return {
      course_id: courseId,
      nodes: concepts.map((c) => {
        const prereqs = prereqByConcept.get(String(c.id)) ?? [];
        return {
          concept: this.toConceptDto(c),
          prerequisite_ids: prereqs,
          unlocked: prereqs.length === 0,
        };
      }),
    };
  }

  // ---------------------------------------------------------------------------
  // Enrollment -> Seeds mastery-svc via gRPC
  // ---------------------------------------------------------------------------
  async enroll(studentId: string, courseId: string) {
    await this.requireCourse(courseId);
    const enrollment = await this.courseRepository.upsertEnrollment(
      studentId,
      courseId,
    );

    const concepts = await this.courseRepository.listConceptsByCourse(courseId);
    const conceptIds = concepts.map((c) => String(c.id));

    let seededCount = 0;
    if (conceptIds.length > 0) {
      const seedRes = await firstValueFrom(
        this.masteryClient
          .seedStudentMastery({
            student_id: studentId,
            concept_ids: conceptIds,
          })
          .pipe(timeout(5000)),
      );
      seededCount = seedRes.seeded_count;
    }

    return {
      id: String(enrollment.id),
      student_id: String(enrollment.student_id),
      course_id: String(enrollment.course_id),
      status: String(enrollment.status),
      enrolled_at: String(enrollment.enrolled_at),
      seeded_concepts_count: seededCount,
    };
  }

  async getCourseEnrollments(courseId: string) {
    await this.requireCourse(courseId);
    const studentIds = await this.courseRepository.listEnrolledStudentIds(courseId);
    return { course_id: courseId, student_ids: studentIds };
  }

  /**
   * Checks if adding edge (conceptId requires requiresId) forms a cycle in the DAG.
   */
  wouldCreateCycle(
    edges: Array<{ conceptId: string; requiresId: string }>,
    conceptId: string,
    requiresId: string,
  ): boolean {
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
      const list = adj.get(edge.conceptId) ?? [];
      list.push(edge.requiresId);
      adj.set(edge.conceptId, list);
    }

    // Walk prerequisites starting from requiresId; if we reach conceptId, a cycle exists
    const visited = new Set<string>();
    const queue = [requiresId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === conceptId) {
        return true;
      }
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of adj.get(current) ?? []) {
        queue.push(next);
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Mappers
  // ---------------------------------------------------------------------------
  private toCourseDto(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      instructor_id: String(row.instructor_id),
      title: String(row.title),
      description: String(row.description ?? ''),
      is_published: Boolean(row.is_published),
      created_at: String(row.created_at ?? ''),
    };
  }

  private toModuleDto(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      course_id: String(row.course_id),
      title: String(row.title),
      order_index: Number(row.order_index ?? 0),
      status: String(row.status ?? 'draft'),
    };
  }

  private toLessonDto(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      module_id: String(row.module_id),
      concept_id: row.concept_id ? String(row.concept_id) : '',
      title: String(row.title),
      content_markdown: String(row.content_markdown ?? ''),
      media_url: row.media_url ? String(row.media_url) : '',
      order_index: Number(row.order_index ?? 0),
      status: String(row.status ?? 'draft'),
    };
  }

  private toConceptDto(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      course_id: String(row.course_id),
      name: String(row.name),
      description: String(row.description ?? ''),
      difficulty: Number(row.difficulty ?? 1),
    };
  }
}
