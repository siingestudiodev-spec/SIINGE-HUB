-- ============================================================
-- Trip Map — supplier map + trip planner
-- Run in Supabase SQL editor (proyecto hub: luqakyzgcgcafukfirfk).
-- ============================================================

-- Coordinates on the source tables (reusable across the app).
ALTER TABLE manufacturers
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lon double precision;

ALTER TABLE sourcing
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lon double precision;

-- One row per trip. Cities and the route plan live in jsonb — few rows, edited as a whole.
--   legs      [{id, city, country, lat, lon, from, to, travelIn, travelOut, radiusKm}]
--   blackouts [{from, to, label}]                  rangos sin reuniones
--   data      {routes:{legId:[stopKey]}, places:[], appointments:[]}
--             stopKey      = "m:<manufacturer id>" | "s:<sourcing id>" | "c:<place id>"
--             places       [{id, label, kind:'stay'|'venue'|'other', lat, lon, legId, from, to, note}]
--                          a leg's 'stay' place is the origin of that leg's driving route
--             appointments [{id, key:stopKey, legId, date, time, confirmed, note}]
--             Older rows carry bases/customStops instead. normalizeData() in
--             src/lib/trips.js folds those into places on read, so nothing to migrate here.
CREATE TABLE IF NOT EXISTS trips (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  date_start  date,
  date_end    date,
  legs        jsonb not null default '[]'::jsonb,
  blackouts   jsonb not null default '[]'::jsonb,
  data        jsonb not null default '{}'::jsonb,
  archived    boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Same access model as the rest of the hub (internal tool, no per-row auth).
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;

-- Replaced by `trips` (was a single hardcoded row).
DROP TABLE IF EXISTS trip_map_config;

NOTIFY pgrst, 'reload schema';
