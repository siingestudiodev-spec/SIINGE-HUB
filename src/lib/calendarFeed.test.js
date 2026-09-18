// Run with: node src/lib/calendarFeed.test.js
// Guards the calendar feed's gate: the token check and what reaches Supabase.
import assert from 'node:assert/strict'

process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
process.env.ICS_TOKEN = 'the-secret-token'

// the module reads env at load time, so import it only once the env is in place
const { default: handler } = await import('../../api/calendar.js')

const TRIP = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Europe 2026',
  legs: [{ id: 'l1', city: 'Madrid', country: 'Spain' }],
  data: {
    places: [{ id: 'p1', label: 'The Newton Hostel' }],
    appointments: [
      { id: 'a1', key: 'm:22222222-2222-2222-2222-222222222222', legId: 'l1', date: '2026-09-29', time: '10:00', confirmed: true },
      { id: 'a2', key: 'c:p1', legId: 'l1', date: '2026-09-30', time: '', confirmed: false },
      { id: 'a3', key: 'm:nope', legId: 'l1', date: '', time: '09:00' },
    ],
  },
}

let asked = []
globalThis.fetch = async (url) => {
  asked.push(url)
  const body = url.includes('/trips?') ? [TRIP]
    : url.includes('/manufacturers?') ? [{ id: '22222222-2222-2222-2222-222222222222', company_name: 'Alphadventure' }]
    : []
  return { ok: true, status: 200, json: async () => body, text: async () => '' }
}

function fakeRes() {
  const r = { code: 0, headers: {}, body: '' }
  r.status = c => { r.code = c; return r }
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v }
  r.send = b => { r.body = b; return r }
  return r
}
const call = async query => { asked = []; const res = fakeRes(); await handler({ query }, res); return res }

// --- the gate ---
assert.equal((await call({ trip: TRIP.id, t: 'wrong' })).code, 401, 'a wrong token gets nothing')
assert.equal((await call({ trip: TRIP.id })).code, 401, 'neither does a missing one')
assert.equal((await call({ trip: TRIP.id, t: 'the-secret-token-longer' })).code, 401, 'nor a prefix of the real one')
assert.equal(asked.length, 0, 'a rejected request never touches Supabase')
assert.equal((await call({ trip: 'x'.repeat(200), t: 'the-secret-token' })).code, 400, 'junk trip ids are refused')
assert.equal((await call({ trip: "1' or true--", t: 'the-secret-token' })).code, 400, 'and so is anything filter-shaped')

// --- the feed ---
const ok = await call({ trip: TRIP.id, t: 'the-secret-token' })
assert.equal(ok.code, 200)
assert.match(ok.headers['content-type'], /text\/calendar/, 'served as a calendar, not a download')
assert.ok(ok.body.startsWith('BEGIN:VCALENDAR'))
assert.equal((ok.body.match(/BEGIN:VEVENT/g) || []).length, 2, 'the undated meeting is dropped before the query')
assert.ok(ok.body.includes('SUMMARY:Alphadventure'), 'manufacturer ids resolve to names')
assert.ok(ok.body.includes('SUMMARY:The Newton Hostel'), 'so do our own places, with no extra query')
assert.ok(!asked.some(u => u.includes('/sourcing?')), 'no sourcing meetings booked, no sourcing query')
assert.ok(asked.some(u => u.includes('id=in.(22222222-2222-2222-2222-222222222222)')), 'only the ids actually booked are asked for')

// --- a trip that is not there ---
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => [], text: async () => '' })
assert.equal((await call({ trip: TRIP.id, t: 'the-secret-token' })).code, 404)

// --- Supabase down: say so, do not serve half a calendar ---
globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => 'boom' })
assert.equal((await call({ trip: TRIP.id, t: 'the-secret-token' })).code, 502)

console.log('calendar feed: all checks passed')
