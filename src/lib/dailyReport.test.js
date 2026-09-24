// Run with: node src/lib/dailyReport.test.js
import assert from 'node:assert/strict'
import { ymd, relDate, isSend, timelines, historySentence, tallySentence, hubChanges, buildReport } from './dailyReport.js'

const NOW = '2026-09-22T23:00:00Z' // 6:00 PM in Bogotá
const TODAY = '2026-09-22'

// --- dates are Bogotá dates, not UTC ones ---
assert.equal(ymd('2026-09-23T02:00:00Z'), '2026-09-22', '9pm Bogotá is still the 22nd')
assert.equal(ymd('2026-09-22T14:14:00Z'), '2026-09-22')
assert.equal(relDate('2026-09-22T14:00:00Z', TODAY), 'today')
assert.equal(relDate('2026-09-21T14:00:00Z', TODAY), 'yesterday')
assert.equal(relDate('2026-08-04T14:00:00Z', TODAY), 'Aug 4')

// --- the reminder trap: saveFollowup() writes rows dated in the future ---
assert.equal(isSend({ template_name: '[Follow-up] call Allan', sent_at: '2026-09-29T13:00:00Z' }, NOW), false)
assert.equal(isSend({ template_name: 'Initial Reach', sent_at: '2026-09-29T13:00:00Z' }, NOW), false, 'no send is dated ahead of now')
assert.equal(isSend({ template_name: 'Initial Reach', sent_at: '2026-09-22T14:00:00Z' }, NOW), true)

const email = (id, entity, name, sent_at, extra = {}) => ({
  kind: 'manufacturer', id, entity_id: entity, entity_name: name,
  template_name: 'Custom Email', sent_by: 'production@siinge.studio',
  to_email: `hi@${entity}.com`, subject: 'Knit program for SS27', sent_at,
  delivered_at: sent_at, read_at: null, bounced_at: null, replied_at: null, ...extra,
})

const EMAILS = [
  // first contact today, through the hub
  email('e1', 'yuuker', 'Yuuker', '2026-09-22T14:14:00Z', {
    to_email: 'jane@yuuker.cn', subject: 'Introduction: SIINGE Studio, private label',
  }),
  // first contact today, typed in by hand — no subject
  email('e2', 'seduno', 'Ningbo Seduno', '2026-09-22T15:00:00Z', {
    subject: null, to_email: null, template_name: 'Called, asked for catalog',
  }),
  // chased since August, still silent
  email('e3', 'alpha', 'Alphadventure', '2026-08-04T14:00:00Z'),
  email('e4', 'alpha', 'Alphadventure', '2026-08-11T14:00:00Z'),
  email('e5', 'alpha', 'Alphadventure', '2026-08-25T14:00:00Z'),
  email('e6', 'alpha', 'Alphadventure', '2026-09-22T15:30:00Z', { subject: 'Checking in on the knit program' }),
  // a reminder, not a send: saveFollowup() dated it a week out
  email('e7', 'alpha', 'Alphadventure', '2026-09-29T13:00:00Z', { subject: null, template_name: '[Follow-up] call Allan' }),
  // chased and answered
  email('e8', 'sunrise', 'Sunrise Textiles', '2026-09-15T14:00:00Z', { replied_at: '2026-09-22T19:31:00Z' }),
  email('e9', 'sunrise', 'Sunrise Textiles', '2026-09-22T16:00:00Z', { read_at: '2026-09-22T16:02:00Z' }),
]

const INBOUND = [{
  id: 'i1', received_at: '2026-09-22T19:31:00Z',
  from_email: 'xena-xu@helun-knitting.com.cn', from_name: 'Xena Xu',
  subject: 'Re: Knit program for SS27',
  body_text: 'We can do 300 pcs minimum per color,\n lead time 45 days after sample approval.',
  matched_kind: 'manufacturer', matched_entity_id: 'sunrise', matched_log_id: 'e8',
}]

const AUDITS = [
  { id: 'a1', created_at: '2026-09-22T14:10:00Z', action: 'INSERT', table_name: 'manufacturers', new_data: { company_name: 'Yuuker' } },
  { id: 'a2', created_at: '2026-09-22T14:58:00Z', action: 'INSERT', table_name: 'manufacturers', new_data: { company_name: 'Ningbo Seduno' } },
  { id: 'a3', created_at: '2026-09-22T18:00:00Z', action: 'UPDATE', table_name: 'quotes', new_data: { article_number: 'SS27-014' } },
]

// --- pieces ---
const alpha = timelines(EMAILS, NOW).find(t => t.name === 'Alphadventure')
assert.equal(alpha.sends.length, 4, 'the [Follow-up] reminder is not a send')
assert.equal(historySentence(alpha, TODAY), 'First contacted Aug 4, followed up Aug 11, Aug 25 and today.')
assert.equal(tallySentence(alpha, TODAY), '4 emails, no reply in 49 days.')

const sunrise = timelines(EMAILS, NOW).find(t => t.name === 'Sunrise Textiles')
assert.equal(tallySentence(sunrise, TODAY), '2 emails. Replied today.')

// a hand-logged row makes the whole tally read "contacts", not "emails"
const seduno = timelines(EMAILS, NOW).find(t => t.name === 'Ningbo Seduno')
assert.equal(tallySentence(seduno, TODAY), '1 contact, no reply yet.')

assert.deepEqual(hubChanges(AUDITS).parts, ['2 manufacturers added', '1 quote updated'])
// one table touched two ways stays one phrase
assert.deepEqual(
  hubChanges([...AUDITS, { action: 'UPDATE', table_name: 'manufacturers', new_data: {} }]).parts,
  ['3 manufacturers: 2 added, 1 updated', '1 quote updated'],
)

// --- the whole report ---
const report = buildReport({
  from: TODAY, to: TODAY, now: NOW,
  user: 'production@siinge.studio',
  emails: EMAILS, inbound: INBOUND, audits: AUDITS,
})

assert.match(report, /^DAILY REPORT — Tuesday, September 22, 2026$/m)
assert.match(report, /^production@siinge\.studio$/m)

assert.match(report, /^FIRST CONTACT — 2 companies$/m)
assert.match(report, /^ {2}First contacted today at 9:14 AM — "Introduction: SIINGE Studio, private label"$/m)
assert.match(report, /^ {2}Sent to jane@yuuker\.cn\. Delivered, not opened yet\.$/m)
assert.match(report, /^ {2}First contact logged today — Called, asked for catalog$/m)

assert.match(report, /^FOLLOW-UPS — 2 companies$/m)
assert.match(report, /^ {2}First contacted Aug 4, followed up Aug 11, Aug 25 and today\.$/m)
assert.match(report, /^ {2}4 emails, no reply in 49 days\.$/m)
assert.match(report, /^ {2}Last email: "Checking in on the knit program" — Delivered, not opened yet\.$/m)
assert.match(report, /^ {2}Last email: "Knit program for SS27" — Delivered, opened at 11:02 AM\.$/m, 'Sunrise opened the follow-up')

assert.match(report, /^REPLIES RECEIVED — 1 reply$/m)
assert.match(report, /^ {2}Xena Xu \(xena-xu@helun-knitting\.com\.cn\) — Sunrise Textiles$/m)
assert.match(report, /^ {2}Replied at 2:31 PM to the email sent Sep 15\.$/m)
assert.match(report, /^ {2}"We can do 300 pcs minimum per color, lead time 45 days after sample approval\."$/m)

// only Alphadventure has been waiting more than a week; Sunrise answered, the rest are new
assert.match(report, /^NO REPLY YET — 1 company$/m)
assert.match(report, /^ {2}Alphadventure \(49d\)$/m)

assert.match(report, /^HUB CHANGES — 3 records$/m)
assert.match(report, /^ {2}2 manufacturers added and 1 quote updated\.$/m)
assert.match(report, /^ {2}Added: Yuuker and Ningbo Seduno\.$/m)

// the scheduled reminder must not surface anywhere in the prose
assert.doesNotMatch(report, /Sep 29/)
assert.doesNotMatch(report, /call Allan/)

// --- a quiet day says so instead of printing empty headings ---
const quiet = buildReport({ from: '2026-09-21', to: '2026-09-21', now: NOW, user: null, emails: EMAILS })
assert.match(quiet, /^All users$/m)
assert.match(quiet, /^Nothing recorded for this day\.$/m)
assert.doesNotMatch(quiet, /FIRST CONTACT/)

console.log('dailyReport: all checks passed')
