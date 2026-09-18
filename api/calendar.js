// Subscribable calendar feed. Point Google Calendar, Apple Calendar or Motion at
//   https://siinge-hub.vercel.app/api/calendar?trip=<trip id>&t=<ICS_TOKEN>
// and they re-read it on their own schedule, so the agenda stays current without
// exporting and importing anything.
//
// Needs three env vars on Vercel (none of them VITE_, so none reach the browser bundle):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ICS_TOKEN
//
// ponytail: one shared token for every trip, no rotation UI. Rotating means changing the env
// var, which kills every existing subscription at once — fine while it is just the studio.
// Per-trip tokens would be an HMAC of the trip id with the same secret.
import { timingSafeEqual } from 'node:crypto'
import { tripICS } from '../src/lib/ics.js'

const API = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// ids come out of a jsonb blob the app writes, so they are checked before reaching a filter
const ID = /^[A-Za-z0-9_-]{1,64}$/

async function rest(path) {
  const r = await fetch(`${API}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`supabase ${r.status}: ${await r.text()}`)
  return r.json()
}

function sameToken(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

export default async function handler(req, res) {
  const token = process.env.ICS_TOKEN
  if (!API || !KEY || !token) return res.status(500).send('calendar feed is not configured')

  const tripId = String(req.query.trip || '')
  if (!sameToken(req.query.t || '', token)) return res.status(401).send('bad or missing token')
  if (!ID.test(tripId.replace(/-/g, ''))) return res.status(400).send('bad trip id')

  let trip
  try {
    trip = (await rest(`trips?id=eq.${encodeURIComponent(tripId)}&select=*`))[0]
  } catch (e) {
    console.error('calendar feed:', e)
    return res.status(502).send('could not read the trip')
  }
  if (!trip) return res.status(404).send('trip not found')

  const data = trip.data || {}
  const appts = (Array.isArray(data.appointments) ? data.appointments : []).filter(a => a && a.date)

  // meeting keys are "m:<manufacturer>", "s:<sourcing>" or "c:<place>"; resolve them to names
  const idsFor = p => [...new Set(appts
    .filter(a => String(a.key || '').startsWith(p))
    .map(a => String(a.key).slice(2))
    .filter(id => ID.test(id.replace(/-/g, ''))))]
  const names = {}
  try {
    const mIds = idsFor('m:'), sIds = idsFor('s:')
    if (mIds.length) {
      for (const m of await rest(`manufacturers?id=in.(${mIds.join(',')})&select=id,company_name`)) {
        names['m:' + m.id] = m.company_name
      }
    }
    if (sIds.length) {
      for (const s of await rest(`sourcing?id=in.(${sIds.join(',')})&select=id,provider`)) {
        names['s:' + s.id] = s.provider
      }
    }
  } catch (e) {
    console.error('calendar feed names:', e) // a nameless event still beats a 502
  }
  for (const p of Array.isArray(data.places) ? data.places : []) names['c:' + p.id] = p.label

  const ics = tripICS(trip, appts, k => names[k] || '(deleted)')
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
  res.setHeader('Content-Disposition', 'inline; filename="trip.ics"')
  res.setHeader('Cache-Control', 'public, max-age=900')
  return res.status(200).send(ics)
}
