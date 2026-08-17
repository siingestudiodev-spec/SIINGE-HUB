-- ============================================================
-- Two dates on the manufacturer card: when certifications were
-- requested from the factory, and when they were received.
-- Run in the Supabase SQL editor (Settings > SQL editor).
-- ============================================================

ALTER TABLE manufacturers
  ADD COLUMN IF NOT EXISTS certs_requested_at DATE,
  ADD COLUMN IF NOT EXISTS certs_received_at  DATE;

NOTIFY pgrst, 'reload schema';
