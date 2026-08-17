-- ============================================================
-- Manufacturers assigned to a project (many-to-many: a project
-- can have several manufacturers, e.g. one for the swimsuit and
-- a different one for the bag).
-- Run in the Supabase SQL editor (Settings > SQL editor).
-- ============================================================

CREATE TABLE IF NOT EXISTS project_manufacturers (
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, manufacturer_id)
);

CREATE INDEX IF NOT EXISTS idx_project_manufacturers_manufacturer
  ON project_manufacturers (manufacturer_id);

ALTER TABLE project_manufacturers ENABLE ROW LEVEL SECURITY;

-- Matches how the rest of the hub is exposed: the app talks to PostgREST with the
-- anon key. Without this, RLS blocks every select silently — no error, empty result
-- — which is exactly what showed up empty in the Manufacturers modal just now.
DROP POLICY IF EXISTS "project_manufacturers all" ON project_manufacturers;
CREATE POLICY "project_manufacturers all" ON project_manufacturers FOR ALL USING (true) WITH CHECK (true);

-- Backfill: any manufacturer that already has a quote on a project counts as
-- assigned to it, going back over everything entered before this table existed.
-- From here on the app keeps this in sync itself whenever a quote is saved.
INSERT INTO project_manufacturers (project_id, manufacturer_id)
SELECT DISTINCT project_id, manufacturer_id
FROM quotes
WHERE project_id IS NOT NULL AND manufacturer_id IS NOT NULL
ON CONFLICT (project_id, manufacturer_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
