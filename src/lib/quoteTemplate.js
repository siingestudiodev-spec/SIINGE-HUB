// Builds the client-facing text for a set of selected quotes. Pure functions, no Vue
// and no Supabase, so `node src/lib/quoteTemplate.test.js` can exercise them directly.

// Openers for the composition sentence. Rotated per manufacturer block so four
// factories in a row don't all read "They can offer...".
export const OPENERS = [
  'They can offer',
  'They are able to achieve',
  'They can achieve',
  'They are able to offer',
  'They can produce',
  'They are able to work with',
]

// Sierra's cushion rule: pad every quoted lead time by 2 weeks before it goes to a
// client. Handles "X", "X-Y" and a trailing unit (defaults to weeks, honors "days").
// ponytail: numbers-only text is all this needs to catch; anything it can't parse
// (e.g. "TBD", "Awaiting confirmation") is left untouched rather than guessed at — it's
// an editable preview, so an unpadded line is easy to spot and fix by hand rather than
// something silently wrong.
export function addTwoWeeks(raw) {
  if (raw == null || raw === '') return raw
  const text = raw.toString().trim()
  const m = text.match(/^(\d+)\s*(?:-\s*(\d+))?\s*(day|days|week|weeks)?$/i)
  if (!m) return text
  const unit = /day/i.test(m[3] || '') ? 'days' : 'weeks'
  const pad = unit === 'days' ? 14 : 2
  const lo = Number(m[1]) + pad
  const hi = m[2] ? Number(m[2]) + pad : null
  return hi ? `${lo}-${hi} ${unit}` : `${lo} ${unit}`
}

// "Scarf, Sleeves and Bag" — the piece names as an English list.
export function joinPieces(names) {
  if (names.length === 0) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

// Items sharing an identical composition collapse into one sentence naming all their
// pieces; the first group leads with the rotated opener, the rest read "X would be Y."
// ponytail: groups on the composition string verbatim — "100% Cotton" and "100% cotton"
// stay separate. Normalizing would also merge two genuinely different quotes that differ
// only in typing, and the box is editable. Trim-and-lowercase the key here if the
// near-duplicates get annoying in practice.
export function compositionSentences(items, openerIndex = 0) {
  const groups = []
  items.forEach(q => {
    if (!q.composition) return
    const piece = q.material_comp || q.item_description || 'Item'
    const hit = groups.find(g => g.composition === q.composition)
    if (hit) hit.pieces.push(piece)
    else groups.push({ composition: q.composition, pieces: [piece] })
  })
  if (groups.length === 0) return []

  return groups.map((g, i) => {
    const pieces = joinPieces(g.pieces)
    if (i === 0) return `${OPENERS[openerIndex % OPENERS.length]} ${g.composition} for the ${pieces}.`
    return `${pieces} would be ${g.composition}.`
  })
}

// One block per manufacturer: header, composition sentence(s), MOQ, a line per option,
// lead times, then the shipping term and any free-text terms.
export function buildBlock({ label, location, items }, index = 0) {
  const lines = [`Manu - ${label}${location ? ' - ' + location : ''}`, '']

  const sentences = compositionSentences(items, index)
  if (sentences.length > 0) lines.push(sentences.join(' '), '')

  const tierMoq = items.map(q => q.pricing_tiers?.[0]?.moq).find(Boolean)
  const perColorMoq = items.map(q => q.moq_per_color).find(Boolean)
  if (tierMoq) lines.push(`Minimum is ${tierMoq} units.`, '')
  else if (perColorMoq) lines.push(`Minimum is ${perColorMoq} units per color.`, '')

  items.forEach(q => {
    const desc = q.material_comp || q.item_description || 'Item'
    const name = q.specialty ? `${desc} — ${q.specialty}` : desc
    const price = q.pricing_tiers?.[0]?.price || q.price_range || '—'
    lines.push(`${name} - ${price}${q.sample_cost ? ` (sample cost $${q.sample_cost})` : ''}`)
  })
  lines.push('')

  const sampleTime = items.map(q => q.sample_lead_time_display).find(Boolean)
  const bulkTime = items.map(q => q.bulk_lead_time_display).find(Boolean)
  lines.push(`Sample Time ${addTwoWeeks(sampleTime) || '—'}`)
  lines.push(`Bulk Order Time ${addTwoWeeks(bulkTime) || '—'}`)

  // Incoterm gets its own line, separate from the free-text Terms below it.
  const incoterm = items.map(q => q.incoterm).find(Boolean)
  const port = items.map(q => q.port).find(Boolean)
  if (incoterm) lines.push('', `Incoterm: ${incoterm}${port ? ' — ' + port : ''}`)

  const terms = items.map(q => q.notes).find(Boolean)
  if (terms) lines.push('', `Terms: ${terms}`)

  return lines.join('\n')
}

// `groups` is [{ label, location, items }] — already filtered to the selected options,
// already stripped of empty groups by the caller.
export function buildTemplateText(groups) {
  return groups
    .filter(g => g.items.length > 0)
    .map((g, i) => buildBlock(g, i))
    .join('\n\n\n')
}
