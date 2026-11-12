-- =============================================================================
-- Migration 003: Assessment Service Schema (assessment)
-- Owns: quiz_questions, attempts, assignments, submissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS assessment.quiz_questions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id      uuid NOT NULL REFERENCES course.modules(id) ON DELETE CASCADE,
    concept_id     uuid NOT NULL REFERENCES course.concepts(id) ON DELETE CASCADE,
    question_text  text NOT NULL,
    options_json   jsonb NOT NULL DEFAULT '[]'::jsonb,
    correct_answer text NOT NULL,
    difficulty     integer NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    is_diagnostic  boolean NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_module_concept
    ON assessment.quiz_questions (module_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_diagnostic
    ON assessment.quiz_questions (module_id, is_diagnostic);

-- Individual question attempts by students
CREATE TABLE IF NOT EXISTS assessment.attempts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id     uuid NOT NULL REFERENCES assessment.quiz_questions(id) ON DELETE CASCADE,
    selected_answer text,
    correct         boolean NOT NULL,
    time_taken_sec  integer NOT NULL DEFAULT 0 CHECK (time_taken_sec >= 0),
    answered_at     timestamptz NOT NULL DEFAULT now()
);

-- Performance index specified in ARCHITECTURE.md & TASKS.md
CREATE INDEX IF NOT EXISTS idx_attempts_student_answered
    ON assessment.attempts (student_id, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_question
    ON assessment.attempts (question_id);

-- Tiered assignments tied to a concept (remedial | standard | challenge)
CREATE TABLE IF NOT EXISTS assessment.assignments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id   uuid NOT NULL REFERENCES course.modules(id) ON DELETE CASCADE,
    concept_id  uuid NOT NULL REFERENCES course.concepts(id) ON DELETE CASCADE,
    title       text NOT NULL,
    description text NOT NULL DEFAULT '',
    tier        text NOT NULL DEFAULT 'standard'
                    CHECK (tier IN ('remedial', 'standard', 'challenge')),
    due_date    date,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_module_concept
    ON assessment.assignments (module_id, concept_id);
CREATE INDEX IF NOT EXISTS idx_assignments_concept_tier
    ON assessment.assignments (concept_id, tier);

-- Student assignment submissions and instructor grades
CREATE TABLE IF NOT EXISTS assessment.submissions (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES assessment.assignments(id) ON DELETE CASCADE,
    student_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    file_url      text,
    content_text  text,
    grade         numeric(5, 2) CHECK (grade >= 0 AND grade <= 100),
    feedback      text,
    status        text NOT NULL DEFAULT 'submitted'
                      CHECK (status IN ('submitted', 'graded', 'returned')),
    submitted_at  timestamptz NOT NULL DEFAULT now(),
    graded_at     timestamptz,
    UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_student
    ON assessment.submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_status
    ON assessment.submissions (assignment_id, status);
