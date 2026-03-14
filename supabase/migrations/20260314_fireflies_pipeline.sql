-- ============================================
-- Fireflies Meeting Pipeline — DB Migration
-- Run this in your Supabase SQL editor
-- ============================================

-- 1. Track processed Fireflies meetings (prevents double-processing)
CREATE TABLE IF NOT EXISTS crm_processed_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fireflies_id text UNIQUE NOT NULL,
  title text,
  meeting_date timestamptz,
  processed_at timestamptz DEFAULT now(),
  attendee_count int DEFAULT 0,
  action_items_found int DEFAULT 0
);

-- 2. Enhance crm_reminders with ownership + approval flow columns
ALTER TABLE crm_reminders
  ADD COLUMN IF NOT EXISTS owner text CHECK (owner IN ('mine', 'theirs')) DEFAULT 'mine',
  ADD COLUMN IF NOT EXISTS meeting_id text,
  ADD COLUMN IF NOT EXISTS telegram_msg_id text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS clickup_task_id text;

-- 3. Update status values (informational comment — Supabase uses text, no enum change needed)
-- New valid status values:
--   'pending'            → original default
--   'pending_approval'   → waiting for Telegram approve/reject
--   'approved'           → approved but task not yet created
--   'rejected'           → rejected via Telegram
--   'task_created'       → ClickUp task was created  
--   'waiting_on'         → action item for the OTHER person (tracking)

-- 4. Index for fast lookup by meeting_id
CREATE INDEX IF NOT EXISTS idx_crm_reminders_meeting_id ON crm_reminders(meeting_id);
CREATE INDEX IF NOT EXISTS idx_crm_processed_meetings_date ON crm_processed_meetings(meeting_date);
