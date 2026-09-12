// Starting points for the duty rate, not a classification. The real rate follows the
// 10-digit HTS code, which turns on knit vs woven, gender, garment type and the
// chief-weight fibre — a determination that belongs to a broker, not to a dropdown.
// These are the common apparel lines so a quote can be sized up in seconds; the rate
// stays editable in the form precisely because this list cannot be authoritative.
export const HTS_PRESETS = [
  { code: '6109.10.00', label: 'T-shirt / tank — cotton knit',        rate: 16.5 },
  { code: '6109.90.10', label: 'T-shirt / tank — synthetic knit',     rate: 32.0 },
  { code: '6110.20.20', label: 'Sweater / pullover — cotton knit',    rate: 16.5 },
  { code: '6110.30.30', label: 'Sweater / pullover — synthetic knit', rate: 32.0 },
  { code: '6104.63.20', label: 'Trousers / leggings — synthetic knit', rate: 28.2 },
  { code: '6104.62.20', label: 'Trousers / leggings — cotton knit',   rate: 14.9 },
  { code: '6205.20.20', label: 'Shirt, woven — cotton',               rate: 19.7 },
  { code: '6206.40.30', label: 'Blouse, woven — synthetic',           rate: 26.9 },
  { code: '6203.42.40', label: 'Trousers, woven — cotton',            rate: 16.6 },
  { code: '6212.10.90', label: 'Bra / bralette',                      rate: 16.9 },
  { code: '6112.41.00', label: 'Swimwear — synthetic knit',           rate: 24.9 },
  { code: '6117.10.20', label: 'Scarf / shawl — synthetic knit',      rate: 11.3 },
  { code: '6214.30.00', label: 'Scarf / shawl — synthetic woven',     rate: 5.3 },
  { code: '4202.92.31', label: 'Bag / tote — synthetic outer',        rate: 17.6 },
  { code: '6302.60.00', label: 'Towel / terry — cotton',              rate: 9.1 },
  { code: '6302.31.90', label: 'Bed linen — cotton',                  rate: 6.7 },
]

// The manufacturers table was typed by hand over a couple of years, so the same
// country shows up spelled several ways. Normalising here keeps the prefill working
// without a data-cleaning migration nobody asked for.
const ALIASES = {
  'colombiia': 'Colombia',
  'peru': 'Peru',
  'perú': 'Peru',
  'italia': 'Italy',
  'türkiye': 'Turkey',
  'turkiye': 'Turkey',
  'united states': 'USA',
  'us': 'USA',
  'u.s.a.': 'USA',
  'south korea': 'South Korea',
  'korea': 'South Korea',
}

export function normalizeCountry(raw) {
  if (!raw) return ''
  const key = raw.toString().trim().toLowerCase()
  if (ALIASES[key]) return ALIASES[key]
  return raw.toString().trim().replace(/\b\w/g, c => c.toUpperCase())
}
