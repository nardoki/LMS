-- =============================================================================
-- MasteryLMS Seed Data
-- Demo accounts (password for all three: Password123!):
--   Instructor: instructor@masterylms.dev
--   Student 1:  alice@masterylms.dev
--   Student 2:  bob@masterylms.dev
-- Demo course: "Intro to Web Development"
-- =============================================================================

-- Ensure pgcrypto functions are resolvable in both local and hosted Supabase
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. Seed Supabase Auth Users + Identities + Profiles (Idempotent)
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'instructor@masterylms.dev',
        extensions.crypt('Password123!', extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"],"role":"instructor"}'::jsonb,
        '{"name":"Prof. Ada Lovelace"}'::jsonb,
        now(),
        now(),
        '', '', '', ''
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'alice@masterylms.dev',
        extensions.crypt('Password123!', extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"],"role":"student"}'::jsonb,
        '{"name":"Alice Johnson"}'::jsonb,
        now(),
        now(),
        '', '', '', ''
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'bob@masterylms.dev',
        extensions.crypt('Password123!', extensions.gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"],"role":"student"}'::jsonb,
        '{"name":"Bob Smith"}'::jsonb,
        now(),
        now(),
        '', '', '', ''
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        '{"sub":"11111111-1111-1111-1111-111111111111","email":"instructor@masterylms.dev"}'::jsonb,
        'email',
        now(),
        now(),
        now()
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        '22222222-2222-2222-2222-222222222222',
        '22222222-2222-2222-2222-222222222222',
        '{"sub":"22222222-2222-2222-2222-222222222222","email":"alice@masterylms.dev"}'::jsonb,
        'email',
        now(),
        now(),
        now()
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        '33333333-3333-3333-3333-333333333333',
        '33333333-3333-3333-3333-333333333333',
        '{"sub":"33333333-3333-3333-3333-333333333333","email":"bob@masterylms.dev"}'::jsonb,
        'email',
        now(),
        now(),
        now()
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name, role)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'instructor@masterylms.dev', 'Prof. Ada Lovelace', 'instructor'),
    ('22222222-2222-2222-2222-222222222222', 'alice@masterylms.dev', 'Alice Johnson', 'student'),
    ('33333333-3333-3333-3333-333333333333', 'bob@masterylms.dev', 'Bob Smith', 'student')
ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name  = EXCLUDED.name,
        role  = EXCLUDED.role;

-- -----------------------------------------------------------------------------
-- 2. Demo Course: "Intro to Web Development"
-- -----------------------------------------------------------------------------
INSERT INTO course.courses (id, instructor_id, title, description, is_published)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Intro to Web Development',
    'Master HTML, CSS, and modern JavaScript through concept-driven diagnostics and adaptive practice.',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Modules
INSERT INTO course.modules (id, course_id, title, order_index, status)
VALUES
    ('bbbbbbbb-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Module 1: HTML & Semantics', 1, 'published'),
    ('bbbbbbbb-0001-0001-0001-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Module 2: CSS & Layout', 2, 'published'),
    ('bbbbbbbb-0001-0001-0001-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Module 3: JavaScript & the DOM', 3, 'published')
ON CONFLICT (id) DO NOTHING;

-- Concepts
INSERT INTO course.concepts (id, course_id, name, description, difficulty)
VALUES
    ('cccccccc-0001-0001-0001-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HTML Elements & Semantics', 'Using semantic landmarks, headings, and accessible document structure.', 1),
    ('cccccccc-0001-0001-0001-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'CSS Box Model & Selectors', 'Specificity, margin/border/padding/content box sizing, and cascade rules.', 2),
    ('cccccccc-0001-0001-0001-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Flexbox & Grid Layout', 'One- and two-dimensional responsive layout alignment and wrapping.', 3),
    ('cccccccc-0001-0001-0001-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'JavaScript Variables & Functions', 'Block scope, closures, arrow functions, and pure expressions.', 2),
    ('cccccccc-0001-0001-0001-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'DOM Manipulation & Events', 'Selecting elements, event delegation, and updating the UI dynamically.', 4)
ON CONFLICT (id) DO NOTHING;

-- Concept Prerequisites (DAG)
INSERT INTO course.concept_prerequisites (concept_id, requires_concept_id)
VALUES
    -- CSS Box Model requires HTML Elements
    ('cccccccc-0001-0001-0001-000000000002', 'cccccccc-0001-0001-0001-000000000001'),
    -- Flexbox & Grid requires CSS Box Model
    ('cccccccc-0001-0001-0001-000000000003', 'cccccccc-0001-0001-0001-000000000002'),
    -- JS Variables requires HTML Elements
    ('cccccccc-0001-0001-0001-000000000004', 'cccccccc-0001-0001-0001-000000000001'),
    -- DOM Manipulation requires CSS Box Model and JS Variables
    ('cccccccc-0001-0001-0001-000000000005', 'cccccccc-0001-0001-0001-000000000002'),
    ('cccccccc-0001-0001-0001-000000000005', 'cccccccc-0001-0001-0001-000000000004')
ON CONFLICT DO NOTHING;

-- Lessons
INSERT INTO course.lessons (id, module_id, concept_id, title, content_markdown, order_index, status)
VALUES
    (
        'dddddddd-0001-0001-0001-000000000001',
        'bbbbbbbb-0001-0001-0001-000000000001',
        'cccccccc-0001-0001-0001-000000000001',
        'Semantic HTML Landmarks',
        '# Semantic HTML\n\nUse `<header>`, `<main>`, `<article>`, and `<footer>` so screen readers and search engines understand page hierarchy.',
        1,
        'published'
    ),
    (
        'dddddddd-0001-0001-0001-000000000002',
        'bbbbbbbb-0001-0001-0001-000000000002',
        'cccccccc-0001-0001-0001-000000000002',
        'Understanding the Box Model',
        '# CSS Box Model\n\nEvery element is a box composed of content, padding, border, and margin. Prefer `box-sizing: border-box;` for predictable widths.',
        1,
        'published'
    ),
    (
        'dddddddd-0001-0001-0001-000000000003',
        'bbbbbbbb-0001-0001-0001-000000000002',
        'cccccccc-0001-0001-0001-000000000003',
        'Flexbox Alignment Patterns',
        '# Flexbox\n\nUse `justify-content` along the main axis and `align-items` along the cross axis.',
        2,
        'published'
    ),
    (
        'dddddddd-0001-0001-0001-000000000004',
        'bbbbbbbb-0001-0001-0001-000000000003',
        'cccccccc-0001-0001-0001-000000000004',
        'Modern JavaScript Scope & Functions',
        '# Variables & Functions\n\nPrefer `const` by default and `let` when rebinding is required.',
        1,
        'published'
    ),
    (
        'dddddddd-0001-0001-0001-000000000005',
        'bbbbbbbb-0001-0001-0001-000000000003',
        'cccccccc-0001-0001-0001-000000000005',
        'Listening to Events in the DOM',
        '# DOM Events\n\nAttach listeners with `element.addEventListener("click", handler)` and leverage event delegation on parent containers.',
        2,
        'published'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Diagnostic Quiz Questions & Tiered Assignments
-- -----------------------------------------------------------------------------
INSERT INTO assessment.quiz_questions (id, module_id, concept_id, question_text, options_json, correct_answer, difficulty, is_diagnostic)
VALUES
    (
        'eeeeeeee-0001-0001-0001-000000000001',
        'bbbbbbbb-0001-0001-0001-000000000001',
        'cccccccc-0001-0001-0001-000000000001',
        'Which HTML element should wrap the primary unique content of a document?',
        '["<div>", "<main>", "<section>", "<span>"]'::jsonb,
        '<main>',
        1,
        true
    ),
    (
        'eeeeeeee-0001-0001-0001-000000000002',
        'bbbbbbbb-0001-0001-0001-000000000002',
        'cccccccc-0001-0001-0001-000000000002',
        'With box-sizing: border-box, which properties are included inside the declared width?',
        '["Content only", "Content and padding only", "Content, padding, and border", "Content, padding, border, and margin"]'::jsonb,
        'Content, padding, and border',
        2,
        true
    ),
    (
        'eeeeeeee-0001-0001-0001-000000000003',
        'bbbbbbbb-0001-0001-0001-000000000002',
        'cccccccc-0001-0001-0001-000000000003',
        'In a row-direction flex container, which property centers items vertically along the cross axis?',
        '["justify-content: center", "align-items: center", "flex-wrap: wrap", "place-self: stretch"]'::jsonb,
        'align-items: center',
        3,
        true
    ),
    (
        'eeeeeeee-0001-0001-0001-000000000004',
        'bbbbbbbb-0001-0001-0001-000000000003',
        'cccccccc-0001-0001-0001-000000000004',
        'What is the scope of a variable declared with let inside an if-block?',
        '["Global scope", "Function scope", "Block scope", "Module-only global scope"]'::jsonb,
        'Block scope',
        2,
        true
    ),
    (
        'eeeeeeee-0001-0001-0001-000000000005',
        'bbbbbbbb-0001-0001-0001-000000000003',
        'cccccccc-0001-0001-0001-000000000005',
        'Why is event delegation on a parent list useful when list items are added dynamically?',
        '["It disables bubbling", "Newly added children automatically trigger the parent listener", "It avoids CSS reflow", "It runs handlers before DOM load"]'::jsonb,
        'Newly added children automatically trigger the parent listener',
        4,
        true
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO assessment.assignments (id, module_id, concept_id, title, description, tier)
VALUES
    (
        'ffffffff-0001-0001-0001-000000000001',
        'bbbbbbbb-0001-0001-0001-000000000002',
        'cccccccc-0001-0001-0001-000000000003',
        'Guided Flexbox Card Alignment',
        'Remedial step-by-step exercise: align 3 navigation items using display: flex.',
        'remedial'
    ),
    (
        'ffffffff-0001-0001-0001-000000000002',
        'bbbbbbbb-0001-0001-0001-000000000002',
        'cccccccc-0001-0001-0001-000000000003',
        'Responsive Pricing Grid',
        'Standard exercise: build a responsive 3-column layout with CSS Grid and Flexbox.',
        'standard'
    ),
    (
        'ffffffff-0001-0001-0001-000000000003',
        'bbbbbbbb-0001-0001-0001-000000000002',
        'cccccccc-0001-0001-0001-000000000003',
        'Fluid Magazine Layout Without Media Queries',
        'Challenge exercise: compose subgrid and minmax() for an adaptive editorial grid.',
        'challenge'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Enrollments & Initial Concept Mastery Rows
-- -----------------------------------------------------------------------------
INSERT INTO course.enrollments (student_id, course_id, status)
VALUES
    ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active'),
    ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'active')
ON CONFLICT (student_id, course_id) DO NOTHING;

-- Alice has some initial activity; Bob starts fresh (not_started)
INSERT INTO mastery.student_concept_mastery (student_id, concept_id, mastery, confidence, status, last_practiced_at, next_review_at)
VALUES
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-0001-0001-0001-000000000001', 0.90, 0.75, 'mastered',    now() - interval '2 days', now() + interval '5 days'),
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-0001-0001-0001-000000000002', 0.62, 0.50, 'in_progress', now() - interval '1 day',  now() + interval '2 days'),
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-0001-0001-0001-000000000003', 0.25, 0.35, 'blind_spot',  now() - interval '1 day',  now()),
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-0001-0001-0001-000000000004', 0.00, 0.00, 'not_started', NULL, NULL),
    ('22222222-2222-2222-2222-222222222222', 'cccccccc-0001-0001-0001-000000000005', 0.00, 0.00, 'not_started', NULL, NULL),

    ('33333333-3333-3333-3333-333333333333', 'cccccccc-0001-0001-0001-000000000001', 0.00, 0.00, 'not_started', NULL, NULL),
    ('33333333-3333-3333-3333-333333333333', 'cccccccc-0001-0001-0001-000000000002', 0.00, 0.00, 'not_started', NULL, NULL),
    ('33333333-3333-3333-3333-333333333333', 'cccccccc-0001-0001-0001-000000000003', 0.00, 0.00, 'not_started', NULL, NULL),
    ('33333333-3333-3333-3333-333333333333', 'cccccccc-0001-0001-0001-000000000004', 0.00, 0.00, 'not_started', NULL, NULL),
    ('33333333-3333-3333-3333-333333333333', 'cccccccc-0001-0001-0001-000000000005', 0.00, 0.00, 'not_started', NULL, NULL)
ON CONFLICT (student_id, concept_id) DO NOTHING;
