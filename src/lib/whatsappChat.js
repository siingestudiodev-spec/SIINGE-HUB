// Reads the .txt WhatsApp hands you from "Export chat".
//
// Exporting is a feature WhatsApp actually offers, so nothing here pretends to be a
// linked device and no number is at risk. The cost is that it is one chat at a time and
// only as fresh as the last export, which is the right trade.
//
// The format is not one format. iOS writes "[12/09/2026, 10:45:12] Name: text", Android
// writes "12/09/2026, 10:45 - Name: text", locales disagree on AM/PM, on whether the day
// or the month comes first, and WhatsApp sprinkles invisible direction marks through all
// of it. Pure functions: `node src/lib/whatsappChat.test.js` runs them.

// U+200E and friends: WhatsApp pads exported lines with them and they break every regex.
const INVISIBLE = /[‎‏‪-‮  ]/g

const LINE = new RegExp(
  '^\\[?' +
  '(\\d{1,2})[./-](\\d{1,2})[./-](\\d{2,4})' +   // date, order still unknown
  ',?\\s+' +
  '(\\d{1,2}):(\\d{2})(?::(\\d{2}))?' +           // time
  '(?:\\s*([ap])\\.?\\s?m\\.?)?' +                // am/pm, absent on a 24h phone
  '\\]?' +
  '\\s*(?:-\\s*)?' +                              // Android's dash
  '(.*)$',
  'i',
)

// "Messages and calls are end-to-end encrypted", "You deleted this message", joins and
// leaves. They carry no "Sender:" and are not something anyone has to answer.
const looksLikeSystem = rest => !/^[^:]{1,80}:\s/.test(rest)

/**
 * Splits the export into dated lines. Date order is decided across the whole file: a
 * day past 12 settles it, and when nothing does we keep day-first, which is what a
 * phone in Colombia writes.
 * ponytail: an all-ambiguous export from a US phone (3/4/26) reads as 3 April. The fix
 * is asking the user, and it is not worth a dialog until it bites.
 */
export function parseChat(text) {
  const lines = String(text || '').replace(INVISIBLE, '').split(/\r?\n/)

  const raw = []
  for (const line of lines) {
    const m = line.match(LINE)
    if (m) raw.push({ a: +m[1], b: +m[2], y: m[3], h: +m[4], min: +m[5], s: +(m[6] || 0), ap: m[7], rest: m[8] })
    else if (raw.length && line.trim()) raw[raw.length - 1].rest += '\n' + line
  }

  const dayFirst = !raw.some(r => r.b > 12) || raw.some(r => r.a > 12)

  return raw.map(r => {
    const day = dayFirst ? r.a : r.b
    const month = dayFirst ? r.b : r.a
    const year = r.y.length === 2 ? 2000 + +r.y : +r.y
    let hour = r.h
    if (r.ap) hour = (hour % 12) + (/p/i.test(r.ap) ? 12 : 0)

    const system = looksLikeSystem(r.rest)
    const cut = system ? -1 : r.rest.indexOf(': ')
    return {
      // ponytail: built as a local time, because the export carries no zone and the
      // phone that wrote it was in ours.
      at: new Date(year, month - 1, day, hour, r.min, r.s),
      sender: system ? null : r.rest.slice(0, cut),
      text: system ? r.rest.trim() : r.rest.slice(cut + 2).trim(),
      system,
    }
  })
}

// "WhatsApp Chat with Jane Yuuker.txt", "Chat de WhatsApp con Jane Yuuker.txt"
export function contactFromFilename(name = '') {
  const m = String(name)
    .replace(/\.txt$/i, '')
    .match(/(?:chat (?:with|de whatsapp con)|whatsapp chat with|conversa com)\s+(.+)$/i)
  return m ? m[1].trim() : String(name).replace(/\.txt$/i, '').trim() || null
}

const MEDIA = /^(<media omitted>|<multimedia omitido>|image omitted|imagen omitida|video omitted|audio omitted|sticker omitted|document omitted|gif omitted)/i

/**
 * Who owes whom. The contact is whoever the export is named after; every other sender is
 * you, which holds for a one-to-one chat and is what this is for.
 */
export function chatStatus(messages, { contact, now = new Date() } = {}) {
  const real = messages.filter(m => !m.system && m.sender)
  if (!real.length) return { contact, empty: true, pending: false, messages: 0 }

  const senders = [...new Set(real.map(m => m.sender))]
  const them = contact && senders.includes(contact)
    ? contact
    // No usable filename: the one who speaks second is not necessarily the contact, so
    // fall back to the sender of the last message and say so.
    : senders.length === 2 ? null : null

  const last = real[real.length - 1]
  const fromThem = them ? last.sender === them : null
  const waitedMs = now - last.at

  // The last thing they said, skipping "image omitted" so the line means something.
  const lastWithText = [...real].reverse().find(m => !MEDIA.test(m.text)) || last

  return {
    contact: contact || last.sender,
    participants: senders,
    messages: real.length,
    lastAt: last.at,
    lastFrom: last.sender,
    lastText: lastWithText.text,
    // Unknown rather than false when the export's name told us nothing: a guess here
    // would quietly drop a conversation that is waiting on you.
    pending: fromThem,
    waitedMs,
    empty: false,
  }
}

export function readChatFile(filename, text, now = new Date()) {
  const contact = contactFromFilename(filename)
  return { filename, ...chatStatus(parseChat(text), { contact, now }) }
}
