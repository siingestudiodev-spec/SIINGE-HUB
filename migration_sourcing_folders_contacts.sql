-- ============================================================
-- Folders + multiple contacts for Sourcing providers
-- Same pattern already used on manufacturers / manufacturer_contacts.
-- Run in Supabase SQL editor (Settings > SQL editor).
-- ============================================================

-- Reuse the existing `folders` table (shared with manufacturers) so a
-- folder can group sourcing providers too.
ALTER TABLE sourcing
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Additional contacts, same shape as manufacturer_contacts.
CREATE TABLE IF NOT EXISTS sourcing_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sourcing_id UUID REFERENCES sourcing(id) ON DELETE CASCADE NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NULL = the provider's own contact_name/phone/email is primary (same
-- convention as manufacturers.primary_contact_id).
ALTER TABLE sourcing
  ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES sourcing_contacts(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
