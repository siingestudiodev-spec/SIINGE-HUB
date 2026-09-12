-- ============================================================
-- Street address on manufacturers (sourcing already has one).
-- Feeds the Trip Map: precise pin placement + navigation links.
-- Run in Supabase SQL editor (hub: luqakyzgcgcafukfirfk).
-- ============================================================

ALTER TABLE manufacturers
  ADD COLUMN IF NOT EXISTS address text;

NOTIFY pgrst, 'reload schema';
