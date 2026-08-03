-- Manufacturers: city, and a reason for the ones we walked away from
-- Run in Supabase SQL editor (Settings > SQL editor)
-- ⚠ HUB PROJECT: luqakyzgcgcafukfirfk

-- Sourcing already had a city; manufacturers did not, so the location was only ever
-- as precise as the country.
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS city TEXT;

-- Sierra, 23 Jul: "Add notes to why we are not moving forward with them. We still want to
-- keep the record of it, but yes maybe there is a way to show that we will not be moving
-- forward with them". The "NOT INTERESTED" folder hides them but does not say why.
-- Non-empty means declined: the card dims and shows the reason.
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS declined_reason TEXT;

NOTIFY pgrst, 'reload schema';
