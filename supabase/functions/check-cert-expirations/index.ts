// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Runs daily via pg_cron. Scans certification_details on manufacturers + sourcing
// for any certificate expiring within the next 7 days (Bogotá date) that hasn't
// already been alerted, then raises a bell notification + one summary email.
// A window instead of an exact same-day match: if the cron skips a day, or a cert
// gets added with 3 days already left on it, it's still caught on the next run
// instead of sliding past silently.
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
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }) // YYYY-MM-DD
    const today = new Date(todayStr + 'T00:00:00Z')
    const WARNING_DAYS = 7

    const TABLES = [
      { table: 'manufacturers', nameField: 'company_name' },
      { table: 'sourcing', nameField: 'provider' },
    ]

    const expiring: Array<{ source: string; name: string; certName: string; detail: any; daysUntil: number }> = []

    for (const { table, nameField } of TABLES) {
      const { data: rows, error } = await supabase
        .from(table)
        .select(`id, ${nameField}, certification_details`)
        .not('certification_details', 'is', null)
      if (error) throw error

      for (const row of rows || []) {
        const details = row.certification_details || {}
        let changed = false

        for (const [certName, detail] of Object.entries<any>(details)) {
          if (!detail?.validUntil || detail.alerted_on) continue
          const validUntil = new Date(detail.validUntil + 'T00:00:00Z')
          const daysUntil = Math.round((validUntil.getTime() - today.getTime()) / 86400000)
          if (daysUntil >= 0 && daysUntil <= WARNING_DAYS) {
            expiring.push({ source: table, name: row[nameField] || 'Unknown', certName, detail, daysUntil })
            detail.alerted_on = todayStr
            changed = true
          }
        }

        if (changed) {
          await supabase.from(table).update({ certification_details: details }).eq('id', row.id)
        }
      }
    }

    if (expiring.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const whenText = (d: number) => d === 0 ? 'expires today' : d === 1 ? 'expires tomorrow' : `expires in ${d} days`

    // One notification per expiring certificate, for the bell icon
    await supabase.from('notifications').insert(
      expiring.map(e => ({
        recipient_email: 'production@siinge.studio',
        message: `⚠️ ${e.certName} certificate ${whenText(e.daysUntil)} — ${e.name}. Check with the factory for updated cert. info.`,
      }))
    )

    // One summary email covering everything expiring within the window
    const rowsHtml = expiring.map(e => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827">${e.name}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;color:#374151">${e.certName}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;color:#374151">${whenText(e.daysUntil)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">${e.detail?.authority || '—'}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px">${e.detail?.number || '—'}</td>
      </tr>`).join('')

    const dateStr = new Date().toLocaleDateString('en-US', {
      timeZone: 'America/Bogota', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const count = expiring.length

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:700px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#7c2d12;padding:28px 32px">
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px">SIINGE Hub</h1>
      <p style="margin:6px 0 0;color:#fed7aa;font-size:13px">Certificate Expiration Alert &middot; ${dateStr}</p>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 20px;color:#374151;font-size:15px">
        <strong>${count} certificate${count !== 1 ? 's' : ''}</strong> expiring within the next ${WARNING_DAYS} days. Check with the factory for updated certification info.
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #f3f4f6;border-radius:8px;overflow:hidden">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Company</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Certificate</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Expires</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Authority</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em">Cert. Number</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <p style="margin:24px 0 0;text-align:center;font-size:12px;color:#9ca3af">
        Log in to <a href="https://siinge.studio" style="color:#4f46e5;text-decoration:none;font-weight:600">SIINGE Hub</a> to update the record once renewed.
      </p>
    </div>
  </div>
</body>
</html>`

    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SIINGE Hub <production@siinge.studio>',
        to: ['production@siinge.studio'],
        subject: `⚠️ ${count} certificate${count !== 1 ? 's' : ''} expiring soon — SIINGE Hub`,
        html,
      }),
    })
    const sendData = await sendRes.json()
    if (!sendRes.ok) throw new Error(sendData.message ?? `Resend error ${sendRes.status}`)

    return new Response(JSON.stringify({ notified: count, resend_id: sendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('check-cert-expirations error:', err)
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
