// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HTML_SIGNATURE = `<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; line-height: 1.15; width: 100%;" id="isPasted" width="100%">
	<tbody valign="middle">
		<tr valign="inherit">
			<td style="vertical-align:middle;padding:.01px 12px 0.01px 1px;width:92px;text-align:center;" valign="middle" align="center"><img border="0" src="https://permanent-assets-download.flockmail.com/signature/2408373/2024-06-03_36c3cd811224bc3a55b5_55761" width="92" alt="photo" style="width: 78px; vertical-align: middle; border-radius: 0px; height: 83px; border: 0px; display: block;"></td>
			<td valign="top" style="padding:.01px 0.01px 0.01px 12px;vertical-align:top;border-left:solid 1px #BDBDBD;"><strong><strong><br></strong></strong>

				<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;" width="100%">
					<tbody valign="middle">
						<tr valign="inherit">
							<td style="padding:.01px;" valign="inherit">

								<p style="margin:.1px;line-height:108.0%;font-size:16px;"><span style="font-size: 12pt;"><strong><strong>Luis Dom&iacute;nguez</strong><br style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; user-select: inherit; scrollbar-color: auto; box-sizing: border-box;"></strong></span><span style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 11pt; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; float: none; display: inline !important;"><strong>Product Operations Manager</strong></span></p>

								<p style="margin:.1px;line-height:108.0%;font-size:16px;"><span style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 11pt; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; float: none; display: inline !important;"><strong>​</strong></span>
									<br style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; user-select: inherit; scrollbar-color: auto; box-sizing: border-box;"><span style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none;">+57 350 201 4528 &nbsp; | &nbsp;&nbsp;</span><a href="https://www.siinge.studio/" title="https://www.siinge.studio" style="color: rgb(76, 140, 246); font-family: Arial, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background: rgba(0, 0, 0, 0); user-select: auto; scrollbar-color: auto; box-sizing: border-box;" target="_blank">www.siinge.studio</a>
									<br style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background-color: rgb(255, 255, 255); text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; user-select: inherit; scrollbar-color: auto; box-sizing: border-box;"><a href="mailto:production@siinge.studio" title="mailto:production@siinge.studio" style="color: rgb(76, 140, 246); font-family: Arial, sans-serif; font-size: 14px; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; background: rgba(0, 0, 0, 0); user-select: auto; scrollbar-color: auto; box-sizing: border-box;" target="_blank">production@siinge.studio</a></p>
							</td>
						</tr>
						<tr valign="inherit">
							<td valign="inherit">

								<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;" width="100%">
									<tbody valign="middle">
										<tr valign="inherit">
											<td style="padding-top:6px;white-space:nowrap;width:138px;font-family:Arial;" valign="inherit"><span style="font-size: 11pt;">​</span>
												<br>
											</td>
										</tr>
									</tbody>
								</table>
							</td>
						</tr>
					</tbody>
				</table>
			</td>
		</tr>
	</tbody>
</table>

<table cellpadding="0" cellspacing="0" width="100%" style="width:100%;color:gray;border-top:1px solid gray;line-height:normal;">
	<tbody valign="middle">
		<tr valign="inherit">
			<td style="padding:9px 8px 0 0;" valign="inherit">

				<p style="color:#888888;text-align:left;font-size:10px;margin:1px;line-height:120%;font-family:Arial ;">IMPORTANT: The contents of this email and any attachments are confidential. They are intended for the named recipient(s) only. If you have received this email by mistake, please notify the sender immediately and do not disclose the contents to anyone or make copies thereof.</p>
			</td>
		</tr>
	</tbody>
</table>`

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

  try {
    const {
      manufacturer_email,
      extra_recipients = [],
      manufacturer_name,
      document_type,
      portal_url,
      expires_at,
      custom_subject,
      custom_body,
      manufacturer_id,
    } = await req.json()

    if (!manufacturer_email || !document_type || !portal_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format document type
    const docTypeFormatted = document_type.toUpperCase()
    const expiresDate = new Date(expires_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Signing button block (always appended)
    const signButton = `
      <div style="text-align: center; margin: 2rem 0;">
        <a href="${portal_url}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
          Sign ${docTypeFormatted}
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        <strong>Link expires:</strong> ${expiresDate}
      </p>`

    // Create tracking log entry if manufacturer_id is provided
    let logEntryId: string | null = null
    if (manufacturer_id) {
      const { data: logEntry } = await supabase
        .from('manufacturer_email_logs')
        .insert([{ manufacturer_id, template_name: `${docTypeFormatted} Signing Request`, sent_at: new Date().toISOString() }])
        .select()
        .single()

      if (logEntry) logEntryId = String(logEntry.id)
    }

    const pixelTag = logEntryId
      ? `<img src="${SUPABASE_URL}/functions/v1/track-email?id=${logEntryId}" width="1" height="1" style="display:none !important;" />`
      : ''

    let html
    if (custom_body) {
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          ${custom_body.replace(/\n/g, '<br>')}
        </div>
        ${HTML_SIGNATURE}
        ${pixelTag}
      `
    } else {
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hi ${manufacturer_name},</p>

          <p>We would like you to review and sign the <strong>${docTypeFormatted}</strong> document.</p>

          <p>Please click the button below to access the secure signing portal:</p>

          ${signButton}

          <p>If you have any questions, please reach out to us.</p>
        </div>
        ${HTML_SIGNATURE}
        ${pixelTag}
      `
    }

    // Send via Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SIINGE Studio <production@siinge.studio>',
        to: [manufacturer_email, ...extra_recipients],
        subject: custom_subject || `${docTypeFormatted} Signing Request — SIINGE STUDIO`,
        html,
        open_tracking: true,
        ...(logEntryId ? { tags: [{ name: 'log_id', value: logEntryId }] } : {}),
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) throw new Error(resendData.message ?? `Resend error ${resendRes.status}`)

    return new Response(
      JSON.stringify({ sent: true, resend_id: resendData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('send-signing-link error:', err)
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
