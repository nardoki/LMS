-- =============================================================================
-- Migration 004: Mastery Service Schema (mastery)
-- Owns: student_concept_mastery (+ Realtime publication & lookup indexes)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mastery.student_concept_mastery (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    concept_id        uuid NOT NULL REFERENCES course.concepts(id) ON DELETE CASCADE,
    mastery           double precision NOT NULL DEFAULT 0.0
                          CHECK (mastery >= 0.0 AND mastery <= 1.0),
    confidence        double precision NOT NULL DEFAULT 0.0
                          CHECK (confidence >= 0.0 AND confidence <= 1.0),
    status            text NOT NULL DEFAULT 'not_started'
                          CHECK (status IN ('not_started', 'blind_spot', 'in_progress', 'mastered')),
    last_practiced_at timestamptz,
    next_review_at    timestamptz,
    updated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, concept_id)
);

CREATE TRIGGER trg_student_concept_mastery_updated_at
    BEFORE UPDATE ON mastery.student_concept_mastery
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Performance indexes specified in ARCHITECTURE.md & TASKS.md
CREATE INDEX IF NOT EXISTS idx_mastery_student_concept
    ON mastery.student_concept_mastery (student_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_mastery_next_review
    ON mastery.student_concept_mastery (student_id, next_review_at)
    WHERE next_review_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mastery_status
    ON mastery.student_concept_mastery (student_id, status);

-- Enable Supabase Realtime on mastery updates so ConceptHeatmap cells update live
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'mastery'
              AND tablename = 'student_concept_mastery'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE mastery.student_concept_mastery;
        END IF;
    END IF;
END;
$$;
