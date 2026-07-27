-- ============================================================
-- Certifications for Sourcing providers
-- Same pattern as manufacturers.certifications (comma-separated string).
-- Run in Supabase SQL editor (Settings > SQL editor).
-- ============================================================

ALTER TABLE sourcing
  ADD COLUMN IF NOT EXISTS certifications TEXT;

NOTIFY pgrst, 'reload schema';
