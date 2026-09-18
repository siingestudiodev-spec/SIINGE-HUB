// Self-contained on purpose: the Vercel calendar feed imports this from a Node function,
// so nothing here may reach for the Supabase client or import.meta.env.
const MS = 86400000
const toUTC = s => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, m - 1, d) }
const fromUTC = t => new Date(t).toISOString().slice(0, 10)

/* ---------------- calendar export ----------------
   Floating local times on purpose: 10:00 in Naples stays 10:00 for whoever opens it, so the
   file carries no VTIMEZONE block. Google, Apple and Outlook all import this as-is.
   ponytail: a snapshot you import, not a feed that keeps syncing. A subscribable one needs a
   public endpoint serving this same string, plus a token to keep the agenda private. */
export function tripICS(trip, appts, labelOf = k => k) {
  const CRLF = String.fromCharCode(13, 10) // the spec insists on CRLF, even on one-line values
  const esc = s => String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/([;,])/g, '\\$1')
    .replace(/\r?\n/g, '\\n')
  // RFC 5545 folds at 75 octets. ponytail: this counts characters, so a line of accented text
  // can run a few bytes over. Every calendar we care about accepts it.
  const fold = l => (l.match(/.{1,73}/g) || [l]).map((p, i) => (i ? ' ' : '') + p).join(CRLF)
  const compact = d => d.replace(/-/g, '')
  const stamp = (d, t) => compact(d) + 'T' + t.replace(':', '') + '00'
  // an hour long by default, and a late meeting rolls the end into the next day
  const plusHour = (d, t) => {
    const [h, m] = t.split(':').map(Number)
    const tot = h * 60 + m + 60
    const pad = n => String(n).padStart(2, '0')
    return [tot >= 1440 ? fromUTC(toUTC(d) + MS) : d, pad(Math.floor((tot % 1440) / 60)) + ':' + pad(tot % 60)]
  }

  const now = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SIINGE STUDIO//Trip Map//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + esc(trip.name || 'Trip'),
  ]
  for (const a of appts || []) {
    if (!a.date) continue
    const leg = (trip.legs || []).find(l => l.id === a.legId) || {}
    const where = [leg.city, leg.country].filter(Boolean).join(', ')
    const body = [
      a.confirmed ? 'Confirmed' : 'Pending confirmation',
      a.filming ? 'Filming approved on site' : 'Filming not approved',
      a.note || '',
    ].filter(Boolean).join('\n')
    lines.push(
      'BEGIN:VEVENT',
      'UID:' + a.id + '@siinge-hub',
      'DTSTAMP:' + now,
      // no time booked yet: an all-day block, so it still shows up on the right day
      ...(a.time
        ? ['DTSTART:' + stamp(a.date, a.time), 'DTEND:' + stamp(...plusHour(a.date, a.time))]
        : ['DTSTART;VALUE=DATE:' + compact(a.date), 'DTEND;VALUE=DATE:' + compact(fromUTC(toUTC(a.date) + MS))]),
      'SUMMARY:' + esc(labelOf(a.key)),
      ...(where ? ['LOCATION:' + esc(where)] : []),
      'DESCRIPTION:' + esc(body),
      'STATUS:' + (a.confirmed ? 'CONFIRMED' : 'TENTATIVE'),
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join(CRLF) + CRLF
}
