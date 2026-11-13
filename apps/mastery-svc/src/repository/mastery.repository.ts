import { Injectable } from '@nestjs/common';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { SupabaseService } from '@lms/supabase';

export interface MasteryRow {
  id: string;
  student_id: string;
  concept_id: string;
  mastery: number;
  confidence: number;
  status: string;
  last_practiced_at: string | null;
  next_review_at: string | null;
}

@Injectable()
export class MasteryRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private db() {
    return this.supabase.getClient('mastery');
  }

  async getStudentMastery(studentId: string): Promise<MasteryRow[]> {
    const { data, error } = await this.db()
      .from('student_concept_mastery')
      .select('*')
      .eq('student_id', studentId);

    if (error) {
      throw new RpcException({ code: GrpcStatus.INTERNAL, message: error.message });
    }
    return (data ?? []) as MasteryRow[];
  }

  async getConceptRow(
    studentId: string,
    conceptId: string,
  ): Promise<MasteryRow | null> {
    const { data, error } = await this.db()
      .from('student_concept_mastery')
      .select('*')
      .eq('student_id', studentId)
      .eq('concept_id', conceptId)
      .maybeSingle();

    if (error) {
      throw new RpcException({ code: GrpcStatus.INTERNAL, message: error.message });
    }
    return (data as MasteryRow | null) ?? null;
  }

  async upsertMasteryRow(input: {
    student_id: string;
    concept_id: string;
    mastery: number;
    confidence: number;
    status: string;
    last_practiced_at: string;
    next_review_at: string;
  }): Promise<MasteryRow> {
    const { data, error } = await this.db()
      .from('student_concept_mastery')
      .upsert(input, { onConflict: 'student_id,concept_id' })
      .select('*')
      .single();

    if (error) {
      throw new RpcException({ code: GrpcStatus.INVALID_ARGUMENT, message: error.message });
    }
    return data as MasteryRow;
  }

  async getMasteryForCourse(
    conceptIds: string[],
    studentIds?: string[],
  ): Promise<MasteryRow[]> {
    if (conceptIds.length === 0) {
      return [];
    }
    let query = this.db()
      .from('student_concept_mastery')
      .select('*')
      .in('concept_id', conceptIds);

    if (studentIds && studentIds.length > 0) {
      query = query.in('student_id', studentIds);
    }

    const { data, error } = await query;
    if (error) {
      throw new RpcException({ code: GrpcStatus.INTERNAL, message: error.message });
    }
    return (data ?? []) as MasteryRow[];
  }

  /**
   * Seeds initial `not_started` mastery rows for a newly enrolled student.
   * Existing rows are preserved via ignoreDuplicates.
   */
  async seedConcepts(studentId: string, conceptIds: string[]): Promise<number> {
    if (conceptIds.length === 0) {
      return 0;
    }

    const rows = conceptIds.map((conceptId) => ({
      student_id: studentId,
      concept_id: conceptId,
      mastery: 0,
      confidence: 0,
      status: 'not_started',
    }));

    const { data, error } = await this.db()
      .from('student_concept_mastery')
      .upsert(rows, { onConflict: 'student_id,concept_id', ignoreDuplicates: true })
      .select('id');

    if (error) {
      throw new RpcException({ code: GrpcStatus.INTERNAL, message: error.message });
    }

    return data?.length ?? rows.length;
  }
}
