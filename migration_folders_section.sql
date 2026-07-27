-- ============================================================
-- Separate Manufacturers vs Sourcing folders
-- Adds a `section` column so each view only sees its own folders.
-- Run in Supabase SQL editor (Settings > SQL editor).
-- ============================================================

-- Existing folders default to 'manufacturers' (the default applies to current rows).
ALTER TABLE folders
  ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'manufacturers';

-- All current folders are now Manufacturers-only, so any Sourcing provider that
-- was in a shared folder loses its folder assignment.
UPDATE sourcing SET folder_id = NULL WHERE folder_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
