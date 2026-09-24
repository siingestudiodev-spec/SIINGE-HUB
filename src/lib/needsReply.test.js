// Run with: node src/lib/needsReply.test.js
import assert from 'node:assert/strict'
import { pendingReplies, isNoise, waitedLabel, normAddr } from './needsReply.js'

const NOW = '2026-09-23T17:00:00Z'

const inb = (id, from, at, x = {}) => ({
  id, from_email: from, from_name: null, subject: 'Re: Knit program for SS27',
  body_text: 'Please confirm the colorways.', received_at: at,
  matched_kind: 'manufacturer', matched_entity_id: null, entity_name: null, ...x,
})
const out = (to, at, x = {}) => ({ kind: 'manufacturer', entity_id: null, to_email: to, cc_email: null, sent_at: at, ...x })

// --- robots never count as something to answer ---
assert.equal(isNoise({ from_email: 'no-reply@shopify.com', subject: 'Order' }), true)
assert.equal(isNoise({ from_email: 'MAILER-DAEMON@titan.email', subject: 'failed' }), true)
assert.equal(isNoise({ from_email: 'jane@yuuker.cn', subject: 'Automatic reply: out until Oct 1' }), true)
assert.equal(isNoise({ from_email: 'jane@yuuker.cn', subject: 'Re: Automatic pricing' }), false, 'only a leading auto-reply marker counts')
assert.equal(isNoise({ from_email: 'jane@yuuker.cn', subject: 'Re: quote' }), false)
// real subjects pulled out of the Titan mailbox
assert.equal(isNoise({ from_email: 'jane@yuuker.cn', subject: '自动答复:  回复:  回复: SIINGE STUDIO x Yuuker' }), true, 'Chinese auto-reply')
assert.equal(isNoise({ from_email: 'jane@yuuker.cn', subject: '回复:  自动答复:  回复: SIINGE STUDIO x Yuuker' }), false, 'a person writing on top of an auto-reply thread is a real reply')
assert.equal(isNoise({ from_email: 'jane@yuuker.cn', subject: '回复: SIINGE STUDIO x Yuuker Partnership Inquiry' }), false)

// --- an answer after the message clears it; one before it does not ---
const answered = pendingReplies({
  now: NOW,
  inbound: [inb('i1', 'jane@yuuker.cn', '2026-09-21T10:00:00Z')],
  outbound: [out('jane@yuuker.cn', '2026-09-22T09:00:00Z')],
})
assert.deepEqual(answered, [])

const stale = pendingReplies({
  now: NOW,
  inbound: [inb('i1', 'jane@yuuker.cn', '2026-09-21T10:00:00Z')],
  outbound: [out('jane@yuuker.cn', '2026-09-20T09:00:00Z')],
})
assert.equal(stale.length, 1, 'an email sent the day before does not answer it')
assert.equal(stale[0].waited, '2d')

// --- replying to a colleague at the same factory counts as answering the thread ---
const entity = { matched_entity_id: 'helun', entity_name: 'Helun Knitting' }
const sameCompany = pendingReplies({
  now: NOW,
  inbound: [inb('i1', 'xena-xu@helun-knitting.com.cn', '2026-09-22T10:00:00Z', entity)],
  outbound: [out('allan.lin@helun-knitting.com.cn', '2026-09-22T15:00:00Z', { entity_id: 'helun' })],
})
assert.deepEqual(sameCompany, [], 'answered by entity, not just by address')

// --- cc counts as a recipient, and case/whitespace do not matter ---
const viaCc = pendingReplies({
  now: NOW,
  inbound: [inb('i1', 'Jane@Yuuker.CN', '2026-09-22T10:00:00Z')],
  outbound: [out('someone@else.com', '2026-09-22T12:00:00Z', { cc_email: ' jane@yuuker.cn , bob@x.com' })],
})
assert.deepEqual(viaCc, [])

// --- only the newest message per company is pending, and a scheduled row is not a send ---
const list = pendingReplies({
  now: NOW,
  inbound: [
    inb('i1', 'xena-xu@helun-knitting.com.cn', '2026-09-20T10:00:00Z', entity),
    inb('i2', 'xena-xu@helun-knitting.com.cn', '2026-09-22T10:00:00Z', { ...entity, subject: 'Re: MOQ' }),
    inb('i3', 'jane@yuuker.cn', '2026-09-10T10:00:00Z'),
    inb('i4', 'noreply@dhl.com', '2026-09-23T10:00:00Z'),
  ],
  outbound: [out('xena-xu@helun-knitting.com.cn', '2026-09-30T10:00:00Z', { entity_id: 'helun' })],
})
assert.equal(list.length, 2, 'two companies waiting; the robot is ignored')
assert.equal(list[0].from, 'jane@yuuker.cn', 'longest wait comes first')
assert.equal(list[0].waited, '13d')
assert.equal(list[1].subject, 'Re: MOQ', 'only the newest message from Helun')
assert.equal(list[1].company, 'Helun Knitting')

// --- an unknown sender still surfaces rather than vanishing ---
const unknown = pendingReplies({
  now: NOW,
  inbound: [inb('i1', 'newfactory@example.cn', '2026-09-23T09:00:00Z', { matched_kind: null })],
  outbound: [],
})
assert.equal(unknown.length, 1)
assert.equal(unknown[0].company, null)
assert.equal(unknown[0].waited, '8h')

assert.equal(waitedLabel(30 * 60 * 1000), 'just now')
assert.equal(normAddr('  Jane@Yuuker.CN '), 'jane@yuuker.cn')

console.log('needsReply: all checks passed')
