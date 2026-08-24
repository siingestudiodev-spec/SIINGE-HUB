// Run with: node src/lib/quoteTemplate.test.js
import assert from 'node:assert/strict'
import { addTwoWeeks, joinPieces, compositionSentences, buildTemplateText, OPENERS } from './quoteTemplate.js'

// --- lead-time cushion ---
assert.equal(addTwoWeeks('3'), '5 weeks')
assert.equal(addTwoWeeks('6-8'), '8-10 weeks')
assert.equal(addTwoWeeks('23-38 days'), '37-52 days')
assert.equal(addTwoWeeks('Awaiting confirmation'), 'Awaiting confirmation', 'unparseable text passes through untouched')
assert.equal(addTwoWeeks(''), '')

// --- piece lists ---
assert.equal(joinPieces(['Scarf']), 'Scarf')
assert.equal(joinPieces(['Scarf', 'Sleeves']), 'Scarf and Sleeves')
assert.equal(joinPieces(['Scarf', 'Sleeves', 'Bag']), 'Scarf, Sleeves and Bag')

// --- composition grouping: shared blend collapses, the odd one out gets its own line ---
const items = [
  { material_comp: 'Scarf', composition: '70% Modal / 30% Nylon' },
  { material_comp: 'Sleeves', composition: '70% Modal / 30% Nylon' },
  { material_comp: 'Bag', composition: '100% Cotton' },
]
const sentences = compositionSentences(items, 0)
assert.deepEqual(sentences, [
  'They can offer 70% Modal / 30% Nylon for the Scarf and Sleeves.',
  'Bag would be 100% Cotton.',
])

// Quotes with no composition produce no sentence at all (old rows stay clean).
assert.deepEqual(compositionSentences([{ material_comp: 'Tee' }]), [])

// --- opener rotation: consecutive blocks must not repeat ---
const groups = [0, 1, 2, 3].map(i => ({
  label: `M${i}`, location: 'Dongguan',
  items: [{ material_comp: 'Scarf', composition: '100% Cotton' }],
}))
const openersUsed = buildTemplateText(groups)
  .split('\n\n\n')
  .map(block => OPENERS.find(o => block.includes(o)))
assert.equal(new Set(openersUsed).size, 4, 'four blocks should use four different openers')

// --- incoterm lands on its own line, separate from free-text Terms ---
const text = buildTemplateText([{
  label: 'LC', location: 'Dongguan',
  items: [{
    material_comp: 'Scarf', composition: '45% Modal / 35% Bamboo / 20% Nylon',
    pricing_tiers: [{ moq: '1,000', price: '$7.30' }], sample_cost: 68,
    sample_lead_time_display: '3', bulk_lead_time_display: '6',
    incoterm: 'EXW', port: 'Shanghai', notes: '100% payment before shipping.',
  }],
}])
assert.match(text, /^Incoterm: EXW — Shanghai$/m)
assert.match(text, /^Terms: 100% payment before shipping\.$/m)
assert.match(text, /^Minimum is 1,000 units\.$/m)
assert.match(text, /^Scarf - \$7\.30 \(sample cost \$68\)$/m)
assert.match(text, /^Sample Time 5 weeks$/m, 'lead time is padded by two weeks')
assert.match(text, /^Bulk Order Time 8 weeks$/m)

// A quote with no incoterm must not emit the line at all.
assert.doesNotMatch(
  buildTemplateText([{ label: 'X', location: '', items: [{ material_comp: 'Tee' }] }]),
  /Incoterm:/,
)

console.log('quoteTemplate: all checks passed')
