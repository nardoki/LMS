-- =============================================================================
-- Migration 001: Service Schemas, Utility Triggers, Profiles & Certificates
-- =============================================================================

-- Separate logical PostgreSQL schemas per domain service
CREATE SCHEMA IF NOT EXISTS course;
CREATE SCHEMA IF NOT EXISTS assessment;
CREATE SCHEMA IF NOT EXISTS mastery;

-- Ensure Supabase API roles can resolve schemas (table access still requires grants + RLS)
GRANT USAGE ON SCHEMA course TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA assessment TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA mastery TO anon, authenticated, service_role;

-- Backend microservices connect using the Supabase service_role key
GRANT ALL ON ALL TABLES IN SCHEMA course TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA course TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA course TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA course GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA course GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA course GRANT ALL ON ROUTINES TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA assessment TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA assessment TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA assessment TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA assessment GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA assessment GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA assessment GRANT ALL ON ROUTINES TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA mastery TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA mastery TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA mastery TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mastery GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mastery GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mastery GRANT ALL ON ROUTINES TO service_role;

-- Shared updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- User profiles linked 1:1 with Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       text,
    name        text NOT NULL DEFAULT '',
    role        text NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student', 'instructor', 'admin')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
