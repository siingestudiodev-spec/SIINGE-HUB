// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HTML_SIGNATURE = `<br><br>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;line-height:1.15;width:100%;" width="100%">
  <tbody valign="middle">
    <tr valign="inherit">
      <td style="vertical-align:middle;padding:.01px 12px 0.01px 1px;width:92px;text-align:center;" valign="middle" align="center">
        <img border="0" src="https://permanent-assets-download.flockmail.com/signature/2408373/2024-06-03_36c3cd811224bc3a55b5_55761" width="92" alt="photo" style="width:78px;vertical-align:middle;border-radius:0px;height:83px;border:0px;display:block;">
      </td>
      <td valign="top" style="padding:.01px 0.01px 0.01px 12px;vertical-align:top;border-left:solid 1px #BDBDBD;">
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;" width="100%">
          <tbody valign="middle">
            <tr valign="inherit">
              <td style="padding:.01px;" valign="inherit">
                <p style="margin:.1px;line-height:108.0%;font-size:16px;">
                  <span style="font-size:12pt;"><strong>Luis Domínguez</strong></span><br>
                  <span style="color:rgb(51,51,51);font-family:Arial,sans-serif;font-size:11pt;font-weight:400;"><strong>Product Operations Manager</strong></span>
                </p>
                <p style="margin:.1px;line-height:108.0%;font-size:16px;">
                  <span style="color:rgb(51,51,51);font-family:Arial,sans-serif;font-size:14px;">+57 350 201 4528 &nbsp;|&nbsp;</span>
                  <a href="https://www.siinge.studio/" style="color:rgb(76,140,246);font-family:Arial,sans-serif;font-size:14px;" target="_blank">www.siinge.studio</a><br>
                  <a href="mailto:production@siinge.studio" style="color:rgb(76,140,246);font-family:Arial,sans-serif;font-size:14px;" target="_blank">production@siinge.studio</a>
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
<table cellpadding="0" cellspacing="0" width="100%" style="width:100%;color:gray;border-top:1px solid gray;margin-top:10px;">
  <tbody valign="middle">
    <tr valign="inherit">
      <td style="padding:9px 8px 0 0;" valign="inherit">
        <p style="color:#888888;text-align:left;font-size:10px;margin:1px;line-height:120%;font-family:Arial;">IMPORTANT: The contents of this email and any attachments are confidential. They are intended for the named recipient(s) only. If you have received this email by mistake, please notify the sender immediately and do not disclose the contents to anyone or make copies thereof.</p>
      </td>
    </tr>
  </tbody>
</table>`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
  const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''

  try {
    const { sourcing_id, subject, body, template_name = 'Custom Email', cc = null } = await req.json()

    if (!sourcing_id || !subject || !body)
      return new Response(JSON.stringify({ error: 'sourcing_id, subject and body are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // 1. Fetch provider
    const { data: provider, error: provErr } = await supabase
      .from('sourcing')
      .select('id, provider, contact_name, email')
      .eq('id', sourcing_id)
      .single()

    if (provErr || !provider) throw new Error('Provider not found')
    if (!provider.email) throw new Error(`"${provider.provider}" has no email address on file`)

    // 2. Create log entry
    const { data: logEntry, error: logErr } = await supabase
      .from('sourcing_email_logs')
      .insert([{ sourcing_id, template_name }])
      .select()
      .single()

    if (logErr) throw logErr

    // 3. Build tracking pixel
    const trackingUrl = `${SUPABASE_URL}/functions/v1/track-email?id=${logEntry.id}&table=sourcing`
    const pixelTag    = `<img src="${trackingUrl}" width="1" height="1" style="display:none !important;" />`
    const signature   = HTML_SIGNATURE.replace('</tbody>', `${pixelTag}</tbody>`)

    // 4. Build HTML
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333333;line-height:1.6;">
${body.replace(/\n/g, '<br>')}
</div>
${signature}`

    // 5. Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'SIINGE Studio <production@siinge.studio>',
        to: [provider.email],
        ...(cc ? { cc: [cc] } : {}),
        subject,
        html,
        open_tracking: true,
        tags: [{ name: 'log_id', value: String(logEntry.id) }],
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) throw new Error(resendData.message ?? `Resend error ${resendRes.status}`)

    // 6. Update log with sent_at
    await supabase.from('sourcing_email_logs').update({ sent_at: new Date().toISOString() }).eq('id', logEntry.id)

    return new Response(JSON.stringify({ sent: true, resend_id: resendData.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
