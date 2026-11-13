import { MasteryEngine, type ConceptMasterySnapshot, type MasteryStatus } from '../src/engine/mastery.engine';

describe('MasteryEngine', () => {
  const engine = new MasteryEngine();

  it('classifies mastery thresholds accurately', () => {
    expect(engine.classifyStatus(0, 0)).toBe('not_started');
    expect(engine.classifyStatus(0.25, 1)).toBe('blind_spot');
    expect(engine.classifyStatus(0.4, 1)).toBe('in_progress');
    expect(engine.classifyStatus(0.79, 1)).toBe('in_progress');
    expect(engine.classifyStatus(0.8, 1)).toBe('mastered');
  });

  it('maps mastery status to assignment tiers', () => {
    expect(engine.recommendTier('not_started')).toBe('remedial');
    expect(engine.recommendTier('blind_spot')).toBe('remedial');
    expect(engine.recommendTier('in_progress')).toBe('standard');
    expect(engine.recommendTier('mastered')).toBe('challenge');
  });

  it('increases mastery on a correct answer and shrinks delta as confidence grows', () => {
    const lowConf = engine.computeUpdate({
      currentMastery: 0.2,
      currentConfidence: 0.0,
      correct: true,
      difficulty: 3,
    });
    const highConf = engine.computeUpdate({
      currentMastery: 0.2,
      currentConfidence: 0.8,
      correct: true,
      difficulty: 3,
    });

    expect(lowConf.mastery).toBeGreaterThan(0.2);
    expect(lowConf.mastery - 0.2).toBeGreaterThan(highConf.mastery - 0.2);
  });

  it('decreases mastery on an incorrect answer', () => {
    const result = engine.computeUpdate({
      currentMastery: 0.7,
      currentConfidence: 0.2,
      correct: false,
      difficulty: 2,
    });

    expect(result.mastery).toBeLessThan(0.7);
  });

  it('applies spaced-repetition decay when next_review_at has passed', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    const overdue = new Date('2026-11-09T12:00:00Z'); // 3 days overdue
    const future = new Date('2026-11-15T12:00:00Z');

    const decayed = engine.applyDecay({
      mastery: 0.82,
      status: 'mastered',
      nextReviewAt: overdue,
      now,
    });
    expect(decayed.decayed).toBe(true);
    expect(decayed.isDueForReview).toBe(true);
    expect(decayed.mastery).toBeLessThan(0.82);
    expect(decayed.status).toBe('in_progress');

    const fresh = engine.applyDecay({
      mastery: 0.82,
      status: 'mastered',
      nextReviewAt: future,
      now,
    });
    expect(fresh.decayed).toBe(false);
    expect(fresh.mastery).toBe(0.82);
  });

  it('unlocks concepts only when prerequisites reach at least in_progress', () => {
    const statuses = new Map<string, MasteryStatus>([
      ['c1', 'in_progress'],
      ['c2', 'blind_spot'],
    ]);

    expect(engine.isConceptUnlocked(['c1'], statuses)).toBe(true);
    expect(engine.isConceptUnlocked(['c1', 'c2'], statuses)).toBe(false);
  });

  it('ranks blind spots and overdue reviews ahead of locked concepts in SmartQueue', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    const masteryMap = new Map<string, ConceptMasterySnapshot>([
      ['c1', { conceptId: 'c1', mastery: 0.9, confidence: 0.8, status: 'mastered', nextReviewAt: new Date('2026-11-20T00:00:00Z') }],
      ['c2', { conceptId: 'c2', mastery: 0.55, confidence: 0.4, status: 'in_progress', nextReviewAt: new Date('2026-11-15T00:00:00Z') }],
      ['c3', { conceptId: 'c3', mastery: 0.2, confidence: 0.2, status: 'blind_spot', nextReviewAt: now }],
    ]);

    const queue = engine.buildSmartQueue({
      concepts: [
        { id: 'c1', name: 'HTML', difficulty: 1, prerequisiteIds: [] },
        { id: 'c2', name: 'CSS', difficulty: 2, prerequisiteIds: ['c1'] },
        { id: 'c3', name: 'Flexbox', difficulty: 3, prerequisiteIds: ['c2'] },
        { id: 'c4', name: 'Grid', difficulty: 4, prerequisiteIds: ['c3'] },
      ],
      masteryByConceptId: masteryMap,
      now,
    });

    expect(queue.map((i) => i.conceptId)).toEqual(['c3', 'c2', 'c4']);
    expect(queue[0].recommendedTier).toBe('remedial');
    expect(queue[0].unlocked).toBe(true);
    expect(queue[2].unlocked).toBe(false);
  });

  it('marks concept mastered after a passing assignment grade', () => {
    const passed = engine.computeAssignmentMastery({
      currentMastery: 0.3,
      currentConfidence: 0.2,
      grade: 88,
    });
    expect(passed.passed).toBe(true);
    expect(passed.status).toBe('mastered');
    expect(passed.mastery).toBeGreaterThanOrEqual(0.8);
  });
});
