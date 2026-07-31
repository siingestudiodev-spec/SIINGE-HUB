-- Manual folder ordering (drag & drop)
-- Run in Supabase SQL editor (Settings > SQL editor)

ALTER TABLE folders ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- Backfill: keeps the current alphabetical order within each section, so the first
-- load looks the same as it did before the change.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY section ORDER BY name) - 1 AS pos
  FROM folders
)
UPDATE folders f SET position = o.pos
FROM ordered o
WHERE f.id = o.id AND f.position = 0;

NOTIFY pgrst, 'reload schema';
