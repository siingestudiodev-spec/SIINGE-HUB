-- ============================================================
-- Fix "material_comp column not found" + align quotes table
-- with what QuoteComparison.vue actually saves.
-- Run in Supabase SQL editor (Settings > SQL editor).
-- ============================================================

ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS material_comp          TEXT,
  ADD COLUMN IF NOT EXISTS item_description        TEXT,
  ADD COLUMN IF NOT EXISTS specialty                TEXT,
  ADD COLUMN IF NOT EXISTS notes                    TEXT,
  ADD COLUMN IF NOT EXISTS sample_cost              NUMERIC,
  ADD COLUMN IF NOT EXISTS sample_lead_time         INTEGER,
  ADD COLUMN IF NOT EXISTS bulk_lead_time           INTEGER,
  ADD COLUMN IF NOT EXISTS sample_lead_time_text    TEXT,
  ADD COLUMN IF NOT EXISTS bulk_lead_time_text      TEXT,
  ADD COLUMN IF NOT EXISTS pricing_tiers            JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_range              TEXT,
  ADD COLUMN IF NOT EXISTS moq_per_color             INTEGER;

-- Force PostgREST to pick up the new columns immediately
-- (otherwise it can take a minute to notice on its own).
NOTIFY pgrst, 'reload schema';
