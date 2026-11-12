# Supabase RLS Policies

Row Level Security (RLS) SQL policies will be added here in **Step 2 (Authentication & Authorization)** so:
- Students can read only their own `student_concept_mastery`, `attempts`, and `submissions`.
- Instructors can read analytics and submissions for courses they own.
- Public users can verify certificates via `verification_code`.
