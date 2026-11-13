import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { SupabaseService } from '@lms/supabase';

function throwMappedDbError(error: { code?: string; message: string }): never {
  if (error.code === '23505') {
    throw new RpcException({ code: GrpcStatus.ALREADY_EXISTS, message: error.message });
  }
  if (error.code === '23503' || error.code === '22P02' || error.code === '23514') {
    throw new RpcException({ code: GrpcStatus.INVALID_ARGUMENT, message: error.message });
  }
  throw new RpcException({ code: GrpcStatus.INTERNAL, message: error.message });
}

@Injectable()
export class CourseRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private db() {
    return this.supabase.getClient('course');
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
    const { data, error } = await this.db()
      .from('courses')
      .insert({
        instructor_id: input.instructor_id,
        title: input.title,
        description: input.description ?? '',
        is_published: Boolean(input.is_published),
      })
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async findCourseById(courseId: string) {
    const { data, error } = await this.db()
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .maybeSingle();

    if (error) throwMappedDbError(error);
    return data;
  }

  async listCourses(publishedOnly = false, instructorId?: string) {
    let query = this.db()
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (publishedOnly) {
      query = query.eq('is_published', true);
    }
    if (instructorId) {
      query = query.eq('instructor_id', instructorId);
    }

    const { data, error } = await query;
    if (error) throwMappedDbError(error);
    return data ?? [];
  }

  async updateCourse(
    courseId: string,
    patch: { title?: string; description?: string; is_published?: boolean },
  ) {
    const { data, error } = await this.db()
      .from('courses')
      .update(patch)
      .eq('id', courseId)
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async deleteCourse(courseId: string) {
    const { error } = await this.db().from('courses').delete().eq('id', courseId);
    if (error) throwMappedDbError(error);
    return { deleted: true, id: courseId };
  }

  // ---------------------------------------------------------------------------
  // Modules
  // ---------------------------------------------------------------------------
  async findModuleById(moduleId: string) {
    const { data, error } = await this.db()
      .from('modules')
      .select('*')
      .eq('id', moduleId)
      .maybeSingle();

    if (error) throwMappedDbError(error);
    return data;
  }

  async listModulesByCourse(courseId: string) {
    const { data, error } = await this.db()
      .from('modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) throwMappedDbError(error);
    return data ?? [];
  }

  async createModule(input: {
    course_id: string;
    title: string;
    order_index: number;
    status: string;
  }) {
    const { data, error } = await this.db()
      .from('modules')
      .insert({
        course_id: input.course_id,
        title: input.title,
        order_index: input.order_index ?? 0,
        status: input.status || 'draft',
      })
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async updateModule(
    moduleId: string,
    patch: { title?: string; order_index?: number; status?: string },
  ) {
    const { data, error } = await this.db()
      .from('modules')
      .update(patch)
      .eq('id', moduleId)
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async deleteModule(moduleId: string) {
    const { error } = await this.db().from('modules').delete().eq('id', moduleId);
    if (error) throwMappedDbError(error);
    return { deleted: true, id: moduleId };
  }

  // ---------------------------------------------------------------------------
  // Lessons
  // ---------------------------------------------------------------------------
  async findLessonById(lessonId: string) {
    const { data, error } = await this.db()
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .maybeSingle();

    if (error) throwMappedDbError(error);
    return data;
  }

  async listLessonsByModuleIds(moduleIds: string[]) {
    if (moduleIds.length === 0) return [];
    const { data, error } = await this.db()
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds)
      .order('order_index', { ascending: true });

    if (error) throwMappedDbError(error);
    return data ?? [];
  }

  async createLesson(input: {
    module_id: string;
    concept_id?: string | null;
    title: string;
    content_markdown: string;
    media_url?: string | null;
    order_index: number;
    status: string;
  }) {
    const { data, error } = await this.db()
      .from('lessons')
      .insert({
        module_id: input.module_id,
        concept_id: input.concept_id || null,
        title: input.title,
        content_markdown: input.content_markdown ?? '',
        media_url: input.media_url || null,
        order_index: input.order_index ?? 0,
        status: input.status || 'draft',
      })
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async updateLesson(
    lessonId: string,
    patch: {
      concept_id?: string | null;
      title?: string;
      content_markdown?: string;
      media_url?: string;
      order_index?: number;
      status?: string;
    },
  ) {
    const { data, error } = await this.db()
      .from('lessons')
      .update(patch)
      .eq('id', lessonId)
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async deleteLesson(lessonId: string) {
    const { error } = await this.db().from('lessons').delete().eq('id', lessonId);
    if (error) throwMappedDbError(error);
    return { deleted: true, id: lessonId };
  }

  // ---------------------------------------------------------------------------
  // Concepts & Prerequisites
  // ---------------------------------------------------------------------------
  async findConceptById(conceptId: string) {
    const { data, error } = await this.db()
      .from('concepts')
      .select('*')
      .eq('id', conceptId)
      .maybeSingle();

    if (error) throwMappedDbError(error);
    return data;
  }

  async listConceptsByCourse(courseId: string) {
    const { data, error } = await this.db()
      .from('concepts')
      .select('*')
      .eq('course_id', courseId)
      .order('difficulty', { ascending: true });

    if (error) throwMappedDbError(error);
    return data ?? [];
  }

  async createConcept(input: {
    course_id: string;
    name: string;
    description: string;
    difficulty: number;
  }) {
    const { data, error } = await this.db()
      .from('concepts')
      .insert({
        course_id: input.course_id,
        name: input.name,
        description: input.description ?? '',
        difficulty: input.difficulty || 1,
      })
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async updateConcept(
    conceptId: string,
    patch: { name?: string; description?: string; difficulty?: number },
  ) {
    const { data, error } = await this.db()
      .from('concepts')
      .update(patch)
      .eq('id', conceptId)
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async deleteConcept(conceptId: string) {
    const { error } = await this.db().from('concepts').delete().eq('id', conceptId);
    if (error) throwMappedDbError(error);
    return { deleted: true, id: conceptId };
  }

  async listPrerequisitesByConceptIds(conceptIds: string[]) {
    if (conceptIds.length === 0) return [];
    const { data, error } = await this.db()
      .from('concept_prerequisites')
      .select('concept_id, requires_concept_id')
      .in('concept_id', conceptIds);

    if (error) throwMappedDbError(error);
    return data ?? [];
  }

  async addPrerequisite(conceptId: string, requiresConceptId: string) {
    const { data, error } = await this.db()
      .from('concept_prerequisites')
      .upsert(
        { concept_id: conceptId, requires_concept_id: requiresConceptId },
        { onConflict: 'concept_id,requires_concept_id' },
      )
      .select('concept_id, requires_concept_id')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async removePrerequisite(conceptId: string, requiresConceptId: string) {
    const { error } = await this.db()
      .from('concept_prerequisites')
      .delete()
      .eq('concept_id', conceptId)
      .eq('requires_concept_id', requiresConceptId);

    if (error) throwMappedDbError(error);
    return { deleted: true, id: `${conceptId}:${requiresConceptId}` };
  }

  // ---------------------------------------------------------------------------
  // Enrollments
  // ---------------------------------------------------------------------------
  async upsertEnrollment(studentId: string, courseId: string) {
    const { data, error } = await this.db()
      .from('enrollments')
      .upsert(
        { student_id: studentId, course_id: courseId, status: 'active' },
        { onConflict: 'student_id,course_id' },
      )
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async listEnrolledStudentIds(courseId: string): Promise<string[]> {
    const { data, error } = await this.db()
      .from('enrollments')
      .select('student_id')
      .eq('course_id', courseId)
      .in('status', ['active', 'completed']);

    if (error) throwMappedDbError(error);
    return (data ?? []).map((row) => String(row.student_id));
  }
}
