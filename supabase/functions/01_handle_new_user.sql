-- =============================================================================
-- Auth Triggers & Profile Sync Functions
-- Creates a public.profiles row on signup (default role: 'student') and
-- keeps public.profiles.role in sync with auth.users.raw_app_meta_data.
-- =============================================================================

-- 1. Guarantee app_metadata.role is set (defaults to 'student' on normal signup)
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

-- 2. Auto-create public.profiles row after a new user signs up
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

-- 3. Sync admin-only app_metadata.role updates down to public.profiles
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
