-- Fabric library
-- Run in Supabase SQL editor  ⚠ HUB PROJECT: luqakyzgcgcafukfirfk
--
-- Sierra, 27 Jul: "Please add each of the qualities in the attached document to our fabric
-- library on the HUB." There was no fabric library — only project_materials, which requires a
-- project_id and so cannot hold a supplier's catalogue before it is assigned to a client.
--
-- Columns mirror project_materials on purpose, so a fabric can later be copied into a project
-- without remapping anything.

CREATE TABLE IF NOT EXISTS public.fabrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sourcing_id     UUID NOT NULL REFERENCES public.sourcing(id) ON DELETE CASCADE,
  article_number  TEXT,
  composition     TEXT,
  width           TEXT,
  weight          TEXT,
  color           TEXT,
  finish          TEXT,
  features        TEXT,
  price_per_meter TEXT,
  moq             TEXT,
  lead_time       TEXT,
  swatch_url      TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fabrics_sourcing_id_idx ON public.fabrics(sourcing_id);

ALTER TABLE public.fabrics ENABLE ROW LEVEL SECURITY;

-- Matches how the rest of the hub is exposed: the app talks to PostgREST with the anon key.
DROP POLICY IF EXISTS "fabrics all" ON public.fabrics;
CREATE POLICY "fabrics all" ON public.fabrics FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
