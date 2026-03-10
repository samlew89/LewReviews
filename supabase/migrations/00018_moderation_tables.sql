-- ============================================================================
-- Moderation Tables (Reports + User Blocks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT report_target_required CHECK (
        reported_video_id IS NOT NULL OR reported_user_id IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_video_id ON public.reports(reported_video_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);

CREATE TABLE IF NOT EXISTS public.blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT blocked_users_no_self_block CHECK (user_id <> blocked_user_id),
    CONSTRAINT blocked_users_unique_pair UNIQUE (user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON public.blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user_id ON public.blocked_users(blocked_user_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own reports"
    ON public.reports
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
    ON public.reports
    FOR SELECT
    USING (auth.uid() = reporter_id);

CREATE POLICY "Users can view own blocked users"
    ON public.blocked_users
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own blocks"
    ON public.blocked_users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id AND user_id <> blocked_user_id);

CREATE POLICY "Users can delete own blocks"
    ON public.blocked_users
    FOR DELETE
    USING (auth.uid() = user_id);
