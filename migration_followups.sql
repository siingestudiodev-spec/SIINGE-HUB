-- ============================================================
-- Follow-up system for manufacturers
-- Run this in the Supabase SQL editor (Settings > SQL editor)
-- ============================================================

-- 1. Add follow-up columns to manufacturers table
ALTER TABLE manufacturers
  ADD COLUMN IF NOT EXISTS followup_due_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_sent_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_manually_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS followup_notes                TEXT;

-- 2. App settings key-value store (may already exist — safe to run)
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index speeds up the active follow-up query
CREATE INDEX IF NOT EXISTS idx_manu_followup_active
  ON manufacturers (followup_due_at ASC)
  WHERE followup_sent_at IS NULL
    AND followup_manually_completed_at IS NULL
    AND followup_due_at IS NOT NULL;

-- ============================================================
-- pg_cron daily digest trigger
-- Run the block below SEPARATELY after deploying the
-- send-manu-digest edge function.
-- Replace <SERVICE_ROLE_KEY> with the value from
-- Supabase Dashboard > Settings > API > service_role secret.
-- ============================================================
--
-- SELECT cron.schedule(
--   'manu-daily-digest',          -- job name
--   '55 12 * * *',                -- 07:55 Bogotá (UTC-5) = 12:55 UTC
--   $$
--   SELECT net.http_post(
--     url     := 'https://dshnhzgnfgtwqobqazxu.supabase.co/functions/v1/send-manu-digest',
--     headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
--     body    := '{}'::jsonb
--   );
--   $$
-- );
--
-- To verify the job was created:
--   SELECT * FROM cron.job;
--
-- To remove the job:
--   SELECT cron.unschedule('manu-daily-digest');
