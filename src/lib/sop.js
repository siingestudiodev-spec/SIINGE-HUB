// The Product Operations SOP as data, plus the part that matters: the hub checks off
// what it can actually prove and leaves the rest alone.
//
// A checklist nobody can fail is a checklist nobody reads. Every item here is one of
// three kinds:
//   auto   — the data settles it. Zero follow-ups overdue means the step is done.
//   signal — the hub knows the number but not whether you acted on it, so it shows the
//            number and waits for you.
//   manual — nothing in the database can see it (Drive uploads, WhatsApp to Sierra).
//
// Pure functions, no Vue and no Supabase: `node src/lib/sop.test.js` runs them.

export const DAILY = [
  {
    id: 'email-review',
    title: 'Email Review (Start of Day)',
    objective: 'Identify new information, pending actions, and follow-up opportunities.',
    items: [
      { id: 'read-all', label: 'Review all new emails', signal: 'newEmails' },
      { id: 'id-updates', label: 'Identify manufacturer updates' },
      { id: 'id-replies', label: 'Identify emails requiring a response', signal: 'needsReply', auto: true },
      { id: 'id-followups', label: 'Identify manufacturers requiring follow-up', signal: 'followupsDue', auto: true },
      { id: 'id-new', label: 'Identify new manufacturer opportunities' },
      { id: 'id-projects', label: 'Identify active project updates' },
    ],
  },
  {
    id: 'database',
    title: 'Database & Project Updates',
    objective: 'Ensure all manufacturer and project information is accurately documented.',
    rule: 'No email containing relevant information is processed until every applicable database and project update has been completed.',
    items: [
      { id: 'manu-records', label: 'Update manufacturer records', signal: 'manufacturerEdits' },
      { id: 'comm-history', label: 'Record communication history', signal: 'contactsLogged' },
      { id: 'project-info', label: 'Update project-related information', signal: 'projectEdits' },
      { id: 'deployments', label: 'Update run deployments when applicable' },
      { id: 'quotes', label: 'Record quote updates', signal: 'quoteEdits' },
      { id: 'status', label: 'Update project status if required' },
      { id: 'verify-saved', label: 'Verify all information has been successfully saved' },
    ],
  },
  {
    id: 'followup',
    title: 'Follow-Up & Communication Management',
    objective: 'Maintain active communication and prevent conversations from stalling.',
    items: [
      { id: 'review-waiting', label: 'Review manufacturers awaiting responses', signal: 'needsReply', auto: true },
      { id: 'send-followups', label: 'Send scheduled follow-ups', signal: 'followupsDue', auto: true },
      { id: 'record-dates', label: 'Record follow-up dates' },
      { id: 'comm-status', label: 'Update communication status' },
      { id: 'scorecard', label: 'Record Scorecard checks' },
      { id: 'website', label: 'Deploy pending website changes' },
      { id: 'tracking-request', label: 'Request shipment tracking once swatches or samples are dispatched' },
      { id: 'tracking-record', label: 'Record tracking information in the project' },
      { id: 'tracking-sierra', label: 'Send tracking link to Sierra via WhatsApp', manual: true },
      { id: 'certs', label: 'Request certifications after receiving quotations' },
      { id: 'certs-status', label: 'Record certification request status' },
    ],
  },
  {
    id: 'outreach',
    title: 'New Manufacturer Outreach',
    objective: 'Expand the manufacturer network and support sourcing needs.',
    items: [
      { id: 'research', label: 'Research potential manufacturers' },
      { id: 'evaluate', label: 'Evaluate manufacturer suitability' },
      { id: 'create', label: 'Create manufacturer records', signal: 'manufacturersAdded' },
      { id: 'send-initial', label: 'Send initial outreach emails', signal: 'outreachSent' },
      { id: 'record-outreach', label: 'Record outreach dates and status' },
      { id: 'alibaba', label: 'Use the Alibaba Good Fit Checklist for Alibaba suppliers' },
    ],
  },
  {
    id: 'eod',
    title: 'End-of-Day Review',
    objective: 'Ensure all work has been completed and documented.',
    items: [
      { id: 'unread', label: 'Review remaining unread emails' },
      { id: 'confirm-manu', label: 'Confirm all manufacturer updates have been recorded' },
      { id: 'confirm-followups', label: 'Confirm all follow-ups have been logged' },
      { id: 'drive-samples', label: "Upload sample images to the manufacturer's Google Drive folder", manual: true },
      { id: 'drive-feedback', label: 'Upload feedback/correction images with clear filenames', manual: true },
      { id: 'tomorrow', label: 'Review pending tasks for the following day' },
      { id: 'report-sierra', label: 'Send daily report to Sierra', signal: 'reportSent' },
    ],
  },
]

export const WEEKLY = [
  {
    id: 'w-followup',
    title: 'Manufacturer Follow-Up Review',
    objective: 'Review inactive conversations and determine required actions.',
    items: [
      { id: 'no-response', label: 'Review manufacturers with no recent response', signal: 'silent' },
      { id: 'last-contact', label: 'Verify last contact date' },
      { id: 'need-another', label: 'Determine whether another follow-up is required' },
      { id: 'update-status', label: 'Update manufacturer status' },
    ],
  },
  {
    id: 'w-quality',
    title: 'Database Quality Review',
    objective: 'Ensure all manufacturer records remain complete and accurate.',
    items: [
      { id: 'active-records', label: 'Review active manufacturer records' },
      { id: 'contact-info', label: 'Verify contact information' },
      { id: 'comm-history', label: 'Verify communication history' },
      { id: 'quote-history', label: 'Verify quote history' },
      { id: 'certs-requested', label: 'Verify certifications have been requested when applicable' },
      { id: 'project-current', label: 'Confirm project information is current' },
    ],
  },
  {
    id: 'w-projects',
    title: 'Active Project Review',
    objective: 'Ensure project-related manufacturer information remains current.',
    items: [
      { id: 'all-active', label: 'Review all active projects' },
      { id: 'latest-updates', label: 'Verify latest manufacturer updates' },
      { id: 'missing-info', label: 'Identify missing information' },
      { id: 'prioritize', label: 'Prioritize outstanding actions' },
      { id: 'shipments', label: 'Review shipment tracking for samples in transit' },
    ],
  },
  {
    id: 'w-network',
    title: 'Network Expansion',
    objective: 'Continuously strengthen the manufacturer network. Priorities: Knitwear, Bridal.',
    items: [
      { id: 'research-priority', label: 'Research manufacturers for priority categories' },
      { id: 'add-15', label: 'Add 15–20 qualified manufacturers', signal: 'manufacturersAdded', target: 15 },
      { id: 'checklist', label: 'Complete Alibaba Good Fit Checklist before approval' },
      { id: 'next-week', label: 'Prioritize outreach for the following week' },
    ],
  },
  {
    id: 'w-requests',
    title: 'Mid-Week Request Review',
    objective: 'Ensure requests made outside scheduled meetings are documented and completed.',
    items: [
      { id: 'review-requests', label: 'Review all requests received during the week' },
      { id: 'tracker', label: 'Verify each request is in the project tracker' },
      { id: 'priority', label: 'Verify each request has a priority' },
      { id: 'done-or-scheduled', label: 'Verify each request is completed or scheduled' },
      { id: 'told-sierra', label: 'Communicate to Sierra if necessary', manual: true },
    ],
  },
  {
    id: 'w-wrap',
    title: 'Weekly Wrap-Up',
    objective: 'Prepare for the following week.',
    items: [
      { id: 'outstanding', label: 'Review outstanding follow-ups', signal: 'followupsDue' },
      { id: 'pending-quotes', label: 'Review pending quotes' },
      { id: 'pending-certs', label: 'Review pending certifications' },
      { id: 'deadlines', label: 'Review upcoming project deadlines' },
      { id: 'objectives', label: 'Confirm weekly objectives have been completed' },
    ],
  },
]

export const ALIBABA_CHECKLIST = [
  'Trade Assurance available',
  'Required certifications available',
  'Positive customer reviews',
  'Relevant product history',
  'Experience with required manufacturing techniques',
  'Experience within required product categories',
]

const countAudits = (audits, table, action) =>
  audits.filter(a => a.table_name === table && (!action || a.action === action)).length

/**
 * Turns the day's raw data into the numbers the checklist quotes. Everything here is
 * already loaded by the activity view; nothing new is fetched.
 */
export function signals({ inbound = [], audits = [], sends = [], pending = [], followupsDue = 0, silent = 0, reportSent = false } = {}) {
  return {
    newEmails: { n: inbound.length, label: `${inbound.length} received` },
    needsReply: { n: pending.length, label: pending.length ? `${pending.length} waiting` : 'nobody waiting' },
    followupsDue: { n: followupsDue, label: followupsDue ? `${followupsDue} due` : 'none due' },
    manufacturerEdits: { n: countAudits(audits, 'manufacturers'), label: `${countAudits(audits, 'manufacturers')} edits` },
    projectEdits: { n: countAudits(audits, 'projects') + countAudits(audits, 'project_stages'), label: `${countAudits(audits, 'projects') + countAudits(audits, 'project_stages')} edits` },
    quoteEdits: { n: countAudits(audits, 'quotes'), label: `${countAudits(audits, 'quotes')} edits` },
    manufacturersAdded: { n: countAudits(audits, 'manufacturers', 'INSERT'), label: `${countAudits(audits, 'manufacturers', 'INSERT')} added` },
    contactsLogged: { n: sends.length, label: `${sends.length} logged` },
    outreachSent: {
      n: sends.filter(s => /initial reach/i.test(s.template_name || '')).length,
      label: `${sends.filter(s => /initial reach/i.test(s.template_name || '')).length} sent`,
    },
    silent: { n: silent, label: silent ? `${silent} with no reply` : 'none' },
    reportSent: { n: reportSent ? 1 : 0, label: reportSent ? 'sent' : 'not sent' },
  }
}

/**
 * Decides each item's state. `checked` is the set of ids ticked by hand.
 *
 * An auto item is done when its number reaches zero — no one waiting, nothing overdue.
 * An item with a target is done when it reaches the target. Everything else is yours.
 */
export function status(sections, sig, checked = {}) {
  return sections.map(section => {
    const items = section.items.map(item => {
      const s = item.signal ? sig[item.signal] : null
      const manualDone = Boolean(checked[item.id])
      let done = manualDone
      let by = manualDone ? 'you' : null

      if (!done && s) {
        if (item.target != null && s.n >= item.target) { done = true; by = 'data' }
        else if (item.auto && s.n === 0) { done = true; by = 'data' }
      }
      return { ...item, done, by, evidence: s?.label ?? null, count: s?.n ?? null }
    })
    return { ...section, items, done: items.filter(i => i.done).length, total: items.length }
  })
}

export function progress(sections) {
  const items = sections.flatMap(s => s.items)
  const done = items.filter(i => i.done).length
  return { done, total: items.length, pct: items.length ? Math.round(done / items.length * 100) : 0 }
}

// Monday of the week a date falls in, as YYYY-MM-DD. Weekly SOP state is stored against it.
export function weekOf(ymd) {
  const d = new Date(ymd + 'T00:00:00Z')
  const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}
