-- =============================================================================
-- Row Level Security (RLS) Policies
-- Rules (ARCHITECTURE.md):
--   - All writes go through the NestJS Gateway -> domain services (service_role).
--   - Students can read only their own mastery, attempts, enrollments, submissions.
--   - Instructors can read rows belonging to courses they own.
--   - quiz_questions stays hidden from direct student REST queries (prevents leaking correct_answer).
-- =============================================================================

-- Reads role claim from Supabase JWT app_metadata (never user_metadata)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'student');
$$;

-- Grants for authenticated browser sessions (RLS restricts row visibility)
GRANT SELECT ON public.profiles, public.certificates TO authenticated;
GRANT UPDATE (name) ON public.profiles TO authenticated;

GRANT SELECT ON
    course.courses,
    course.modules,
    course.lessons,
    course.concepts,
    course.concept_prerequisites,
    course.enrollments
TO authenticated;

GRANT SELECT ON
    assessment.quiz_questions,
    assessment.attempts,
    assessment.assignments,
    assessment.submissions
TO authenticated;

GRANT SELECT ON mastery.student_concept_mastery TO authenticated;

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

ALTER TABLE course.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course.concept_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE course.enrollments ENABLE ROW LEVEL SECURITY;

ALTER TABLE assessment.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment.submissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE mastery.student_concept_mastery ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- public.profiles & public.certificates
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles
    FOR SELECT TO authenticated
    USING (
        id = auth.uid()
        OR public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1
            FROM course.enrollments e
            JOIN course.courses c ON c.id = e.course_id
            WHERE e.student_id = profiles.id
              AND c.instructor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS profiles_update_own_policy ON public.profiles;
CREATE POLICY profiles_update_own_policy ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS certificates_select_policy ON public.certificates;
CREATE POLICY certificates_select_policy ON public.certificates
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.current_user_role() = 'admin'
    );

-- -----------------------------------------------------------------------------
-- course schema
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS courses_select_policy ON course.courses;
CREATE POLICY courses_select_policy ON course.courses
    FOR SELECT TO authenticated
    USING (
        is_published = true
        OR instructor_id = auth.uid()
        OR public.current_user_role() = 'admin'
    );

DROP POLICY IF EXISTS modules_select_policy ON course.modules;
CREATE POLICY modules_select_policy ON course.modules
    FOR SELECT TO authenticated
    USING (
        public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM course.courses c
            WHERE c.id = modules.course_id
              AND (c.is_published = true OR c.instructor_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS concepts_select_policy ON course.concepts;
CREATE POLICY concepts_select_policy ON course.concepts
    FOR SELECT TO authenticated
    USING (
        public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM course.courses c
            WHERE c.id = concepts.course_id
              AND (c.is_published = true OR c.instructor_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS concept_prereqs_select_policy ON course.concept_prerequisites;
CREATE POLICY concept_prereqs_select_policy ON course.concept_prerequisites
    FOR SELECT TO authenticated
    USING (
        public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1
            FROM course.concepts co
            JOIN course.courses c ON c.id = co.course_id
            WHERE co.id = concept_prerequisites.concept_id
              AND (c.is_published = true OR c.instructor_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS lessons_select_policy ON course.lessons;
CREATE POLICY lessons_select_policy ON course.lessons
    FOR SELECT TO authenticated
    USING (
        public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1
            FROM course.modules m
            JOIN course.courses c ON c.id = m.course_id
            WHERE m.id = lessons.module_id
              AND (
                  c.instructor_id = auth.uid()
                  OR (
                      c.is_published = true
                      AND EXISTS (
                          SELECT 1 FROM course.enrollments e
                          WHERE e.course_id = c.id
                            AND e.student_id = auth.uid()
                            AND e.status IN ('active', 'completed')
                      )
                  )
              )
        )
    );

DROP POLICY IF EXISTS enrollments_select_policy ON course.enrollments;
CREATE POLICY enrollments_select_policy ON course.enrollments
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM course.courses c
            WHERE c.id = enrollments.course_id
              AND c.instructor_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- assessment schema
-- -----------------------------------------------------------------------------
-- Only instructors of the course (and admins) may read quiz_questions directly,
-- so correct_answer cannot be inspected from the browser. Students receive
-- stripped questions from the Gateway GetQuiz endpoint.
DROP POLICY IF EXISTS quiz_questions_instructor_select_policy ON assessment.quiz_questions;
CREATE POLICY quiz_questions_instructor_select_policy ON assessment.quiz_questions
    FOR SELECT TO authenticated
    USING (
        public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1
            FROM course.modules m
            JOIN course.courses c ON c.id = m.course_id
            WHERE m.id = quiz_questions.module_id
              AND c.instructor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS attempts_select_policy ON assessment.attempts;
CREATE POLICY attempts_select_policy ON assessment.attempts
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1
            FROM assessment.quiz_questions q
            JOIN course.modules m ON m.id = q.module_id
            JOIN course.courses c ON c.id = m.course_id
            WHERE q.id = attempts.question_id
              AND c.instructor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS assignments_select_policy ON assessment.assignments;
CREATE POLICY assignments_select_policy ON assessment.assignments
    FOR SELECT TO authenticated
    USING (
        public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1
            FROM course.modules m
            JOIN course.courses c ON c.id = m.course_id
            WHERE m.id = assignments.module_id
              AND (
                  c.instructor_id = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM course.enrollments e
                      WHERE e.course_id = c.id
                        AND e.student_id = auth.uid()
                        AND e.status IN ('active', 'completed')
                  )
              )
        )
    );

DROP POLICY IF EXISTS submissions_select_policy ON assessment.submissions;
CREATE POLICY submissions_select_policy ON assessment.submissions
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1
            FROM assessment.assignments a
            JOIN course.modules m ON m.id = a.module_id
            JOIN course.courses c ON c.id = m.course_id
            WHERE a.id = submissions.assignment_id
              AND c.instructor_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- mastery schema (Realtime live heatmap reads)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS mastery_select_policy ON mastery.student_concept_mastery;
CREATE POLICY mastery_select_policy ON mastery.student_concept_mastery
    FOR SELECT TO authenticated
    USING (
        student_id = auth.uid()
        OR public.current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1
            FROM course.concepts co
            JOIN course.courses c ON c.id = co.course_id
            WHERE co.id = student_concept_mastery.concept_id
              AND c.instructor_id = auth.uid()
        )
    );
