-- =============================================================================
-- Migration 005: Auth Signup Trigger & Row Level Security Policies
-- Mirrors supabase/functions/01_handle_new_user.sql and supabase/policies/01_rls_policies.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.set_default_app_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
    existing_role text;
BEGIN
    existing_role := NEW.raw_app_meta_data ->> 'role';

    IF existing_role IS NULL OR existing_role NOT IN ('student', 'instructor', 'admin') THEN
        NEW.raw_app_meta_data :=
            COALESCE(NEW.raw_app_meta_data, '{}'::jsonb)
            || jsonb_build_object('role', 'student');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users;
CREATE TRIGGER on_auth_user_before_insert
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_default_app_role();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assigned_role text;
    display_name  text;
BEGIN
    assigned_role := COALESCE(NEW.raw_app_meta_data ->> 'role', 'student');
    IF assigned_role NOT IN ('student', 'instructor', 'admin') THEN
        assigned_role := 'student';
    END IF;

    display_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'name', '')), '');
    IF display_name IS NULL THEN
        display_name := split_part(COALESCE(NEW.email, 'user'), '@', 1);
    END IF;

    INSERT INTO public.profiles (id, email, name, role)
    VALUES (NEW.id, NEW.email, display_name, assigned_role)
    ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            name  = CASE
                        WHEN public.profiles.name = '' THEN EXCLUDED.name
                        ELSE public.profiles.name
                    END,
            role  = EXCLUDED.role;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.sync_user_role_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_role text;
BEGIN
    updated_role := NEW.raw_app_meta_data ->> 'role';
    IF updated_role IN ('student', 'instructor', 'admin') THEN
        UPDATE public.profiles
        SET role = updated_role
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_role_updated ON auth.users;
CREATE TRIGGER on_auth_user_role_updated
    AFTER UPDATE OF raw_app_meta_data ON auth.users
    FOR EACH ROW
    WHEN (OLD.raw_app_meta_data ->> 'role' IS DISTINCT FROM NEW.raw_app_meta_data ->> 'role')
    EXECUTE FUNCTION public.sync_user_role_to_profile();

-- Helper for RLS role checks
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'student');
$$;

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
