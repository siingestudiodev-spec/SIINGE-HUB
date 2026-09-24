// Pulls the Titan mailbox into mailbox_messages, both directions.
//
// Reads every folder except the throwaway ones, because mail gets filed under
// Portugal/ECOVEST and friends — syncing only INBOX would miss exactly the threads that
// matter. Sent is what makes mail written outside the hub visible at all.
//
// Only messages to or from an address already in the hub are stored. The mailbox holds
// 1200+ messages in INBOX alone, most of them newsletters and automation notices; none
// of that belongs in a table the whole studio can read, and personal mail belongs there
// even less.
//
// Needs on Vercel: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TITAN_IMAP_USER, TITAN_IMAP_PASS
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

const API = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const SKIP_FOLDERS = /^(spam|junk|trash|deleted|drafts|scheduled|templates)$/i

// ponytail: one run walks at most this many messages per folder so the function cannot
// run past Vercel's limit on the first sync of a years-old mailbox. The cursor advances
// either way, so calling it again continues where it stopped; the response says whether
// more is waiting.
const MAX_PER_FOLDER = 300

// First sync only reaches back this far. Older threads are already dead for follow-up
// purposes, and the hub's own logs cover the history that matters.
const FIRST_RUN_DAYS = 180

async function rest(path, init) {
  const r = await fetch(`${API}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!r.ok) throw new Error(`supabase ${r.status}: ${await r.text()}`)
  // Inserts and updates come back 201/204 with an empty body unless representation is
  // asked for, and an empty body is not JSON.
  const text = await r.text()
  return text ? JSON.parse(text) : null
}

// Who is allowed into the table, and which hub record each address belongs to.
async function contactMap() {
  const [manus, manuContacts, sourcing, sourcingContacts] = await Promise.all([
    rest('manufacturers?select=id,company_name,email&email=not.is.null'),
    rest('manufacturer_contacts?select=manufacturer_id,email&email=not.is.null'),
    rest('sourcing?select=id,provider,email&email=not.is.null'),
    rest('sourcing_contacts?select=sourcing_id,email&email=not.is.null'),
  ])
  const map = new Map()
  const add = (email, kind, id, name) => {
    const key = String(email || '').trim().toLowerCase()
    if (key && !map.has(key)) map.set(key, { kind, id, name: name || null })
  }
  const nameOf = new Map()
  for (const m of manus) nameOf.set(`manufacturer:${m.id}`, m.company_name)
  for (const s of sourcing) nameOf.set(`sourcing:${s.id}`, s.provider)

  for (const m of manus) add(m.email, 'manufacturer', m.id, m.company_name)
  for (const s of sourcing) add(s.email, 'sourcing', s.id, s.provider)
  for (const c of manuContacts) {
    add(c.email, 'manufacturer', c.manufacturer_id, nameOf.get(`manufacturer:${c.manufacturer_id}`))
  }
  for (const c of sourcingContacts) {
    add(c.email, 'sourcing', c.sourcing_id, nameOf.get(`sourcing:${c.sourcing_id}`))
  }
  return map
}

const cursorKey = (mailbox, folder) => `imap_cursor:${mailbox}:${folder}`

async function readCursor(key) {
  const rows = await rest(`app_settings?key=eq.${encodeURIComponent(key)}&select=value`)
  try {
    return JSON.parse(rows?.[0]?.value ?? 'null') || { uidValidity: null, lastUid: 0 }
  } catch {
    return { uidValidity: null, lastUid: 0 }
  }
}

async function writeCursor(key, value) {
  await rest('app_settings?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([{ key, value: JSON.stringify(value), updated_at: new Date().toISOString() }]),
  })
}

const addrOf = a => String(a?.address || '').trim().toLowerCase()
const listAddrs = list => (list || []).map(addrOf).filter(Boolean)

// A reply closes the oldest open thread to that company: stamp the most recent hub send
// that went out before it and has not been marked answered.
async function stampReply(match, receivedAt) {
  const table = match.kind === 'manufacturer' ? 'manufacturer_email_logs' : 'sourcing_email_logs'
  const fk = match.kind === 'manufacturer' ? 'manufacturer_id' : 'sourcing_id'
  const open = await rest(
    `${table}?${fk}=eq.${match.id}&replied_at=is.null&sent_at=lt.${encodeURIComponent(receivedAt)}` +
    `&select=id&order=sent_at.desc&limit=1`,
  )
  if (!open?.length) return
  await rest(`${table}?id=eq.${open[0].id}`, {
    method: 'PATCH',
    body: JSON.stringify({ replied_at: receivedAt }),
  })
}

async function syncFolder(client, folder, mailbox, contacts, ownAddress, dryRun) {
  const lock = await client.getMailboxLock(folder.path)
  let stored = 0
  let scanned = 0
  let more = false
  const samples = []
  try {
    const box = client.mailbox
    const key = cursorKey(mailbox, folder.path)
    // A dry run must not resume from a cursor, or it reports nothing on a synced folder.
    const cursor = dryRun ? { uidValidity: null, lastUid: 0 } : await readCursor(key)

    // A changed uidValidity means the server renumbered everything; the old high-water
    // mark is meaningless and the folder has to be walked again.
    // uidValidity arrives as a BigInt, which JSON cannot carry — compare as text.
    const validity = String(box.uidValidity)
    let lastUid = cursor.uidValidity === validity ? cursor.lastUid : 0

    const search = lastUid === 0
      ? { since: new Date(Date.now() - FIRST_RUN_DAYS * 86400000) }
      : { uid: `${lastUid + 1}:*` }

    const uids = await client.search(search, { uid: true })
    const pending = (uids || []).filter(u => u > lastUid).sort((a, b) => a - b)
    more = pending.length > MAX_PER_FOLDER
    const batch = pending.slice(0, MAX_PER_FOLDER)
    if (batch.length === 0) return { folder: folder.path, scanned: 0, stored: 0, more, samples }

    const isSentFolder = folder.specialUse === '\\Sent' || /^sent$/i.test(folder.path)

    for await (const msg of client.fetch(batch, { uid: true, envelope: true, source: true }, { uid: true })) {
      scanned++
      lastUid = Math.max(lastUid, msg.uid)

      const env = msg.envelope || {}
      const from = addrOf(env.from?.[0])
      const to = listAddrs(env.to)
      const cc = listAddrs(env.cc)

      // Direction is the folder's job, not a guess from the addresses: a message in Sent
      // is outbound even when you copied yourself.
      const direction = isSentFolder || from === ownAddress ? 'out' : 'in'
      const counterparts = direction === 'out' ? [...to, ...cc] : [from]
      const match = counterparts.map(a => contacts.get(a)).find(Boolean)
      if (!match) continue

      const at = (env.date ? new Date(env.date) : new Date()).toISOString()

      if (dryRun) {
        stored++
        if (samples.length < 6) {
          samples.push({ direction, company: match.name, from, subject: env.subject || '(no subject)', at })
        }
        continue
      }

      const parsed = await simpleParser(msg.source)
      const row = {
        mailbox,
        folder: folder.path,
        direction,
        uid_validity: String(box.uidValidity),
        uid: msg.uid,
        at,
        from_email: from || ownAddress,
        from_name: env.from?.[0]?.name || null,
        to_email: to.join(', ') || null,
        cc_email: cc.join(', ') || null,
        subject: env.subject || null,
        // ponytail: plain text only, capped. The report shows a snippet and the model
        // reads a thread; neither needs the HTML or a 4MB quoted chain.
        body_text: (parsed.text || '').slice(0, 20000) || null,
        message_id: env.messageId || null,
        in_reply_to: env.inReplyTo || null,
        matched_kind: match.kind,
        matched_entity_id: match.id,
      }

      await rest('mailbox_messages?on_conflict=mailbox,folder,uid_validity,uid', {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates' },
        body: JSON.stringify([row]),
      })
      stored++

      if (direction === 'in') await stampReply(match, at)
    }

    if (!dryRun) await writeCursor(key, { uidValidity: validity, lastUid })
  } finally {
    lock.release()
  }
  return { folder: folder.path, scanned, stored, more, samples }
}

/**
 * Exported so it can be exercised without an HTTP request. `dryRun` reads the mailbox
 * and reports what would be stored without writing a single row.
 */
export async function runSync({ dryRun = false } = {}) {
  const user = process.env.TITAN_IMAP_USER
  const pass = process.env.TITAN_IMAP_PASS
  const client = new ImapFlow({
    host: 'imap.titan.email',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  })

  try {
    await client.connect()
    const contacts = await contactMap()
    const ownAddress = user.trim().toLowerCase()

    const folders = (await client.list()).filter(
      f => !f.flags?.has?.('\\Noselect') && !SKIP_FOLDERS.test(f.path),
    )

    const results = []
    for (const folder of folders) {
      try {
        results.push(await syncFolder(client, folder, ownAddress, contacts, ownAddress, dryRun))
      } catch (e) {
        // One unreadable folder must not cost the whole sync.
        console.error('inbox-sync folder', folder.path, e)
        results.push({ folder: folder.path, error: String(e?.message ?? e) })
      }
    }

    return {
      ok: true,
      dryRun,
      contacts: contacts.size,
      folders: results,
      more: results.some(r => r.more),
    }
  } finally {
    await client.logout().catch(() => {})
  }
}

export default async function handler(req, res) {
  // Names only, never values: "not configured" on its own turns every misconfiguration
  // into a guessing game against a five-minute deploy cycle.
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TITAN_IMAP_USER', 'TITAN_IMAP_PASS']
    .filter(k => !process.env[k])
  if (missing.length) {
    return res.status(500).json({ error: 'inbox sync is not configured', missing })
  }

  // The mailbox is not public. Only a signed-in hub user can trigger a sync.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'missing session token' })
  const who = await fetch(`${API}/auth/v1/user`, {
    headers: { apikey: KEY, Authorization: `Bearer ${token}` },
  })
  if (!who.ok) return res.status(401).json({ error: 'invalid session' })

  try {
    return res.status(200).json(await runSync())
  } catch (e) {
    console.error('inbox-sync:', e)
    return res.status(502).json({ error: String(e?.message ?? e) })
  }
}
