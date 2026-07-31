-- Contactos de las tarjetas de presentación — Functional Fabric Fair NYC, julio 2026
-- Run in Supabase SQL editor (Settings > SQL editor)
--
-- ⚠ PROYECTO CORRECTO: luqakyzgcgcafukfirfk (SIINGE HUB), NO el del CRM (pbylrmaqtmgnywzdliql).
--
-- Segunda tanda. Las empresas ya se cargaron vía API; estos contactos no se pueden insertar
-- con la anon key porque RLS en sourcing_contacts / manufacturer_contacts solo permite
-- escritura al rol authenticated.
--
-- NO incluye los casos dudosos que Luis revisa a mano:
--   · Leah Galkin (WA0011) — la tarjeta no lleva nombre de empresa
--   · Ellie Lin (WA0012) — logos de Donglong Lace y Qingyang Fabric, empleador sin confirmar
--   · Jason / Koumtex (WA0014) — sticker pegado sobre la tarjeta de Dafabrics
--
-- primary_contact_id se deja en NULL: Sierra marca las estrellas.
-- Idempotente: el WHERE NOT EXISTS evita duplicar si se corre dos veces.

INSERT INTO public.sourcing_contacts (sourcing_id, name, title, email, phone)
SELECT v.sourcing_id::uuid, v.name, v.title, v.email, v.phone
FROM (VALUES
  -- Contactos nuevos para empresas que ya estaban en el hub
  ('ac4eed66-af6b-48fa-ab5b-d9273d86fc08', 'Josephine Ng', 'Director, Marketing Department', 'josephine.ng@shltd.com', '+852 9866 2270'),
  ('4329219c-286a-4ccc-ab2c-70d96fda9a98', 'Jack Ye', 'VP of Marketing, North America', 'jack.ye@sab-cn.com', '+1 213 392 0400'),
  ('95badfd5-3d78-4d81-9e05-9adeb27d9da5', 'Angel', 'Sales', 'angel@sanjintex.cn', '+86 19951022899'),
  ('b97d79a8-a694-4445-8346-ab19be7b0eea', 'Gina Wu', '', 'gina@superwill.com.tw', '+886 2 2259 2737 ext. 213'),
  ('0cf435bb-ecb0-4aa7-92c6-0e48454c51f8', 'Mark Wingate', 'International Business Development Manager', 'markwingate@pro-stretch.net', '+44 7989 929468'),
  ('63446651-8d78-4f05-a4ef-a9b5662a678e', 'Michelle Singh', 'Senior Sales Executive, Hohenstein Americas', 'michelle.singh@hohenstein.com', '+1 585 734 8132'),
  -- Contactos de las 5 empresas nuevas de Sourcing
  ('c6eaa88f-bfa1-4f6c-8434-c3af3f9912ba', 'Carrie Wu', 'Section Chief', 'carrie@toungloong.com.tw', '0917-990501'),
  ('cad84fd8-3777-44d0-8d7b-1a75bf883e75', 'Allan Lin', 'Senior Sales Manager', 'allan@helun-knitting.com.cn', '+86 18965617590'),
  ('43418edb-c3e6-4150-b3d7-2364173e2b01', 'Ni Hongping', 'Sales Manager', 'nihongping@dafabrics.com', ''),
  ('43418edb-c3e6-4150-b3d7-2364173e2b01', 'Zhou Minghao', 'Sales Manager', 'zhouminghao@dafabrics.com', ''),
  ('43418edb-c3e6-4150-b3d7-2364173e2b01', 'Zhong Jun (Maggie)', 'Sales Manager', 'maggiezhong@dafabrics.com', ''),
  ('e0475166-fc5f-47a6-ba51-80a5300b4ec0', 'Gemma Liu', 'Assistant Manager, Sales Department', 'gemma.liu@uniaitex.com', '+84 28 38430 101')
) AS v(sourcing_id, name, title, email, phone)
WHERE NOT EXISTS (
  SELECT 1 FROM public.sourcing_contacts c
  WHERE c.sourcing_id = v.sourcing_id::uuid AND c.name = v.name
);

INSERT INTO public.manufacturer_contacts (manufacturer_id, name, title, email, phone)
SELECT v.manufacturer_id::uuid, v.name, v.title, v.email, v.phone
FROM (VALUES
  -- Cheng Ye: Evan Hsu, el General Manager de la filial estadounidense
  ('c9f50db5-2b05-42e9-8d05-7dbbfe6605c4', 'Evan Hsu (Hsu, Chia-Hung)', 'General Manager, House of Cyan LLC', 'evan.h@chengye-fashion.com', '+1 424 352 9266'),
  ('c9f50db5-2b05-42e9-8d05-7dbbfe6605c4', 'Ivy Y.', '', 'ivy.y@chengye-fashion.com', '+886 3 366 5881')
) AS v(manufacturer_id, name, title, email, phone)
WHERE NOT EXISTS (
  SELECT 1 FROM public.manufacturer_contacts c
  WHERE c.manufacturer_id = v.manufacturer_id::uuid AND c.name = v.name
);

NOTIFY pgrst, 'reload schema';
