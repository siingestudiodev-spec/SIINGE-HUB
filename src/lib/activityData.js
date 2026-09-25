// The one fetch both /activity and /sop run. They read the same rows for different
// reasons — the report narrates them, the SOP counts them — and two copies of these
// queries would drift the first time a filter changed on one side only.
import { supabase } from './supabase'
import { timelines } from './dailyReport'
import { pendingReplies } from './needsReply'

const BOGOTA = '-05:00'

/**
 * `from`/`to` are Bogotá dates as "YYYY-MM-DD". Outbound comes back whole on purpose:
 * "first contacted Aug 4" cannot be computed from a one-day slice.
 */
export async function loadActivity({ from, to }) {
  const [out, inb, aud, due] = await Promise.all([
    supabase.from('outbound_activity').select('*').order('sent_at', { ascending: true }),
    supabase.from('inbound_activity').select('*').order('received_at', { ascending: false }).limit(500),
    supabase.from('audit_logs').select('*')
      .gte('created_at', `${from}T00:00:00${BOGOTA}`)
      .lte('created_at', `${to}T23:59:59${BOGOTA}`)
      .limit(2000),
    supabase.from('manufacturers').select('id', { count: 'exact', head: true })
      .not('followup_due_at', 'is', null)
      .lte('followup_due_at', new Date().toISOString())
      .is('followup_sent_at', null)
      .is('followup_manually_completed_at', null),
  ])

  const outbound = out.data || []
  const inbound = inb.data || []
  return {
    outbound,
    inbound,
    audits: aud.data || [],
    followupsDue: due.count || 0,
    pending: pendingReplies({ inbound, outbound }),
    silent: silentCount(outbound),
  }
}

// Companies we wrote to, that never answered, quiet for over a week.
export function silentCount(outbound, now = Date.now()) {
  return timelines(outbound, new Date(now).toISOString())
    .filter(t => !t.sends.some(r => r.replied_at))
    .filter(t => now - Date.parse(t.sends[t.sends.length - 1].sent_at) > 7 * 86400000)
    .length
}

// One row per person per day (or per week), holding the SOP ticks and, for a daily
// sheet, what was left out of that day's report.
export async function loadSopSheets(day, week) {
  const { data } = await supabase.from('sop_days').select('*').in('day', [day, week])
  return {
    daily: (data || []).find(r => r.kind === 'daily' && r.day === day) || null,
    weekly: (data || []).find(r => r.kind === 'weekly' && r.day === week) || null,
  }
}

// Only the columns passed are written, so the report's exclusions and the SOP's ticks
// never overwrite each other.
export async function saveSopSheet({ userEmail, day, kind, ...patch }) {
  const { error } = await supabase.from('sop_days').upsert(
    { user_email: userEmail, day, kind, updated_at: new Date().toISOString(), ...patch },
    { onConflict: 'user_email,day,kind' },
  )
  return error
}
