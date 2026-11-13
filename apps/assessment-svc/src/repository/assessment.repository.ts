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
export class AssessmentRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private db() {
    return this.supabase.getClient('assessment');
  }

  // ---------------------------------------------------------------------------
  // Quiz Questions & Attempts
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
    const { data, error } = await this.db()
      .from('quiz_questions')
      .insert({
        module_id: input.module_id,
        concept_id: input.concept_id,
        question_text: input.question_text,
        options_json: input.options,
        correct_answer: input.correct_answer,
        difficulty: input.difficulty || 1,
        is_diagnostic: Boolean(input.is_diagnostic),
      })
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async findQuestionById(questionId: string) {
    const { data, error } = await this.db()
      .from('quiz_questions')
      .select('*')
      .eq('id', questionId)
      .maybeSingle();

    if (error) throwMappedDbError(error);
    return data;
  }

  async tagQuestionConcept(questionId: string, conceptId: string) {
    const { data, error } = await this.db()
      .from('quiz_questions')
      .update({ concept_id: conceptId })
      .eq('id', questionId)
      .select('*')
      .maybeSingle();

    if (error) throwMappedDbError(error);
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Question ${questionId} not found`,
      });
    }
    return data;
  }

  async getQuizQuestionsByModule(moduleId: string, diagnosticOnly = false) {
    let query = this.db()
      .from('quiz_questions')
      .select('*')
      .eq('module_id', moduleId)
      .order('difficulty', { ascending: true });

    if (diagnosticOnly) {
      query = query.eq('is_diagnostic', true);
    }
    const { data, error } = await query;
    if (error) throwMappedDbError(error);
    return data ?? [];
  }

  async createAttempt(input: {
    student_id: string;
    question_id: string;
    selected_answer: string;
    correct: boolean;
    time_taken_sec: number;
  }) {
    const { data, error } = await this.db()
      .from('attempts')
      .insert({
        student_id: input.student_id,
        question_id: input.question_id,
        selected_answer: input.selected_answer,
        correct: input.correct,
        time_taken_sec: Math.max(0, input.time_taken_sec || 0),
      })
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
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
    const { data, error } = await this.db()
      .from('assignments')
      .insert({
        module_id: input.module_id,
        concept_id: input.concept_id,
        title: input.title,
        description: input.description ?? '',
        tier: input.tier || 'standard',
        due_date: input.due_date || null,
      })
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async listAssignments(filters: {
    module_id?: string;
    concept_id?: string;
    tier?: string;
  }) {
    let query = this.db()
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.module_id) query = query.eq('module_id', filters.module_id);
    if (filters.concept_id) query = query.eq('concept_id', filters.concept_id);
    if (filters.tier) query = query.eq('tier', filters.tier);

    const { data, error } = await query;
    if (error) throwMappedDbError(error);
    return data ?? [];
  }

  async findAssignmentById(assignmentId: string) {
    const { data, error } = await this.db()
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();

    if (error) throwMappedDbError(error);
    return data;
  }

  async updateAssignment(
    assignmentId: string,
    patch: { title?: string; description?: string; tier?: string; due_date?: string | null },
  ) {
    const { data, error } = await this.db()
      .from('assignments')
      .update(patch)
      .eq('id', assignmentId)
      .select('*')
      .maybeSingle();

    if (error) throwMappedDbError(error);
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Assignment ${assignmentId} not found`,
      });
    }
    return data;
  }

  async deleteAssignment(assignmentId: string) {
    const { error } = await this.db()
      .from('assignments')
      .delete()
      .eq('id', assignmentId);
    if (error) throwMappedDbError(error);
    return { deleted: true, id: assignmentId };
  }

  async tagAssignmentConcept(assignmentId: string, conceptId: string) {
    const { data, error } = await this.db()
      .from('assignments')
      .update({ concept_id: conceptId })
      .eq('id', assignmentId)
      .select('*')
      .maybeSingle();

    if (error) throwMappedDbError(error);
    if (!data) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Assignment ${assignmentId} not found`,
      });
    }
    return data;
  }

  async upsertSubmission(input: {
    assignment_id: string;
    student_id: string;
    file_url?: string;
    content_text?: string;
  }) {
    const { data, error } = await this.db()
      .from('submissions')
      .upsert(
        {
          assignment_id: input.assignment_id,
          student_id: input.student_id,
          file_url: input.file_url || null,
          content_text: input.content_text || null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'assignment_id,student_id' },
      )
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }

  async findSubmissionById(submissionId: string) {
    const { data, error } = await this.db()
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .maybeSingle();

    if (error) throwMappedDbError(error);
    return data;
  }

  async gradeSubmission(input: {
    submission_id: string;
    grade: number;
    feedback?: string;
  }) {
    const { data, error } = await this.db()
      .from('submissions')
      .update({
        grade: input.grade,
        feedback: input.feedback ?? '',
        status: 'graded',
        graded_at: new Date().toISOString(),
      })
      .eq('id', input.submission_id)
      .select('*')
      .single();

    if (error) throwMappedDbError(error);
    return data;
  }
}
