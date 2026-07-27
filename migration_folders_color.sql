-- Etiqueta de color por carpeta
-- Run in Supabase SQL editor (Settings > SQL editor)
--
-- Guarda el hex directo (ej. '#C2410C'). NULL o '' = sin color.
-- La paleta válida vive en src/lib/folderColors.js.

ALTER TABLE folders ADD COLUMN IF NOT EXISTS color TEXT;

NOTIFY pgrst, 'reload schema';
