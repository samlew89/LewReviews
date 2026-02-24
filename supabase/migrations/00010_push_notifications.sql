-- ============================================================================
-- Push Notifications Migration
-- ============================================================================

-- Add push notification columns to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS badge_count INTEGER DEFAULT 0;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('new_review', 'response')),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching user's notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- Trigger function to queue notifications on video INSERT
-- ============================================================================
CREATE OR REPLACE FUNCTION queue_video_notifications()
RETURNS TRIGGER AS $$
DECLARE
    follower_record RECORD;
    video_owner_id UUID;
    sender_username TEXT;
    parent_video RECORD;
BEGIN
    -- Get sender username
    SELECT username INTO sender_username FROM profiles WHERE id = NEW.user_id;

    -- Case 1: Root video (no parent) - notify all followers
    IF NEW.parent_video_id IS NULL THEN
        FOR follower_record IN
            SELECT follower_id FROM follows WHERE following_id = NEW.user_id
        LOOP
            INSERT INTO notifications (recipient_id, sender_id, type, video_id, title, body)
            VALUES (
                follower_record.follower_id,
                NEW.user_id,
                'new_review',
                NEW.id,
                'New Review',
                sender_username || ' posted a new review: ' || NEW.title
            );
        END LOOP;

    -- Case 2: Response video - notify parent video owner
    ELSE
        -- Get parent video owner
        SELECT user_id INTO video_owner_id FROM videos WHERE id = NEW.parent_video_id;

        -- Don't notify if responding to own video
        IF video_owner_id IS NOT NULL AND video_owner_id != NEW.user_id THEN
            INSERT INTO notifications (recipient_id, sender_id, type, video_id, title, body)
            VALUES (
                video_owner_id,
                NEW.user_id,
                'response',
                NEW.id,
                CASE WHEN NEW.agree_disagree THEN 'Someone agreed!' ELSE 'Someone disagreed!' END,
                sender_username || CASE WHEN NEW.agree_disagree THEN ' agreed with ' ELSE ' disagreed with ' END || 'your take'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first if exists to avoid duplicates)
DROP TRIGGER IF EXISTS on_video_insert_queue_notifications ON videos;
CREATE TRIGGER on_video_insert_queue_notifications
    AFTER INSERT ON videos
    FOR EACH ROW
    WHEN (NEW.status = 'ready')
    EXECUTE FUNCTION queue_video_notifications();

-- ============================================================================
-- RLS Policies for notifications
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = recipient_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- Allow service role to insert notifications (trigger runs as SECURITY DEFINER)
CREATE POLICY "Service role can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (TRUE);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (auth.uid() = recipient_id);
