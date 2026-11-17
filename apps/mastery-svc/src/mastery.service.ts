import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable, timeout } from 'rxjs';
import {
  createHealthResponse,
  GRPC_CLIENTS,
  GRPC_SERVICES,
  HealthCheckResponse,
} from '@lms/common';
import {
  ConceptMasterySnapshot,
  MasteryEngine,
  MasteryStatus,
} from './engine/mastery.engine';
import { MasteryRepository, MasteryRow } from './repository/mastery.repository';
import { RedisCacheService } from './cache/redis-cache.service';

interface CourseGrpcPathNode {
  concept: { id: string; name: string; difficulty: number };
  prerequisite_ids: string[];
}

interface CourseGrpcClient {
  getCoursePath(req: {
    course_id: string;
    student_id: string;
  }): Observable<{ course_id: string; nodes: CourseGrpcPathNode[] }>;
  getCourseEnrollments(req: {
    course_id: string;
  }): Observable<{ course_id: string; student_ids: string[] }>;
}

@Injectable()
export class MasteryService implements OnModuleInit {
  private readonly engine = new MasteryEngine();
  private courseClient!: CourseGrpcClient;

  constructor(
    private readonly masteryRepository: MasteryRepository,
    @Inject(GRPC_CLIENTS.COURSE) private readonly courseGrpc: ClientGrpc,
    private readonly redisCache: RedisCacheService,
  ) {}

  onModuleInit(): void {
    this.courseClient = this.courseGrpc.getService<CourseGrpcClient>(
      GRPC_SERVICES.COURSE,
    );
  }

  checkHealth(): HealthCheckResponse {
    return createHealthResponse('mastery-svc');
  }

  getEngine(): MasteryEngine {
    return this.engine;
  }

  async seedStudentMastery(studentId: string, conceptIds: string[]) {
    const seededCount = await this.masteryRepository.seedConcepts(
      studentId,
      conceptIds,
    );
    await this.redisCache.invalidatePattern(`heatmap:${studentId}:*`);
    return { seeded_count: seededCount };
  }

  async recordAnswer(input: {
    student_id: string;
    concept_id: string;
    correct: boolean;
    difficulty: number;
    time_taken_sec?: number;
  }) {
    const existing = await this.masteryRepository.getConceptRow(
      input.student_id,
      input.concept_id,
    );

    const updated = this.engine.computeUpdate({
      currentMastery: existing?.mastery ?? 0,
      currentConfidence: existing?.confidence ?? 0,
      correct: input.correct,
      difficulty: input.difficulty || 1,
    });

    const saved = await this.masteryRepository.upsertMasteryRow({
      student_id: input.student_id,
      concept_id: input.concept_id,
      mastery: updated.mastery,
      confidence: updated.confidence,
      status: updated.status,
      last_practiced_at: updated.lastPracticedAt.toISOString(),
      next_review_at: updated.nextReviewAt.toISOString(),
    });

    await this.redisCache.invalidatePattern(`heatmap:${input.student_id}:*`);

    return this.toCellDto(saved, '', true);
  }

  async markConceptMastered(input: {
    student_id: string;
    concept_id: string;
    grade: number;
  }) {
    const existing = await this.masteryRepository.getConceptRow(
      input.student_id,
      input.concept_id,
    );

    const computed = this.engine.computeAssignmentMastery({
      currentMastery: existing?.mastery ?? 0,
      currentConfidence: existing?.confidence ?? 0,
      grade: input.grade,
    });

    const nowIso = new Date().toISOString();
    const saved = await this.masteryRepository.upsertMasteryRow({
      student_id: input.student_id,
      concept_id: input.concept_id,
      mastery: computed.mastery,
      confidence: computed.confidence,
      status: computed.status,
      last_practiced_at: nowIso,
      next_review_at: computed.nextReviewAt.toISOString(),
    });

    await this.redisCache.invalidatePattern(`heatmap:${input.student_id}:*`);

    return this.toCellDto(saved, '', true);
  }

  async getHeatmap(studentId: string, courseId: string) {
    const cacheKey = `heatmap:${studentId}:${courseId}`;
    const cached = await this.redisCache.get<{
      student_id: string;
      course_id: string;
      cells: unknown[];
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const [coursePath, studentRows] = await Promise.all([
      firstValueFrom(
        this.courseClient
          .getCoursePath({ course_id: courseId, student_id: studentId })
          .pipe(timeout(5000)),
      ),
      this.masteryRepository.getStudentMastery(studentId),
    ]);

    const rowByConcept = new Map(studentRows.map((r) => [r.concept_id, r]));
    const now = new Date();

    // First compute decayed status for every concept so prerequisites use fresh status
    const computedByConcept = new Map<
      string,
      {
        mastery: number;
        confidence: number;
        status: MasteryStatus;
        lastPracticedAt: string;
        nextReviewAt: string;
      }
    >();

    for (const node of coursePath.nodes ?? []) {
      const row = rowByConcept.get(node.concept.id);
      const rawStatus = (row?.status as MasteryStatus) ?? 'not_started';
      const decayed = this.engine.applyDecay({
        mastery: row?.mastery ?? 0,
        status: rawStatus,
        nextReviewAt: row?.next_review_at ? new Date(row.next_review_at) : null,
        now,
      });

      computedByConcept.set(node.concept.id, {
        mastery: decayed.mastery,
        confidence: row?.confidence ?? 0,
        status: decayed.status,
        lastPracticedAt: row?.last_practiced_at ?? '',
        nextReviewAt: row?.next_review_at ?? '',
      });
    }

    const statusById = new Map<string, MasteryStatus>();
    for (const [id, val] of computedByConcept.entries()) {
      statusById.set(id, val.status);
    }

    const cells = (coursePath.nodes ?? []).map((node) => {
      const val = computedByConcept.get(node.concept.id)!;
      const unlocked = this.engine.isConceptUnlocked(
        node.prerequisite_ids ?? [],
        statusById,
      );
      return {
        concept_id: node.concept.id,
        concept_name: node.concept.name,
        mastery: val.mastery,
        confidence: val.confidence,
        status: val.status,
        recommended_tier: this.engine.recommendTier(val.status),
        last_practiced_at: val.lastPracticedAt,
        next_review_at: val.nextReviewAt,
        unlocked,
      };
    });

    const result = {
      student_id: studentId,
      course_id: courseId,
      cells,
    };

    await this.redisCache.set(cacheKey, result, 60);

    return result;
  }

  async getSmartQueue(studentId: string, courseId: string) {
    const [coursePath, studentRows] = await Promise.all([
      firstValueFrom(
        this.courseClient
          .getCoursePath({ course_id: courseId, student_id: studentId })
          .pipe(timeout(5000)),
      ),
      this.masteryRepository.getStudentMastery(studentId),
    ]);

    const masteryMap = new Map<string, ConceptMasterySnapshot>();
    for (const row of studentRows) {
      masteryMap.set(row.concept_id, {
        conceptId: row.concept_id,
        mastery: row.mastery,
        confidence: row.confidence,
        status: (row.status as MasteryStatus) ?? 'not_started',
        lastPracticedAt: row.last_practiced_at
          ? new Date(row.last_practiced_at)
          : null,
        nextReviewAt: row.next_review_at ? new Date(row.next_review_at) : null,
      });
    }

    const ranked = this.engine.buildSmartQueue({
      concepts: (coursePath.nodes ?? []).map((n) => ({
        id: n.concept.id,
        name: n.concept.name,
        difficulty: n.concept.difficulty,
        prerequisiteIds: n.prerequisite_ids ?? [],
      })),
      masteryByConceptId: masteryMap,
    });

    return {
      student_id: studentId,
      course_id: courseId,
      items: ranked.map((item) => ({
        concept_id: item.conceptId,
        concept_name: item.conceptName,
        reason: item.reason,
        recommended_tier: item.recommendedTier,
        priority_score: item.priorityScore,
        unlocked: item.unlocked,
      })),
    };
  }

  async getClassReport(courseId: string) {
    const [coursePath, enrollments] = await Promise.all([
      firstValueFrom(
        this.courseClient
          .getCoursePath({ course_id: courseId, student_id: '' })
          .pipe(timeout(5000)),
      ),
      firstValueFrom(
        this.courseClient
          .getCourseEnrollments({ course_id: courseId })
          .pipe(timeout(5000)),
      ),
    ]);

    const nodes = coursePath.nodes ?? [];
    const conceptIds = nodes.map((n) => n.concept.id);
    const studentIds = enrollments.student_ids ?? [];

    const masteryRows =
      studentIds.length > 0
        ? await this.masteryRepository.getMasteryForCourse(conceptIds, studentIds)
        : [];

    const stats = nodes.map((node) => {
      const rows = masteryRows.filter((r) => r.concept_id === node.concept.id);
      const total = rows.length;
      const avg =
        total > 0
          ? Number(
              (rows.reduce((sum, r) => sum + Number(r.mastery), 0) / total).toFixed(4),
            )
          : 0;

      return {
        concept_id: node.concept.id,
        concept_name: node.concept.name,
        average_mastery: avg,
        blind_spot_count: rows.filter((r) => r.status === 'blind_spot').length,
        in_progress_count: rows.filter((r) => r.status === 'in_progress').length,
        mastered_count: rows.filter((r) => r.status === 'mastered').length,
      };
    });

    return {
      course_id: courseId,
      stats,
    };
  }

  private toCellDto(row: MasteryRow, conceptName: string, unlocked: boolean) {
    const status = (row.status as MasteryStatus) ?? 'not_started';
    return {
      concept_id: row.concept_id,
      concept_name: conceptName,
      mastery: row.mastery,
      confidence: row.confidence,
      status,
      recommended_tier: this.engine.recommendTier(status),
      last_practiced_at: row.last_practiced_at ?? '',
      next_review_at: row.next_review_at ?? '',
      unlocked,
    };
  }
}
