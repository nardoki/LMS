export type MasteryStatus = 'not_started' | 'blind_spot' | 'in_progress' | 'mastered';
export type AssignmentTier = 'remedial' | 'standard' | 'challenge';

export interface ConceptMasterySnapshot {
  conceptId: string;
  mastery: number;
  confidence: number;
  status: MasteryStatus;
  lastPracticedAt?: Date | null;
  nextReviewAt?: Date | null;
}

export interface SmartQueueInputConcept {
  id: string;
  name: string;
  difficulty: number;
  prerequisiteIds: string[];
}

export interface SmartQueueRankedItem {
  conceptId: string;
  conceptName: string;
  reason: string;
  recommendedTier: AssignmentTier;
  priorityScore: number;
  unlocked: boolean;
}

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Pure, database-free adaptive mastery engine.
 * Rules & thresholds follow ARCHITECTURE.md Section 7.
 */
export class MasteryEngine {
  classifyStatus(mastery: number, attemptsCount = 1): MasteryStatus {
    if (attemptsCount <= 0) {
      return 'not_started';
    }
    if (mastery < 0.4) {
      return 'blind_spot';
    }
    if (mastery < 0.8) {
      return 'in_progress';
    }
    return 'mastered';
  }

  recommendTier(status: MasteryStatus): AssignmentTier {
    if (status === 'blind_spot' || status === 'not_started') {
      return 'remedial';
    }
    if (status === 'in_progress') {
      return 'standard';
    }
    return 'challenge';
  }

  computeNextReviewAt(
    status: MasteryStatus,
    confidence: number,
    now = new Date(),
  ): Date {
    if (status === 'blind_spot' || status === 'not_started') {
      return new Date(now.getTime() + 4 * MS_PER_HOUR);
    }
    if (status === 'in_progress') {
      return new Date(now.getTime() + 2 * MS_PER_DAY);
    }
    const extraDays = Math.round(Math.min(1, Math.max(0, confidence)) * 7);
    return new Date(now.getTime() + (7 + extraDays) * MS_PER_DAY);
  }

  /**
   * Computes updated mastery and confidence using:
   *   mastery_new = mastery + k * (correct - mastery) * difficulty_weight
   */
  computeUpdate(params: {
    currentMastery: number;
    currentConfidence: number;
    correct: boolean;
    difficulty: number;
    now?: Date;
  }): {
    mastery: number;
    confidence: number;
    status: MasteryStatus;
    recommendedTier: AssignmentTier;
    lastPracticedAt: Date;
    nextReviewAt: Date;
  } {
    const now = params.now ?? new Date();
    const clampedDifficulty = Math.min(5, Math.max(1, params.difficulty || 1));
    const clampedConfidence = Math.min(1, Math.max(0, params.currentConfidence));
    // Lower confidence yields a larger learning rate k so early answers move the score faster
    const learningRate = 0.45 - 0.25 * clampedConfidence;
    const difficultyWeight = 0.8 + (clampedDifficulty - 1) * 0.1;
    const outcome = params.correct ? 1 : 0;

    const rawMastery =
      params.currentMastery +
      learningRate * (outcome - params.currentMastery) * difficultyWeight;
    const mastery = Math.min(1, Math.max(0, Number(rawMastery.toFixed(4))));
    const confidence = Math.min(1, Number((clampedConfidence + 0.15).toFixed(4)));
    const status = this.classifyStatus(mastery, 1);

    return {
      mastery,
      confidence,
      status,
      recommendedTier: this.recommendTier(status),
      lastPracticedAt: now,
      nextReviewAt: this.computeNextReviewAt(status, confidence, now),
    };
  }

  /**
   * Applies gentle spaced-repetition decay when next_review_at has passed.
   */
  applyDecay(params: {
    mastery: number;
    status: MasteryStatus;
    nextReviewAt?: Date | null;
    now?: Date;
  }): {
    mastery: number;
    status: MasteryStatus;
    decayed: boolean;
    isDueForReview: boolean;
  } {
    const now = params.now ?? new Date();
    if (
      params.status === 'not_started' ||
      !params.nextReviewAt ||
      now.getTime() <= params.nextReviewAt.getTime()
    ) {
      return {
        mastery: params.mastery,
        status: params.status,
        decayed: false,
        isDueForReview: false,
      };
    }

    const overdueDays = Math.max(
      1,
      Math.floor((now.getTime() - params.nextReviewAt.getTime()) / MS_PER_DAY),
    );
    const penalty = Math.min(0.25, 0.03 * overdueDays);
    const mastery = Math.max(0, Number((params.mastery - penalty).toFixed(4)));
    const status = this.classifyStatus(mastery, 1);

    return {
      mastery,
      status,
      decayed: penalty > 0,
      isDueForReview: true,
    };
  }

  /**
   * Marks a concept mastered after passing an assignment (default threshold >= 70).
   */
  computeAssignmentMastery(params: {
    currentMastery: number;
    currentConfidence: number;
    grade: number;
    passThreshold?: number;
    now?: Date;
  }): {
    passed: boolean;
    mastery: number;
    confidence: number;
    status: MasteryStatus;
    recommendedTier: AssignmentTier;
    nextReviewAt: Date;
  } {
    const now = params.now ?? new Date();
    const threshold = params.passThreshold ?? 70;
    const passed = params.grade >= threshold;

    if (!passed) {
      const lowered = Math.min(params.currentMastery, 0.35);
      const status = this.classifyStatus(lowered, 1);
      return {
        passed: false,
        mastery: lowered,
        confidence: Math.min(1, Number((params.currentConfidence + 0.1).toFixed(4))),
        status,
        recommendedTier: this.recommendTier(status),
        nextReviewAt: this.computeNextReviewAt(status, params.currentConfidence, now),
      };
    }

    const mastery = Math.max(params.currentMastery, 0.85);
    const confidence = Math.max(params.currentConfidence, 0.75);
    const status: MasteryStatus = 'mastered';

    return {
      passed: true,
      mastery,
      confidence,
      status,
      recommendedTier: 'challenge',
      nextReviewAt: this.computeNextReviewAt(status, confidence, now),
    };
  }

  /**
   * A concept unlocks once every prerequisite reaches at least 'in_progress'.
   */
  isConceptUnlocked(
    prerequisiteIds: string[],
    statusByConceptId: Map<string, MasteryStatus>,
  ): boolean {
    return prerequisiteIds.every((reqId) => {
      const reqStatus = statusByConceptId.get(reqId) ?? 'not_started';
      return reqStatus === 'in_progress' || reqStatus === 'mastered';
    });
  }

  /**
   * Produces today's ranked adaptive practice queue.
   */
  buildSmartQueue(params: {
    concepts: SmartQueueInputConcept[];
    masteryByConceptId: Map<string, ConceptMasterySnapshot>;
    now?: Date;
  }): SmartQueueRankedItem[] {
    const now = params.now ?? new Date();
    const effectiveMap = new Map<
      string,
      { mastery: number; status: MasteryStatus; isDueForReview: boolean }
    >();

    for (const concept of params.concepts) {
      const snap = params.masteryByConceptId.get(concept.id);
      if (!snap) {
        effectiveMap.set(concept.id, {
          mastery: 0,
          status: 'not_started',
          isDueForReview: false,
        });
        continue;
      }
      const decayed = this.applyDecay({
        mastery: snap.mastery,
        status: snap.status,
        nextReviewAt: snap.nextReviewAt,
        now,
      });
      effectiveMap.set(concept.id, {
        mastery: decayed.mastery,
        status: decayed.status,
        isDueForReview: decayed.isDueForReview,
      });
    }

    const statusById = new Map<string, MasteryStatus>();
    for (const [id, val] of effectiveMap.entries()) {
      statusById.set(id, val.status);
    }

    const items: SmartQueueRankedItem[] = [];
    for (const concept of params.concepts) {
      const eff = effectiveMap.get(concept.id)!;
      const unlocked = this.isConceptUnlocked(concept.prerequisiteIds, statusById);

      // Skip already mastered concepts unless spaced repetition review is due
      if (eff.status === 'mastered' && !eff.isDueForReview) {
        continue;
      }

      let priorityScore = 0;
      let reason = 'Ready to learn';

      if (!unlocked) {
        priorityScore = 5;
        reason = 'Locked until prerequisite concepts reach in progress';
      } else if (eff.status === 'blind_spot') {
        priorityScore = 100 - eff.mastery * 40;
        reason = 'Blind spot detected (<40% mastery)';
      } else if (eff.isDueForReview) {
        priorityScore = 85 - eff.mastery * 20;
        reason = 'Spaced-repetition review is due';
      } else if (eff.status === 'in_progress') {
        priorityScore = 60 - eff.mastery * 20;
        reason = 'In progress — reinforce toward mastery';
      } else {
        priorityScore = 40 - concept.difficulty * 2;
        reason = 'Unlocked next concept';
      }

      items.push({
        conceptId: concept.id,
        conceptName: concept.name,
        reason,
        recommendedTier: this.recommendTier(eff.status),
        priorityScore: Number(priorityScore.toFixed(2)),
        unlocked,
      });
    }

    // Unlocked & highest priority items first
    return items.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return b.priorityScore - a.priorityScore;
    });
  }
}
