-- Contacts found in the Titan mailbox export (Jul 2025 – Jul 2026)
-- Run in Supabase SQL editor  ⚠ HUB PROJECT: luqakyzgcgcafukfirfk
--
-- Two people who were emailing us but were not in the hub. Idempotent on (parent, name).

INSERT INTO public.sourcing_contacts (sourcing_id, name, title, email, phone)
SELECT v.sourcing_id::uuid, v.name, v.title, v.email, v.phone
FROM (VALUES
  -- Helun Knitting: the hub only had Allan Lin
  ('cad84fd8-3777-44d0-8d7b-1a75bf883e75', 'Xena Xu', '', 'xena-xu@helun-knitting.com.cn', '')
) AS v(sourcing_id, name, title, email, phone)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sourcing_contacts c
  WHERE c.sourcing_id = v.sourcing_id::uuid AND c.name = v.name
);

INSERT INTO public.manufacturer_contacts (manufacturer_id, name, title, email, phone)
SELECT v.manufacturer_id::uuid, v.name, v.title, v.email, v.phone
FROM (VALUES
  -- Yuuker: the hub only had Jane
  ('bd54837d-c790-4678-93ec-79df8cc0c1c8', 'Lesley', '', 'Lesley@yuuker.cn', '')
) AS v(manufacturer_id, name, title, email, phone)
WHERE NOT EXISTS (
  SELECT 1 FROM public.manufacturer_contacts c
  WHERE c.manufacturer_id = v.manufacturer_id::uuid AND c.name = v.name
);

NOTIFY pgrst, 'reload schema';
