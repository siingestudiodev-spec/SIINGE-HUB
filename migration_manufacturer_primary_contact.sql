-- ============================================================
-- Primary contact selection for manufacturers
-- Adds primary_contact_id so either the default contact
-- (NULL) or a manufacturer_contacts row can be the primary.
-- Run in Supabase SQL editor (Settings > SQL editor).
-- ============================================================

ALTER TABLE manufacturers
  ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES manufacturer_contacts(id) ON DELETE SET NULL;

-- Backfill: if a manufacturer_contacts row was already flagged is_primary = true,
-- point the new column at it instead of silently reverting to "default is primary".
-- DISTINCT ON picks one row per manufacturer if more than one was ever marked
-- primary (the old boolean never enforced uniqueness at the DB level).
UPDATE manufacturers m
SET primary_contact_id = sub.id
FROM (
  SELECT DISTINCT ON (manufacturer_id) id, manufacturer_id
  FROM manufacturer_contacts
  WHERE is_primary = true
  ORDER BY manufacturer_id, created_at ASC
) sub
WHERE m.id = sub.manufacturer_id;

NOTIFY pgrst, 'reload schema';
