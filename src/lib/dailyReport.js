// Builds the activity report: what happened in the hub over a date range, as prose.
// Pure functions, no Vue and no Supabase, so `node src/lib/dailyReport.test.js` runs
// them directly — and api/daily-report.js emails the same text the /activity screen
// shows, so the two copies of the wording can never drift apart.
import { joinPieces } from './quoteTemplate.js'

// The studio runs on Bogotá time. Every date here is a Bogotá date: an email sent at
// 8pm must not be filed under tomorrow.
// ponytail: one hardcoded zone, no per-user setting. It becomes an argument the day
// somebody works out of another timezone.
const TZ = 'America/Bogota'
const at = opts => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts })
const YMD   = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const SHORT = at({ month: 'short', day: 'numeric' })
const TIME  = at({ hour: 'numeric', minute: '2-digit' })
const TITLE = at({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

// "2026-09-22" — compares and sorts as a plain string, which is all the range checks need.
export const ymd = iso => YMD.format(new Date(iso))
export const timeOf = iso => TIME.format(new Date(iso))
export const daysApart = (a, b) =>
  Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)

// "today" and "yesterday" where a person would say them, "Aug 4" everywhere else.
export function relDate(iso, today) {
  const diff = daysApart(ymd(iso), today)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  return SHORT.format(new Date(iso))
}

// Rows whose template_name starts with "[Follow-up]" are reminders written by
// saveFollowup(), not contacts — their sent_at is the *future* due date. Anything
// dated ahead of now is excluded for the same reason.
export function isSend(row, now) {
  if (!row || !row.sent_at) return false
  if (/^\[Follow-up\]/.test(row.template_name || '')) return false
  return Date.parse(row.sent_at) <= Date.parse(now)
}

// A row with a subject went out through the hub; one without is a contact somebody
// typed in by hand (saveLogContact), so it gets different wording.
const isEmail = row => Boolean(row.subject)

// One entry per company, holding its *complete* send history — that is what lets the
// report say "first contacted Aug 4" about an email sent today.
export function timelines(rows, now) {
  const map = new Map()
  for (const r of rows) {
    if (!isSend(r, now)) continue
    const key = `${r.kind}:${r.entity_id}`
    if (!map.has(key)) map.set(key, { key, kind: r.kind, entityId: r.entity_id, name: r.entity_name || '(unnamed)', sends: [] })
    map.get(key).sends.push(r)
  }
  for (const t of map.values()) t.sends.sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at))
  return [...map.values()]
}

// ponytail: "first contact" is the oldest send on record, not the "Initial Reach"
// template — the data decides, not whether somebody picked the right template. Ceiling:
// a company emailed before it reached the hub reads as first-contacted on its import
// date. Upgrade path is a first_contacted_at column set at import time.
const firstOf = t => t.sends[0]

export function statusLine(row) {
  if (row.bounced_at) return 'Bounced — the address on file is not accepting mail.'
  const opened = row.read_at ? `opened at ${timeOf(row.read_at)}` : 'not opened yet'
  return row.delivered_at ? `Delivered, ${opened}.` : `Sent, ${opened}.`
}

// "First contacted Aug 4, followed up Aug 11, Aug 25 and today."
export function historySentence(t, today) {
  const [first, ...rest] = t.sends
  const verb = isEmail(first) ? 'First contacted' : 'First contact logged'
  let s = `${verb} ${relDate(first.sent_at, today)}`
  if (rest.length) s += `, followed up ${joinPieces(rest.map(r => relDate(r.sent_at, today)))}`
  return s + '.'
}

// "4 emails, no reply in 49 days." — "contacts" when some of them were logged by hand.
export function tallySentence(t, today) {
  const n = t.sends.length
  const noun = t.sends.every(isEmail) ? 'email' : 'contact'
  const count = `${n} ${noun}${n === 1 ? '' : 's'}`
  const reply = t.sends.find(r => r.replied_at)
  if (reply) return `${count}. Replied ${relDate(reply.replied_at, today)}.`
  const age = daysApart(ymd(firstOf(t).sent_at), today)
  return age === 0 ? `${count}, no reply yet.` : `${count}, no reply in ${age} days.`
}

const TABLES = {
  manufacturers: 'manufacturer',
  manufacturer_contacts: 'contact',
  manufacturer_documents: 'document',
  sourcing: 'sourcing provider',
  sourcing_contacts: 'sourcing contact',
  quotes: 'quote',
  projects: 'project',
  project_stages: 'timeline stage',
  fabrics: 'fabric',
}
const VERBS = { INSERT: 'added', UPDATE: 'updated', DELETE: 'deleted' }
const label = (table, n) => `${TABLES[table] || table.replace(/_/g, ' ')}${n === 1 ? '' : 's'}`

// Same heuristic LogsView uses to put a human name on an audit row.
const recordName = d => (d && (d.company_name || d.provider || d.project_name || d.template_name ||
  d.document_type || d.article_number || d.stage_name || d.name)) || null

// Grouped by table first, so a table touched three ways reads "5 manufacturers: 2 added,
// 3 updated" instead of scattering the word "manufacturer" across the sentence.
export function hubChanges(audits) {
  const tables = new Map()
  const added = []
  for (const a of audits) {
    if (!tables.has(a.table_name)) tables.set(a.table_name, new Map())
    const acts = tables.get(a.table_name)
    acts.set(a.action, (acts.get(a.action) || 0) + 1)
    if (a.action === 'INSERT') {
      const name = recordName(a.new_data)
      if (name) added.push(name)
    }
  }
  const verb = action => VERBS[action] || action.toLowerCase()
  const parts = [...tables.entries()].map(([table, acts]) => {
    const total = [...acts.values()].reduce((s, n) => s + n, 0)
    const noun = `${total} ${label(table, total)}`
    if (acts.size === 1) return `${noun} ${verb([...acts.keys()][0])}`
    return `${noun}: ` + [...acts.entries()].map(([a, n]) => `${n} ${verb(a)}`).join(', ')
  })
  return { total: audits.length, parts, added }
}

const SNIPPET = 140
const snippet = text => {
  const flat = (text || '').replace(/\s+/g, ' ').trim()
  return flat.length > SNIPPET ? flat.slice(0, SNIPPET) + '…' : flat
}

const heading = (title, n, one, many) => `${title} — ${n} ${n === 1 ? one : many}`

/**
 * from / to are Bogotá dates as "YYYY-MM-DD". `emails` must carry the full history of
 * every company touched in the range, not just the rows that fall inside it.
 */
export function buildReport({ from, to, now = new Date().toISOString(), user = null,
                              emails = [], inbound = [], audits = [] }) {
  const today = ymd(now)
  const inRange = iso => { const d = ymd(iso); return d >= from && d <= to }

  const all = timelines(emails, now)
  const touched = all.filter(t => t.sends.some(r => inRange(r.sent_at)))
  const opened = touched.filter(t => inRange(firstOf(t).sent_at))
  const chased = touched.filter(t => !inRange(firstOf(t).sent_at))
  const replies = inbound.filter(r => inRange(r.received_at))
                         .sort((a, b) => Date.parse(a.received_at) - Date.parse(b.received_at))
  const changes = hubChanges(audits.filter(a => inRange(a.created_at)))

  const byId = new Map(emails.map(r => [r.id, r]))
  const byEntity = new Map(all.map(t => [`${t.kind}:${t.entityId}`, t.name]))

  const head = from === to
    ? `DAILY REPORT — ${TITLE.format(new Date(from + 'T12:00:00Z'))}`
    : `ACTIVITY REPORT — ${SHORT.format(new Date(from + 'T12:00:00Z'))} to ${SHORT.format(new Date(to + 'T12:00:00Z'))}`
  // Every body below ends with a blank line, so one more here spaces the sections evenly.
  const out = [head, user || 'All users', '']

  const section = (title, n, one, many, body) => {
    if (n === 0) return
    out.push('', heading(title, n, one, many), '')
    out.push(...body)
  }

  section('FIRST CONTACT', opened.length, 'company', 'companies', opened.flatMap(t => {
    const s = firstOf(t)
    const lines = [`  ${t.name}`]
    if (isEmail(s)) {
      lines.push(`  First contacted ${relDate(s.sent_at, today)} at ${timeOf(s.sent_at)} — "${s.subject}"`)
      const cc = s.cc_email ? `, cc ${s.cc_email}` : ''
      lines.push(`  Sent to ${s.to_email || '(address not recorded)'}${cc}. ${statusLine(s)}`)
    } else {
      lines.push(`  First contact logged ${relDate(s.sent_at, today)} — ${s.template_name}`)
    }
    return [...lines, '']
  }))

  section('FOLLOW-UPS', chased.length, 'company', 'companies', chased.flatMap(t => {
    const last = [...t.sends].reverse().find(r => inRange(r.sent_at))
    const lines = [`  ${t.name}`, `  ${historySentence(t, today)}`, `  ${tallySentence(t, today)}`]
    if (isEmail(last)) lines.push(`  Last email: "${last.subject}" — ${statusLine(last)}`)
    return [...lines, '']
  }))

  section('REPLIES RECEIVED', replies.length, 'reply', 'replies', replies.flatMap(r => {
    const who = r.from_name ? `${r.from_name} (${r.from_email})` : r.from_email
    const company = byEntity.get(`${r.matched_kind}:${r.matched_entity_id}`)
    const sent = byId.get(r.matched_log_id)
    const to = sent ? ` to the email sent ${relDate(sent.sent_at, today)}` : ''
    const lines = [`  ${who}${company ? ` — ${company}` : ''}`,
                   `  Replied at ${timeOf(r.received_at)}${to}.`]
    if (r.body_text) lines.push(`  "${snippet(r.body_text)}"`)
    return [...lines, '']
  }))

  // Companies in this report that have never answered. The detail is above; this is the
  // line to act on.
  const silent = touched
    .filter(t => !t.sends.some(r => r.replied_at))
    .map(t => ({ name: t.name, age: daysApart(ymd(firstOf(t).sent_at), to) }))
    .filter(x => x.age > 7)
    .sort((a, b) => b.age - a.age)
  section('NO REPLY YET', silent.length, 'company', 'companies',
    ['  ' + silent.map(x => `${x.name} (${x.age}d)`).join(' · '), ''])

  section('HUB CHANGES', changes.total, 'record', 'records', [
    '  ' + joinPieces(changes.parts) + '.',
    ...(changes.added.length ? ['  Added: ' + joinPieces(changes.added.slice(0, 6)) +
      (changes.added.length > 6 ? ` and ${changes.added.length - 6} more` : '') + '.'] : []),
    '',
  ])

  if (out.length === 3) out.push('', 'Nothing recorded for this day.')
  return out.join('\n').trimEnd() + '\n'
}
