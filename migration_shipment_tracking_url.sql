-- ============================================================
-- Custom tracking URL for shipments (used when carrier = "Other")
-- Run in Supabase SQL editor (Settings > SQL editor).
-- ============================================================

ALTER TABLE project_shipments
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

NOTIFY pgrst, 'reload schema';
