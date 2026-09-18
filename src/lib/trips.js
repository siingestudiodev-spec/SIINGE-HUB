/* ---------------- geo ---------------- */
export function hav(a, b) {
  const R = 6371
  const dLa = (b.lat - a.lat) * Math.PI / 180
  const dLo = (b.lon - a.lon) * Math.PI / 180
  const s = Math.sin(dLa / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

// ponytail: Nominatim free endpoint — 1 req/s, no bulk. Only fired from a search box.
export async function geocode(q) {
  if (!q || q.trim().length < 2) return []
  const url = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=' + encodeURIComponent(q)
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } })
    const j = await r.json()
    return (j || []).map(x => {
      const a = x.address || {}
      return {
        label: x.display_name,
        city: a.city || a.town || a.village || a.municipality || x.name || q,
        country: a.country || '',
        lat: +(+x.lat).toFixed(5),
        lon: +(+x.lon).toFixed(5),
      }
    })
  } catch (e) { return [] }
}

/* ---------------- dates ---------------- */
const MS = 86400000
export function toUTC(s) { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d) }
export function fromUTC(t) { return new Date(t).toISOString().slice(0, 10) }

export function eachDay(from, to) {
  if (!from || !to) return []
  const a = toUTC(from), b = toUTC(to)
  if (isNaN(a) || isNaN(b) || b < a) return []
  const out = []
  for (let t = a; t <= b; t += MS) out.push(fromUTC(t))
  return out
}

export function inBlackout(day, blackouts) {
  const t = toUTC(day)
  return (blackouts || []).some(b => b.from && b.to && t >= toUTC(b.from) && t <= toUTC(b.to))
}

/** Days actually free for meetings on a leg: drops travel days and blackout days. */
export function legFreeDays(leg, blackouts) {
  const all = eachDay(leg.from, leg.to)
  let free = all.slice()
  if (leg.travelIn && free.length) free = free.slice(1)
  if (leg.travelOut && free.length) free = free.slice(0, -1)
  free = free.filter(d => !inBlackout(d, blackouts))
  return { all, free, count: free.length }
}

const FMT = { day: 'numeric', month: 'short', timeZone: 'UTC' }
export function fmtDay(d) {
  if (!d) return ''
  return new Date(toUTC(d)).toLocaleDateString('en-US', FMT)
}
export function fmtRange(from, to) {
  if (!from) return ''
  if (!to || from === to) return fmtDay(from)
  return fmtDay(from) + '–' + fmtDay(to)
}
/** "Sep 29–Oct 5 · Oct 8" from a list of YYYY-MM-DD */
export function fmtDayList(days) {
  if (!days || !days.length) return 'no window'
  const runs = []
  let start = days[0], prev = days[0]
  for (let i = 1; i < days.length; i++) {
    if (toUTC(days[i]) - toUTC(prev) > MS) { runs.push([start, prev]); start = days[i] }
    prev = days[i]
  }
  runs.push([start, prev])
  return runs.map(([a, b]) => fmtRange(a, b)).join(' · ')
}

/* ---------------- trip records ---------------- */
export function blankLeg(patch = {}) {
  return {
    id: 'l' + Math.random().toString(36).slice(2, 9),
    city: '', country: '', lat: null, lon: null,
    from: '', to: '', travelIn: true, travelOut: true, radiusKm: 150,
    ...patch,
  }
}

export function tripCountries(trip) {
  return [...new Set((trip.legs || []).map(l => (l.country || '').trim()).filter(Boolean))]
}

/** Is this stop inside the trip's region? radius of any leg, or (optionally) same country. */
export function inTripRegion(stop, trip, byCountry) {
  if (stop.lat == null || stop.lon == null) return false
  for (const l of trip.legs || []) {
    if (l.lat == null) continue
    if (hav(l, stop) <= (l.radiusKm || 150)) return true
  }
  if (byCountry) {
    const c = (stop.country || '').trim().toLowerCase()
    if (c && tripCountries(trip).some(tc => tc.toLowerCase() === c)) return true
  }
  return false
}

/* ---------------- persistence ----------------
   ponytail: the client is imported on first use, not at module load, so every planning
   helper above stays runnable under plain node (see trips.test.js). */
let _sb = null
const sb = async () => (_sb ||= (await import('./supabase.js')).supabase)

export const Trips = {
  async list() {
    const { data, error } = await (await sb()).from('trips').select('*').order('date_start', { ascending: false })
    if (error) throw error
    return data || []
  },
  async get(id) {
    const { data, error } = await (await sb()).from('trips').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data
  },
  async create(t) {
    const { data, error } = await (await sb()).from('trips').insert([t]).select().single()
    if (error) throw error
    return data
  },
  async save(id, patch) {
    const { error } = await (await sb()).from('trips')
      .update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
  },
  async remove(id) {
    const { error } = await (await sb()).from('trips').delete().eq('id', id)
    if (error) throw error
  },
}

/* ---------------- places ----------------
   One list for everywhere you'll physically be: where you sleep, the fair you
   attend, a contact's office. `kind: 'stay'` doubles as the leg's base for every
   driving distance. Stored in trips.data.places, keyed into routes as "c:<id>". */
export const PLACE_KINDS = { stay: 'Staying here', venue: 'Fair / showroom / office', other: 'Other place' }

export function blankPlace(patch = {}) {
  return {
    id: 'p' + Math.random().toString(36).slice(2, 9),
    label: '', kind: 'stay', address: '', lat: null, lon: null,
    legId: '', from: '', to: '', note: '',
    ...patch,
  }
}

/** The place you sleep on a leg. ponytail: first stay wins — split it per-day if a leg ever uses two hotels. */
export function stayOf(places, legId) {
  return (places || []).find(p => p.kind === 'stay' && p.legId === legId && p.lat != null) || null
}

/* ---------------- appointments ---------------- */
export function blankAppt(patch = {}) {
  return {
    id: 'a' + Math.random().toString(36).slice(2, 9),
    // filming: per visit, not per manufacturer — consent is given for the day they let us in.
    key: '', legId: '', date: '', time: '', confirmed: false, filming: false, note: '',
    ...patch,
  }
}

export function apptStats(appts) {
  const total = (appts || []).length
  const confirmed = (appts || []).filter(a => a.confirmed).length
  return { total, confirmed, pending: total - confirmed }
}

/** Which leg covers a calendar day. YYYY-MM-DD sorts lexically, so plain string compare. */
export function legForDate(trip, date) {
  if (!date) return null
  return (trip.legs || []).find(l => l.from && l.to && date >= l.from && date <= l.to) || null
}

/** '' when the day is a real meeting day, otherwise why it isn't. */
export function apptDateWarning(trip, date) {
  if (!date) return 'no date yet'
  const leg = legForDate(trip, date)
  if (!leg) return 'falls outside every city window'
  if (!legFreeDays(leg, trip.blackouts || []).free.includes(date)) return 'travel or blackout day in ' + leg.city
  return ''
}

/** Which leg a booking belongs to. A meeting added under a city stays in that city even when
 *  legs overlap (Madrid 9/22-24 and Seville 9/23-26 both claim 9/23); only a date outside the
 *  preferred leg's own window reassigns it. */
export function apptLegFor(trip, date, preferredLegId) {
  const pref = (trip.legs || []).find(l => l.id === preferredLegId)
  if (pref && date && pref.from && pref.to && date >= pref.from && date <= pref.to) return pref.id
  const l = legForDate(trip, date)
  return l ? l.id : (preferredLegId || '')
}

/** Chronological agenda: one entry per day that has appointments, each sorted by time. */
export function agendaDays(appts) {
  const by = new Map()
  for (const a of appts || []) {
    if (!a.date) continue
    if (!by.has(a.date)) by.set(a.date, [])
    by.get(a.date).push(a)
  }
  return [...by.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, items]) => ({
      date,
      items: items.sort((x, y) => (x.time || '99:99').localeCompare(y.time || '99:99')),
    }))
}

// The .ics builder lives on its own so the Vercel calendar feed can import it without
// dragging the Supabase client (and import.meta.env) into a Node function.
export { tripICS } from './ics.js'

export function fmtWeekday(d) {
  if (!d) return ''
  return new Date(toUTC(d)).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
}

/* ---------------- data shape ----------------
   Normalises trips.data on read and folds the old `bases`/`customStops` pair into `places`. */
export function normalizeData(d, legs) {
  d = d || {}
  const out = {
    routes: d.routes && typeof d.routes === 'object' ? d.routes : {},
    places: Array.isArray(d.places) ? d.places.map(p => blankPlace(p)) : [],
    appointments: Array.isArray(d.appointments) ? d.appointments.map(a => blankAppt(a)) : [],
  }
  if (Array.isArray(d.places)) return out
  for (const [legId, b] of Object.entries(d.bases || {})) {
    const leg = (legs || []).find(l => l.id === legId) || {}
    out.places.push(blankPlace({
      label: b.label || leg.city || 'Base', kind: 'stay',
      lat: b.lat, lon: b.lon, legId, from: leg.from || '', to: leg.to || '',
    }))
  }
  for (const c of d.customStops || []) {
    out.places.push(blankPlace({
      id: c.id, label: c.label || 'Stop', kind: 'other',
      lat: c.lat, lon: c.lon, legId: c.leg || '', note: c.note || '',
    }))
  }
  return out
}
