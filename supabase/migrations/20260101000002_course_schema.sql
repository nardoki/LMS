-- =============================================================================
-- Migration 002: Course Service Schema (course)
-- Owns: courses, modules, concepts, concept_prerequisites, lessons, enrollments
-- Plus: public.certificates (references courses & profiles)
-- =============================================================================

CREATE TABLE IF NOT EXISTS course.courses (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    title           text NOT NULL,
    description     text NOT NULL DEFAULT '',
    is_published    boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON course.courses
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_courses_instructor ON course.courses (instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON course.courses (is_published);

-- Modules within a course
CREATE TABLE IF NOT EXISTS course.modules (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   uuid NOT NULL REFERENCES course.courses(id) ON DELETE CASCADE,
    title       text NOT NULL,
    order_index integer NOT NULL DEFAULT 0,
    status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_modules_updated_at
    BEFORE UPDATE ON course.modules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_modules_course_order ON course.modules (course_id, order_index);

-- Knowledge graph concepts inside a course
CREATE TABLE IF NOT EXISTS course.concepts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id   uuid NOT NULL REFERENCES course.courses(id) ON DELETE CASCADE,
    name        text NOT NULL,
    description text NOT NULL DEFAULT '',
    difficulty  integer NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (course_id, name)
);

CREATE INDEX IF NOT EXISTS idx_concepts_course ON course.concepts (course_id);

-- Directed acyclic dependency graph between concepts
CREATE TABLE IF NOT EXISTS course.concept_prerequisites (
    concept_id          uuid NOT NULL REFERENCES course.concepts(id) ON DELETE CASCADE,
    requires_concept_id uuid NOT NULL REFERENCES course.concepts(id) ON DELETE CASCADE,
    PRIMARY KEY (concept_id, requires_concept_id),
    CHECK (concept_id <> requires_concept_id)
);

CREATE INDEX IF NOT EXISTS idx_concept_prereq_requires
    ON course.concept_prerequisites (requires_concept_id);

-- Lessons inside a module, tagged with the concept they teach
CREATE TABLE IF NOT EXISTS course.lessons (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id        uuid NOT NULL REFERENCES course.modules(id) ON DELETE CASCADE,
    concept_id       uuid REFERENCES course.concepts(id) ON DELETE SET NULL,
    title            text NOT NULL,
    content_markdown text NOT NULL DEFAULT '',
    media_url        text,
    order_index      integer NOT NULL DEFAULT 0,
    status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_lessons_updated_at
    BEFORE UPDATE ON course.lessons
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_lessons_module_order ON course.lessons (module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_concept ON course.lessons (concept_id);

-- Student enrollments in courses
CREATE TABLE IF NOT EXISTS course.enrollments (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id   uuid NOT NULL REFERENCES course.courses(id) ON DELETE CASCADE,
    status      text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('pending', 'active', 'completed', 'dropped')),
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON course.enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON course.enrollments (course_id);

-- Verifiable completion certificates
CREATE TABLE IF NOT EXISTS public.certificates (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id             uuid NOT NULL REFERENCES course.courses(id) ON DELETE CASCADE,
    verification_code     text NOT NULL UNIQUE,
    mastered_concepts_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    issued_at             timestamptz NOT NULL DEFAULT now(),
    UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates (verification_code);
