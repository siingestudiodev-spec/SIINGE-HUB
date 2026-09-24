// "What haven't I answered?" — an inbound message with no outbound to that company
// after it. Deterministic on purpose: this decides what the tool nags you about, so it
// is a query, not a judgement call, and it cannot invent a thread that does not exist.
// The model only sees the result, to summarize what is being asked and draft a reply.
// Pure functions, no Vue and no Supabase: `node src/lib/needsReply.test.js` runs them.

export const normAddr = a => (a || '').trim().toLowerCase()

// Addresses on an outbound row: to plus cc, since answering a thread often means
// replying to the whole group.
const recipients = row => [row.to_email, row.cc_email]
  .flatMap(v => (v || '').split(/[,;]/))
  .map(normAddr)
  .filter(Boolean)

// Robots write too. Nagging about an out-of-office is how a tool teaches you to ignore
// it, so these never count as something to answer.
// Chinese suppliers answer with 自动答复 ("automatic reply"), which the English-only
// pattern waved straight through as a real reply.
// Only a subject that *opens* with the marker counts: "回复: 自动答复: ..." is a person
// writing on top of an auto-reply thread. Getting that wrong drops a real answer out of
// the list silently, while a stray auto-reply left in costs one glance.
const NOISE_SENDER = /^(no-?reply|do-?not-?reply|noreply|mailer-daemon|postmaster|bounce)[.+@-]/i
const NOISE_SUBJECT = /^\s*(automatic reply|auto[- ]?(reply|response)|out of office|自动答复|自动回复|undelivered mail|delivery status notification|mail delivery)/i

export function isNoise(row) {
  return NOISE_SENDER.test(normAddr(row.from_email)) || NOISE_SUBJECT.test(row.subject || '')
}

// One pending item per company, not per address: if Xena writes and you answer Allan at
// the same factory, the thread is handled.
// ponytail: falls back to the bare address when the sync could not match the sender to a
// hub record, so an unknown sender still surfaces instead of vanishing.
const groupKey = row => row.matched_entity_id
  ? `${row.matched_kind}:${row.matched_entity_id}`
  : `addr:${normAddr(row.from_email)}`

const HOUR = 3600000

export function waitedLabel(ms) {
  const hours = Math.floor(ms / HOUR)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h`
  const days = Math.round(hours / 24)
  return `${days}d`
}

/**
 * `outbound` are email_activity rows, `inbound` are inbound_emails rows. Both should
 * cover at least as far back as the oldest thread you care about — an outbound older
 * than its inbound never counts as an answer.
 */
export function pendingReplies({ inbound = [], outbound = [], now = new Date().toISOString() }) {
  const nowMs = Date.parse(now)

  // Latest real message per company.
  const latest = new Map()
  for (const row of inbound) {
    if (isNoise(row)) continue
    const key = groupKey(row)
    const seen = latest.get(key)
    if (!seen || Date.parse(row.received_at) > Date.parse(seen.received_at)) latest.set(key, row)
  }

  // When we last wrote to that company, by entity and by bare address.
  const lastOutByEntity = new Map()
  const lastOutByAddr = new Map()
  const keepLatest = (map, key, ms) => {
    if (!key) return
    if (!map.has(key) || ms > map.get(key)) map.set(key, ms)
  }
  for (const row of outbound) {
    if (!row.sent_at) continue
    const ms = Date.parse(row.sent_at)
    if (ms > nowMs) continue // scheduled reminders are not sends
    keepLatest(lastOutByEntity, row.entity_id ? `${row.kind}:${row.entity_id}` : null, ms)
    for (const addr of recipients(row)) keepLatest(lastOutByAddr, addr, ms)
  }

  const pending = []
  for (const [key, row] of latest) {
    const at = Date.parse(row.received_at)
    const answeredByEntity = (lastOutByEntity.get(key) ?? -Infinity) > at
    const answeredByAddr = (lastOutByAddr.get(normAddr(row.from_email)) ?? -Infinity) > at
    if (answeredByEntity || answeredByAddr) continue
    pending.push({
      key,
      company: row.entity_name || null,
      from: row.from_email,
      name: row.from_name || null,
      subject: row.subject || '(no subject)',
      receivedAt: row.received_at,
      waitedMs: nowMs - at,
      waited: waitedLabel(nowMs - at),
      body: row.body_text || '',
      inboundId: row.id,
    })
  }

  return pending.sort((a, b) => b.waitedMs - a.waitedMs)
}
