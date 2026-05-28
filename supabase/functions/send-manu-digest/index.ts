// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

  try {
    // 1. Cancel any previously scheduled digest
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'manu_digest_resend_id')
      .maybeSingle()

    if (setting?.value) {
      const cancelRes = await fetch(`https://api.resend.com/emails/${setting.value}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      })
      console.log('Cancelled previous digest:', setting.value, cancelRes.status)
      await supabase.from('app_settings').delete().eq('key', 'manu_digest_resend_id')
    }

    // 2. Query pending manufacturers (due today or overdue, not yet actioned)
    const { data: pending, error } = await supabase
      .from('manufacturers')
      .select('id, company_name, contact_name, email, followup_due_at, followup_notes')
      .not('followup_due_at', 'is', null)
      .lte('followup_due_at', new Date().toISOString())
      .is('followup_sent_at', null)
      .is('followup_manually_completed_at', null)
      .order('followup_due_at', { ascending: true })

    if (error) throw error

    if (!pending || pending.length === 0) {
      return new Response(
        JSON.stringify({ scheduled: false, reason: 'No pending follow-ups' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Build HTML email table
    const todayUtc = new Date()
    todayUtc.setUTCHours(0, 0, 0, 0)

    const rows = pending.map(m => {
      const due = new Date(m.followup_due_at)
      due.setUTCHours(0, 0, 0, 0)
      const diffDays = Math.round((todayUtc.getTime() - due.getTime()) / 86400000)
      const label = diffDays === 0 ? 'Today' : `${diffDays}d overdue`
      const color  = diffDays === 0 ? '#d97706' : '#dc2626'
      const bg     = diffDays === 0 ? '#fef3c7' : '#fee2e2'
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827">${m.company_name ?? '—'}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#374151">${m.contact_name ?? '—'}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6">
            <span style="background:${bg};color:${color};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700">${label}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">${m.followup_notes ?? '—'}</td>
        </tr>`
    }).join('')

    const dateStr = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const count = pending.length
    const plural = count !== 1

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:700px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1e1b4b;padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px">SIINGE Hub</h1>
      <p style="margin:6px 0 0;color:#a5b4fc;font-size:13px">Daily Follow-up Digest &middot; ${dateStr}</p>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px">
        <strong>${count} manufacturer${plural ? 's' : ''}</strong> ${plural ? 'are' : 'is'} due for follow-up:
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f3f4f6;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Company</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Contact</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Status</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Notes</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:24px 0 0;text-align:center;font-size:12px;color:#9ca3af">
        Log in to <a href="https://siinge.studio" style="color:#4f46e5;text-decoration:none;font-weight:600">SIINGE Hub</a> to take action.
      </p>
    </div>
  </div>
</body>
</html>`

    // 4. Schedule for next 8:00 am Bogotá (UTC-5 = 13:00 UTC)
    const scheduledAt = nextEightAmBogota()

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SIINGE Hub <production@siinge.studio>',
        to: ['production@siinge.studio'],
        subject: `📋 ${count} follow-up${plural ? 's' : ''} pending — SIINGE Hub`,
        html,
        scheduled_at: scheduledAt,
      }),
    })

    const sendData = await sendRes.json()
    if (!sendRes.ok) throw new Error(sendData.message ?? `Resend error ${sendRes.status}`)

    // 5. Persist Resend email ID so it can be cancelled on the next reschedule
    await supabase.from('app_settings').upsert({
      key: 'manu_digest_resend_id',
      value: sendData.id,
      updated_at: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ scheduled: true, scheduled_at: scheduledAt, resend_id: sendData.id, count }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('send-manu-digest error:', err)
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Returns the next 08:00 Bogotá time as a UTC ISO string.
// Bogotá = UTC-5, so 8am Bogotá = 13:00 UTC.
function nextEightAmBogota(): string {
  const now = new Date()
  const y  = now.getUTCFullYear()
  const mo = now.getUTCMonth()
  const d  = now.getUTCDate()
  // 13:00 UTC = 08:00 Bogotá
  const todayTarget = new Date(Date.UTC(y, mo, d, 13, 0, 0, 0))
  if (now >= todayTarget) {
    todayTarget.setUTCDate(todayTarget.getUTCDate() + 1)
  }
  return todayTarget.toISOString()
}
