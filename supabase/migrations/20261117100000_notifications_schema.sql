-- =============================================================================
-- Migration: Notifications Schema
-- Stores spaced-repetition review reminders, grade alerts, and blind-spot notices.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type        text NOT NULL,
    title       text NOT NULL,
    message     text NOT NULL,
    metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_read     boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications (user_id, is_read) 
WHERE is_read = false;

GRANT SELECT, UPDATE ON public.notifications TO authenticated;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_user_policy ON public.notifications;
CREATE POLICY notifications_user_policy ON public.notifications
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
