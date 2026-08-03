-- Helun Knitting: the 17 qualities from the packing list, plus the shipment tracking
-- Run in Supabase SQL editor  ⚠ HUB PROJECT: luqakyzgcgcafukfirfk
-- ⚠ REQUIRES migration_fabrics.sql to have been run first.
--
-- Sierra, 27 Jul: "Please add each of the qualities in the attached document to our fabric
-- library on the HUB. Please also add tracking info for the shipment."
-- Source: "Siinge--Sierra White 2026-7-24.pdf", the packing list Xena Xu sent on 27 Jul.
--
-- Idempotent on (sourcing_id, article_number).

INSERT INTO public.fabrics (sourcing_id, article_number, composition, width, weight, features)
SELECT 'cad84fd8-3777-44d0-8d7b-1a75bf883e75'::uuid, v.art, v.comp, v.w, v.gsm, v.feat
FROM (VALUES
  ('D247315083101',     '75% Nylon Full Dull, 25% Spandex — single jersey',                                    '150 cm', '80 gsm',  'Lightweight · One size · Second skin · Wicking · Color+'),
  ('D247315082802',     '73% FDY Nylon, 27% Spandex — single jersey',                                          '132 cm', '85 gsm',  'Cooling · Lightweight · Smoothness · One size · Second skin'),
  ('D247315092501',     '80% Nylon, 20% Spandex — face-side peached single jersey',                            '128 cm', '110 gsm', 'Wicking · Comfort stretch · Soft handfeel'),
  ('S237315022201',     '33% Nylon Cool Jade, 34% Nylon, 33% Spandex — spacer',                                '140 cm', '130 gsm', 'Drape · Skin-friendly · Comfort stretch · Cooling, wicking and antibacterial yarn'),
  ('D207315080101',     '85% Nylon, 15% Elastane — single jersey',                                             '165 cm', '140 gsm', 'Antibacterial · Odor-resistant · FIR from yarn · Soft with gentle stretch and recovery'),
  ('D237315072602',     '79% Bio-based Nylon PA56, 21% Bio-based Spandex — pique',                             '158 cm', '150 gsm', 'Sustainable · Wicking · Skin-friendly · Comfort stretch'),
  ('D26414031101',      '68% Nylon, 32% Spandex — single jersey',                                              '130 cm', '150 gsm', '360 stretch and recovery · Exceptional softness · Free-cut edge, no hemming'),
  ('S26414012802',      '91% Lenzing Modal, 9% Spandex — 2x2 rib',                                             '128 cm', '160 gsm', 'Cloud-soft and cooling handfeel · 4-way stretch · Natural matte finish'),
  ('S23414051602',      '50% Cotton, 50% Modal — interlock',                                                   '165 cm', '160 gsm', 'Breathable · Soft handfeel'),
  ('D25124103101',      '57% Lenzing Modal, 38% Celys Polyester, 5% Spandex — jersey',                         '156 cm', '175 gsm', 'Comfort handfeel'),
  ('D20568070604-REC',  '87% Recycled Nylon, 13% Spandex — jersey',                                            '137 cm', '185 gsm', 'Cooling · Wicking · UPF50+'),
  ('S257315102004',     '50% Acrylic, 45% Modal, 5% Spandex — interlock',                                      '180 cm', '200 gsm', 'Soft handfeel'),
  ('S267315061801',     '80% NILIT SENSIL Softex Nylon Full Dull N66 yarn-dyed black, 20% Black Lycra — both-side-peached interlock', '150 cm', '215 gsm', 'Wicking'),
  ('D24361A022105',     '84% CD-Polyester, 16% Spandex — both-side-peached jersey',                            '140 cm', '230 gsm', ''),
  ('S23414050205',      '58% Viscose, 36% Nylon FD, 6% Spandex — ponte',                                       '175 cm', '235 gsm', 'Natural drape · Skin-friendly · Comfort stretch'),
  ('S26336020603',      '90% Polyester, 10% Spandex — double knit',                                            '165 cm', '250 gsm', 'Lightweight air-layer · Moisture-wicking and breathable · Skin-friendly touch'),
  ('S23414060501',      '47% Cotton, 46% Modal, 7% Spandex — interlock',                                       '155 cm', '265 gsm', 'Cloud-soft · 4-way stretch and moisture-wicking · Natural fibres')
) AS v(art, comp, w, gsm, feat)
WHERE NOT EXISTS (
  SELECT 1 FROM public.fabrics f
  WHERE f.sourcing_id = 'cad84fd8-3777-44d0-8d7b-1a75bf883e75'::uuid AND f.article_number = v.art
);

-- Shipment tracking, the second half of the same instruction.
UPDATE public.sourcing
SET notes = notes || E'\n\nSWATCH SHIPMENT: FedEx 8748 1648 7660, sent 24 Jul 2026 from Quanzhou to Sierra (Lakewood, CO). 0.5 kg, declared as fabric samples nylon/spandex/polyester/spandex. Headers for the 17 qualities in the fabric library.'
WHERE id = 'cad84fd8-3777-44d0-8d7b-1a75bf883e75'
  AND notes NOT LIKE '%8748 1648 7660%';

NOTIFY pgrst, 'reload schema';

-- Check: should return 17 rows
SELECT article_number, composition, width, weight
FROM public.fabrics
WHERE sourcing_id = 'cad84fd8-3777-44d0-8d7b-1a75bf883e75'
ORDER BY weight;
