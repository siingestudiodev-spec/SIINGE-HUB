-- ============================================================
-- Reference-work folders on a manufacturer's card: links to photos
-- of similar past projects, so you can judge their work before
-- committing to a new one. Same shape as project_drive_folders.
-- Run in the Supabase SQL editor (Settings > SQL editor).
-- ============================================================

CREATE TABLE IF NOT EXISTS manufacturer_reference_folders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manufacturer_reference_folders_manufacturer
  ON manufacturer_reference_folders (manufacturer_id);

ALTER TABLE manufacturer_reference_folders ENABLE ROW LEVEL SECURITY;

-- Matches how the rest of the hub is exposed: the app talks to PostgREST with the anon key.
DROP POLICY IF EXISTS "manufacturer_reference_folders all" ON manufacturer_reference_folders;
CREATE POLICY "manufacturer_reference_folders all" ON manufacturer_reference_folders FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
