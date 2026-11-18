-- =============================================================================
-- Step 5: High-Performance Database Indexes & Query Optimization
-- Optimizes query plans on busiest tables across high-concurrency assessment,
-- mastery knowledge-graph calculation, and certificate verification paths.
-- =============================================================================

-- 1. Concept Mastery: Rapid student mastery matrix & decay calculations
CREATE INDEX IF NOT EXISTS idx_concept_mastery_student_concept 
ON mastery.student_concept_mastery(student_id, concept_id);

CREATE INDEX IF NOT EXISTS idx_concept_mastery_student_status 
ON mastery.student_concept_mastery(student_id, status);

CREATE INDEX IF NOT EXISTS idx_concept_mastery_next_review 
ON mastery.student_concept_mastery(next_review_at) 
WHERE next_review_at IS NOT NULL;

-- 2. Quiz Attempts: High-throughput write & history aggregation
CREATE INDEX IF NOT EXISTS idx_attempts_student_question_created 
ON assessment.attempts(student_id, question_id, answered_at DESC);

-- 3. Course Structure & Prerequisites (DAG traversal)
CREATE INDEX IF NOT EXISTS idx_quiz_questions_module_concept 
ON assessment.quiz_questions(module_id, concept_id);

CREATE INDEX IF NOT EXISTS idx_concept_prereqs_concept 
ON course.concept_prerequisites(concept_id, requires_concept_id);

CREATE INDEX IF NOT EXISTS idx_modules_course_order 
ON course.modules(course_id, order_index);

CREATE INDEX IF NOT EXISTS idx_lessons_module_order 
ON course.lessons(module_id, order_index);

-- 4. Enrollments & Access Verification
CREATE INDEX IF NOT EXISTS idx_enrollments_student_course 
ON course.enrollments(student_id, course_id, status);

CREATE INDEX IF NOT EXISTS idx_enrollments_course_status 
ON course.enrollments(course_id, status);

-- 5. Verifiable Cryptographic Certificates
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS payload_hash text;

CREATE INDEX IF NOT EXISTS idx_certificates_code_hash 
ON public.certificates(verification_code, payload_hash);

CREATE INDEX IF NOT EXISTS idx_certificates_student_course 
ON public.certificates(student_id, course_id);
