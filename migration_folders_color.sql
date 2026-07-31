-- Per-folder colour label
-- Run in Supabase SQL editor (Settings > SQL editor)
--
-- Stores the hex directly (e.g. '#C2410C'). NULL or '' means no colour.
-- The valid palette lives in src/lib/folderColors.js.

ALTER TABLE folders ADD COLUMN IF NOT EXISTS color TEXT;

NOTIFY pgrst, 'reload schema';
