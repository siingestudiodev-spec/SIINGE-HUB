// Run with: node src/lib/whatsappChat.test.js
import assert from 'node:assert/strict'
import { parseChat, contactFromFilename, chatStatus, readChatFile } from './whatsappChat.js'

// --- Android, 24h, day first, with the invisible marks WhatsApp inserts ---
const android = `12/09/2026, 10:45 - Messages and calls are end-to-end encrypted.
12/09/2026, 10:45 - Jane Yuuker: Hello Luis, we can do 300 pcs minimum
12/09/2026, 10:46 - Luis: Perfect, what about lead time?
12/09/2026, 11:02 - Jane Yuuker: 45 days after sample approval
and we need the colorways confirmed`

const a = parseChat(android)
assert.equal(a.length, 4)
assert.equal(a[0].system, true, 'the encryption notice is not a message anyone answers')
assert.equal(a[0].sender, null)
assert.equal(a[1].sender, 'Jane Yuuker')
assert.equal(a[1].text, 'Hello Luis, we can do 300 pcs minimum')
assert.equal(a[1].at.getFullYear(), 2026)
assert.equal(a[1].at.getMonth(), 8, 'September, not December — day comes first here')
assert.equal(a[1].at.getDate(), 12)
assert.equal(a[1].at.getHours(), 10)
assert.equal(a[3].text, '45 days after sample approval\nand we need the colorways confirmed',
  'a wrapped message keeps its continuation lines')

// --- iOS, brackets, seconds, 12h ---
const ios = `[12/09/2026, 10:45:12 a.m.] Jane Yuuker: Hello
[12/09/2026, 2:31:00 p.m.] Luis: Thanks`
const i = parseChat(ios)
assert.equal(i.length, 2)
assert.equal(i[0].sender, 'Jane Yuuker')
assert.equal(i[0].at.getHours(), 10)
assert.equal(i[1].at.getHours(), 14, 'p.m. moves it past noon')

// --- invisible direction marks must not break the parse ---
const dirty = '‎[12/09/2026, 10:45:12] ‎Jane Yuuker: ‎Hola'
assert.equal(parseChat(dirty)[0].sender, 'Jane Yuuker')

// --- a US phone writes month first, and a day past 12 settles it ---
const us = `3/14/26, 9:00 AM - Jane: one
4/2/26, 9:00 AM - Jane: two`
const u = parseChat(us)
assert.equal(u[0].at.getMonth(), 2, 'March: 14 cannot be a month')
assert.equal(u[0].at.getDate(), 14)
assert.equal(u[1].at.getMonth(), 3, 'the whole file follows the same order')
assert.equal(u[1].at.getDate(), 2)

// with nothing to settle it, day first — what a phone here writes
assert.equal(parseChat('3/4/26, 9:00 - Jane: hi')[0].at.getMonth(), 3, 'April 3, not March 4')

// --- the filename names the contact ---
assert.equal(contactFromFilename('WhatsApp Chat with Jane Yuuker.txt'), 'Jane Yuuker')
assert.equal(contactFromFilename('Chat de WhatsApp con Andrea Ruiz.txt'), 'Andrea Ruiz')
assert.equal(contactFromFilename('_chat.txt'), '_chat')

// --- who owes whom ---
const NOW = new Date(2026, 8, 14, 10, 45)
const waiting = chatStatus(parseChat(android), { contact: 'Jane Yuuker', now: NOW })
assert.equal(waiting.pending, true, 'she spoke last, so it is on you')
assert.equal(waiting.lastFrom, 'Jane Yuuker')
assert.equal(waiting.messages, 3, 'the system notice is not counted')
assert.equal(Math.round(waiting.waitedMs / 86400000), 2)

const answered = chatStatus(parseChat(android + '\n12/09/2026, 11:30 - Luis: Confirmed, sending the colorways'),
  { contact: 'Jane Yuuker', now: NOW })
assert.equal(answered.pending, false, 'you had the last word')

// --- an unnamed export does not guess ---
const unnamed = chatStatus(parseChat(android), { contact: null, now: NOW })
assert.equal(unnamed.pending, null, 'better unknown than a wrong verdict that hides a waiting chat')

// --- "image omitted" is not the last thing they said ---
const withMedia = parseChat(`12/09/2026, 10:45 - Jane: here are the swatches
12/09/2026, 10:46 - Jane: <Media omitted>`)
const m = chatStatus(withMedia, { contact: 'Jane', now: NOW })
assert.equal(m.lastText, 'here are the swatches')
assert.equal(m.lastFrom, 'Jane')

// --- an empty or unparseable file says so instead of throwing ---
assert.equal(chatStatus(parseChat(''), { contact: 'X' }).empty, true)
assert.equal(chatStatus(parseChat('not a chat at all'), { contact: 'X' }).empty, true)

// --- the whole read, as the drop zone will call it ---
const file = readChatFile('WhatsApp Chat with Jane Yuuker.txt', android, NOW)
assert.equal(file.contact, 'Jane Yuuker')
assert.equal(file.pending, true)
assert.equal(file.lastText, '45 days after sample approval\nand we need the colorways confirmed')

console.log('whatsappChat: all checks passed')
