-- ============================================================
-- Quote timeline: the date a quote was requested from the
-- manufacturer, and the date they delivered it back.
-- Run in the Supabase SQL editor (Settings > SQL editor).
-- ============================================================

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS requested_at DATE,
  ADD COLUMN IF NOT EXISTS received_at  DATE;

NOTIFY pgrst, 'reload schema';
