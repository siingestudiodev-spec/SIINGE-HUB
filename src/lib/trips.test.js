// Run with: node src/lib/trips.test.js
import assert from 'node:assert/strict'
import {
  legFreeDays, apptDateWarning, agendaDays, apptStats,
  legForDate, normalizeData, stayOf, hav, apptLegFor, tripICS, gcalLink,
} from './trips.js'

const TRIP = {
  blackouts: [{ from: '2026-09-24', to: '2026-09-24', label: 'holiday' }],
  legs: [
    { id: 'l1', city: 'Porto', from: '2026-09-21', to: '2026-09-26', travelIn: true, travelOut: true },
    { id: 'l2', city: 'Naples', from: '2026-09-27', to: '2026-09-29', travelIn: true, travelOut: false },
  ],
}

// --- meeting windows: travel days off both ends, blackout carved out ---
const p = legFreeDays(TRIP.legs[0], TRIP.blackouts)
assert.deepEqual(p.free, ['2026-09-22', '2026-09-23', '2026-09-25'], 'Porto: drops 21st, 26th and the holiday')
assert.equal(p.count, 3)
assert.equal(legFreeDays(TRIP.legs[1], TRIP.blackouts).count, 2, 'Naples keeps its last day (travelOut off)')

// --- a date maps back to its leg ---
assert.equal(legForDate(TRIP, '2026-09-28').city, 'Naples')
assert.equal(legForDate(TRIP, '2026-10-05'), null, 'nothing scheduled after the trip')

// --- scheduling guardrails ---
assert.equal(apptDateWarning(TRIP, '2026-09-22'), '', 'a real meeting day passes clean')
assert.match(apptDateWarning(TRIP, '2026-09-21'), /travel or blackout/, 'arrival day is a travel day')
assert.match(apptDateWarning(TRIP, '2026-09-24'), /travel or blackout/, 'the holiday is blocked')
assert.match(apptDateWarning(TRIP, '2026-12-01'), /outside every city/, 'off-trip dates are flagged')
assert.equal(apptDateWarning(TRIP, ''), 'no date yet')

// --- overlapping legs: the city you booked under wins ---
// The real trip has Madrid 9/22-24 and Seville 9/23-26 — 9/23 and 9/24 are claimed by both.
const OVERLAP = {
  blackouts: [],
  legs: [
    { id: 'mad1', city: 'Madrid', from: '2026-09-22', to: '2026-09-24', travelIn: true, travelOut: true },
    { id: 'sev', city: 'Seville', from: '2026-09-23', to: '2026-09-26', travelIn: true, travelOut: true },
  ],
}
assert.equal(legForDate(OVERLAP, '2026-09-23').id, 'mad1', 'a bare date lookup can only pick the first claimant')
assert.equal(apptLegFor(OVERLAP, '2026-09-23', 'sev'), 'sev', 'booked under Seville on 9/23 stays in Seville')
assert.equal(apptLegFor(OVERLAP, '2026-09-24', 'mad1'), 'mad1', 'booked under Madrid on 9/24 stays in Madrid')
assert.equal(apptLegFor(OVERLAP, '2026-09-24', 'sev'), 'sev', 'and Seville keeps its own 9/24 booking')
assert.equal(apptLegFor(OVERLAP, '2026-09-26', 'mad1'), 'sev', 'a date Madrid does not cover reassigns to Seville')
assert.equal(apptLegFor(OVERLAP, '2026-12-01', 'mad1'), 'mad1', 'a date outside every leg keeps the leg it was booked under')
assert.equal(apptLegFor(OVERLAP, '2026-09-23', 'nope'), 'mad1', 'an unknown leg id falls back to the date lookup')
assert.equal(apptLegFor(OVERLAP, '', 'sev'), 'sev', 'no date yet -> keep the booked leg')

// --- agenda: grouped by day, chronological, timeless entries last ---
const APPTS = [
  { id: 'a1', date: '2026-09-25', time: '15:00', confirmed: true },
  { id: 'a2', date: '2026-09-22', time: '', confirmed: false },
  { id: 'a3', date: '2026-09-22', time: '09:30', confirmed: true },
  { id: 'a4', date: '', time: '10:00', confirmed: false },
]
const ag = agendaDays(APPTS)
assert.deepEqual(ag.map(d => d.date), ['2026-09-22', '2026-09-25'], 'undated appointments never reach the agenda')
assert.deepEqual(ag[0].items.map(i => i.id), ['a3', 'a2'], 'timed before untimed within a day')

assert.deepEqual(apptStats(APPTS), { total: 4, confirmed: 2, pending: 2 })
assert.deepEqual(apptStats([]), { total: 0, confirmed: 0, pending: 0 })

// --- legacy bases + customStops fold into one places list ---
const legacy = normalizeData({
  routes: { l1: ['m:1'] },
  bases: { l1: { lat: 41.15, lon: -8.61, label: 'Hotel Porto' } },
  customStops: [{ id: 'c9', label: 'Fair', lat: 40.8, lon: 14.2, leg: 'l2', note: 'hall 3' }],
}, TRIP.legs)
assert.equal(legacy.places.length, 2)
assert.deepEqual(legacy.routes, { l1: ['m:1'] }, 'routes survive the migration untouched')
const stay = stayOf(legacy.places, 'l1')
assert.equal(stay.label, 'Hotel Porto')
assert.equal(stay.from, '2026-09-21', 'a converted base inherits its leg dates')
assert.equal(legacy.places.find(x => x.id === 'c9').kind, 'other', 'old custom stops keep their id so route keys still resolve')
assert.deepEqual(legacy.appointments, [])

// already migrated: leave it alone, don't re-import the legacy keys
const twice = normalizeData({ places: [{ id: 'p1', kind: 'stay', legId: 'l1', lat: 1, lon: 2 }], bases: { l1: { lat: 9, lon: 9 } } }, TRIP.legs)
assert.equal(twice.places.length, 1, 'migration is not re-applied once places exists')
assert.equal(stayOf(twice.places, 'l1').lat, 1)
assert.equal(stayOf([], 'l1'), null)
assert.equal(stayOf([{ kind: 'stay', legId: 'l1', lat: null }], 'l1'), null, 'an unplaced stay is not a base')

// --- sanity on the distance the whole plan is built from ---
assert.ok(Math.abs(hav({ lat: 41.15, lon: -8.61 }, { lat: 40.85, lon: 14.27 }) - 1917) < 15, 'Porto→Naples ≈ 1917 km')

// --- calendar export ---
const CRLF = String.fromCharCode(13, 10)
const ICS_TRIP = { name: 'Europe 2026', legs: [{ id: 'l1', city: 'Naples', country: 'Italy' }] }
const ics = tripICS(ICS_TRIP, [
  { id: 'a1', key: 'm:1', legId: 'l1', date: '2026-09-28', time: '10:30', confirmed: true, filming: true, note: 'Bring the tech pack; ask about MOQ' },
  { id: 'a2', key: 'm:2', legId: 'l1', date: '2026-09-29', time: '', confirmed: false, filming: false, note: '' },
  { id: 'a3', key: 'm:3', legId: 'l1', date: '2026-09-29', time: '23:30', confirmed: false, filming: false, note: '' },
  { id: 'a4', key: 'm:4', legId: 'l1', date: '', time: '09:00' },
], k => ({ 'm:1': 'Alphadventure, SL', 'm:2': 'Maglificio', 'm:3': 'Late Co' }[k] || k))

assert.ok(ics.startsWith('BEGIN:VCALENDAR' + CRLF), 'opens with the calendar header')
assert.ok(ics.endsWith('END:VCALENDAR' + CRLF), 'closes it')
assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3, 'a meeting with no date is not an event')
assert.ok(ics.includes('DTSTART:20260928T103000' + CRLF + 'DTEND:20260928T113000'), 'a booked hour')
assert.ok(ics.includes('DTSTART;VALUE=DATE:20260929' + CRLF + 'DTEND;VALUE=DATE:20260930'), 'no time yet: all-day')
assert.ok(ics.includes('DTEND:20260930T003000'), '23:30 rolls its end into the next day')
// long values get folded across lines, so content checks run on the unfolded copy
const flat = ics.split(CRLF + ' ').join('')
assert.ok(flat.includes('SUMMARY:Alphadventure\\, SL'), 'commas in a name are escaped')
assert.ok(flat.includes('Bring the tech pack\\; ask about MOQ'), 'semicolons too')
assert.ok(flat.includes('LOCATION:Naples\\, Italy'))
assert.ok(ics.includes('STATUS:CONFIRMED') && ics.includes('STATUS:TENTATIVE'))
assert.ok(flat.includes('Filming approved on site') && flat.includes('Filming not approved'))
assert.ok(!/[^\r]\n/.test(ics), 'every line break is a CRLF')
for (const line of ics.split(CRLF)) assert.ok(line.length <= 75, 'folded under 75: ' + line)

// --- one meeting straight into Google Calendar ---
const gc = new URL(gcalLink(ICS_TRIP, { id: 'a1', key: 'm:1', legId: 'l1', date: '2026-09-28', time: '10:30', confirmed: true, note: 'Bring the tech pack' }, 'Alphadventure, SL', 'Via Roma 11'))
assert.equal(gc.origin + gc.pathname, 'https://calendar.google.com/calendar/render')
assert.equal(gc.searchParams.get('action'), 'TEMPLATE')
assert.equal(gc.searchParams.get('text'), 'Alphadventure, SL', 'the name goes in raw, URLSearchParams encodes it')
assert.equal(gc.searchParams.get('dates'), '20260928T103000/20260928T113000')
assert.equal(gc.searchParams.get('location'), 'Via Roma 11, Naples, Italy', 'street address first, so Google can map it')
assert.match(gc.searchParams.get('details'), /Confirmed/)
const allDay = new URL(gcalLink(ICS_TRIP, { id: 'a2', key: 'm:2', legId: 'l1', date: '2026-09-29', time: '' }, 'Maglificio'))
assert.equal(allDay.searchParams.get('dates'), '20260929/20260930', 'no time yet: a whole-day block')
assert.equal(allDay.searchParams.get('location'), 'Naples, Italy', 'no street address, still the city')
assert.equal(gcalLink(ICS_TRIP, { id: 'a3', date: '' }, 'x'), '', 'nothing to add without a date')

console.log('trips.js: all checks passed')
