-- Functional Fabric Fair NYC contacts (8-9 July 2026)
-- Run in Supabase SQL editor (Settings > SQL editor)
-- ⚠ CORRECT PROJECT: luqakyzgcgcafukfirfk (SIINGE HUB), NOT the CRM project
--   (pbylrmaqtmgnywzdliql). These tables only exist in the hub.
--
-- The companies were already loaded via the API. These contacts could NOT be inserted with
-- the anon key: RLS on public.sourcing_contacts and public.manufacturer_contacts only allows
-- writes to the authenticated role. Pasting this into the SQL editor solves it.
--
-- primary_contact_id is deliberately left NULL: Sierra stars the primaries herself
-- ("I will star primary contacts later"). With NULL the app treats the row.s own contact
-- (contact_name/email/phone) as the default primary.
--
-- Idempotent: the WHERE NOT EXISTS prevents duplicates if run twice.

INSERT INTO public.sourcing_contacts (sourcing_id, name, title, email, phone)
SELECT v.sourcing_id::uuid, v.name, v.title, v.email, v.phone
FROM (VALUES
  -- São Pedro de Alcântara (SPA Têxtil)
  ('e28d1638-2fcb-4f5b-9c3b-5aebe8ebdcf9', 'Rosalind Bullard', 'Main contact / LA representative', 'designedbyyoumfg@gmail.com', '+55 47 99166-8106'),
  -- K and K Clothing Accessories
  ('773adea1-9e3b-40ce-b163-c818a0a8cd90', 'Judy',    '',                'judy@knktdg.com',    '+852 2614 7068'),
  ('773adea1-9e3b-40ce-b163-c818a0a8cd90', 'Shirley', '',                'shirley@knktdg.com', ''),
  ('773adea1-9e3b-40ce-b163-c818a0a8cd90', 'General inquiries', '',      'inquiry@knktdg.com', '+852 2614 7068'),
  -- Pro Stretch Trims International
  ('0cf435bb-ecb0-4aa7-92c6-0e48454c51f8', 'General inquiries', '',      'info@pro-stretch.net', '+44 (0)1260 291691'),
  -- Murphytex Industrial
  ('27a72f75-baf4-4968-9a8e-e871be97d0a9', 'A. Lee',  '',                'alee@murphytex.com', '+886 2 8522 7226'),
  -- Color Sorts
  ('ae95fc20-e6ec-4368-bc20-61ce73783e9d', 'Baber Iftikhar (alt.)', '',  'baber+1@colorsorts.com', ''),
  ('ae95fc20-e6ec-4368-bc20-61ce73783e9d', 'Dana',    '',                'dana@colorsorts.com', ''),
  -- Imbotex
  ('696a0b95-15a7-42e3-8713-f6caeb95689c', 'General inquiries', '',      'info@imbotex.it',    '+39 049 944 5022'),
  -- SAB One Stop Garment Accessories
  ('4329219c-286a-4ccc-ab2c-70d96fda9a98', 'Zipper division',  '',       'zipper@sab-cn.com',  '0086 576 85979788'),
  ('4329219c-286a-4ccc-ab2c-70d96fda9a98', 'Button division',  '',       'button@sab-cn.com',  '0086 576 85979788'),
  -- Hohenstein
  ('63446651-8d78-4f05-a4ef-a9b5662a678e', 'Ben Mead', 'Managing Director, Hohenstein Americas', 'USA@Hohenstein.com', '+1 800 731 9468')
) AS v(sourcing_id, name, title, email, phone)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sourcing_contacts c
  WHERE c.sourcing_id = v.sourcing_id::uuid AND c.name = v.name
);

INSERT INTO public.manufacturer_contacts (manufacturer_id, name, title, email, phone)
SELECT v.manufacturer_id::uuid, v.name, v.title, v.email, v.phone
FROM (VALUES
  -- CASLA (California Apparel Services)
  ('7420062a-e831-49fc-810a-b0f8907b599c', 'Adrian Amaya', '', 'adrian@casla.us', '+1 818 632 7885'),
  ('7420062a-e831-49fc-810a-b0f8907b599c', 'Addy Jinnah',  '', 'adnan@casla.us',  '+1 818 632 7885'),
  -- Hemp Fortex
  ('8833aecd-7590-410c-931b-37ae2d1924f4', 'General inquiries', '', 'info@hempfortex.com', '')
) AS v(manufacturer_id, name, title, email, phone)
WHERE NOT EXISTS (
  SELECT 1 FROM public.manufacturer_contacts c
  WHERE c.manufacturer_id = v.manufacturer_id::uuid AND c.name = v.name
);

NOTIFY pgrst, 'reload schema';
