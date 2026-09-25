// Run with: node src/lib/sop.test.js
import assert from 'node:assert/strict'
import { DAILY, WEEKLY, signals, status, progress, weekOf } from './sop.js'

// --- every item is addressable and unique: state is stored by id ---
const ids = [...DAILY, ...WEEKLY].flatMap(s => s.items.map(i => `${s.id}.${i.id}`))
assert.equal(new Set(ids).size, ids.length, 'no duplicate section.item ids')
assert.ok(DAILY.every(s => s.items.length && s.title && s.objective))
assert.ok(WEEKLY.every(s => s.items.length && s.title && s.objective))

// --- a clean day closes its own checkboxes ---
const quiet = signals({ pending: [], followupsDue: 0 })
const quietDaily = status(DAILY, quiet, {})
const idReplies = quietDaily.find(s => s.id === 'email-review').items.find(i => i.id === 'id-replies')
assert.equal(idReplies.done, true, 'nobody waiting means the step is done')
assert.equal(idReplies.by, 'data')
assert.equal(idReplies.evidence, 'nobody waiting')

// --- a day with work waiting does not ---
const busy = signals({
  pending: [{}, {}, {}],
  followupsDue: 2,
  inbound: [{}, {}],
  audits: [
    { table_name: 'manufacturers', action: 'INSERT' },
    { table_name: 'manufacturers', action: 'UPDATE' },
    { table_name: 'quotes', action: 'UPDATE' },
  ],
  sends: [{ template_name: 'Initial Reach' }, { template_name: 'Custom Email' }],
})
const busyDaily = status(DAILY, busy, {})
const waiting = busyDaily.find(s => s.id === 'followup').items.find(i => i.id === 'review-waiting')
assert.equal(waiting.done, false, 'three people waiting is not a finished step')
assert.equal(waiting.evidence, '3 waiting')

assert.equal(busy.manufacturersAdded.n, 1)
assert.equal(busy.manufacturerEdits.n, 2, 'insert and update both count as touching the record')
assert.equal(busy.outreachSent.n, 1)
assert.equal(busy.newEmails.label, '2 received')

// --- ticking by hand overrides, and says who did it ---
const byHand = status(DAILY, busy, { 'review-waiting': true })
  .find(s => s.id === 'followup').items.find(i => i.id === 'review-waiting')
assert.equal(byHand.done, true)
assert.equal(byHand.by, 'you')

// --- a target closes when it is reached, not when it hits zero ---
const network = n => status(WEEKLY, signals({ audits: Array.from({ length: n }, () => ({ table_name: 'manufacturers', action: 'INSERT' })) }), {})
  .find(s => s.id === 'w-network').items.find(i => i.id === 'add-15')
assert.equal(network(3).done, false, '3 of 15 is not done')
assert.equal(network(3).evidence, '3 added')
assert.equal(network(15).done, true, 'hitting the target closes it')
assert.equal(network(21).done, true)

// --- manual items never close on their own ---
const manuals = status(DAILY, quiet, {}).flatMap(s => s.items).filter(i => i.manual)
assert.ok(manuals.length >= 3, 'the SOP has steps no database can see')
assert.ok(manuals.every(i => !i.done), 'WhatsApp and Drive cannot be verified from here')

// --- progress counts items, not sections ---
const p = progress(quietDaily)
assert.equal(p.total, DAILY.reduce((n, s) => n + s.items.length, 0))
assert.ok(p.done > 0 && p.done < p.total)
assert.equal(p.pct, Math.round(p.done / p.total * 100))

// --- the weekly sheet is filed under its Monday ---
assert.equal(weekOf('2026-09-24'), '2026-09-21', 'Thursday files under Monday')
assert.equal(weekOf('2026-09-21'), '2026-09-21', 'Monday is its own week')
assert.equal(weekOf('2026-09-27'), '2026-09-21', 'Sunday closes that same week')
assert.equal(weekOf('2026-09-28'), '2026-09-28', 'the next Monday opens a new one')

console.log('sop: all checks passed')
