-- Orden manual de carpetas (drag & drop)
-- Run in Supabase SQL editor (Settings > SQL editor)

ALTER TABLE folders ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- Backfill: conserva el orden alfabético actual dentro de cada sección,
-- para que la primera carga se vea igual que antes del cambio.
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY section ORDER BY name) - 1 AS pos
  FROM folders
)
UPDATE folders f SET position = o.pos
FROM ordered o
WHERE f.id = o.id AND f.position = 0;

NOTIFY pgrst, 'reload schema';
