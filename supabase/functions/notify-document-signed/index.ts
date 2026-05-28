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

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const {
      document_type,
      document_id,
      manufacturer_id,
      manufacturer_name,
      company_name,
      signer_name,
      signer_email,
    } = await req.json()

    const docType = document_type.toUpperCase()
    const signedAt = new Date().toLocaleString('en-US', {
      timeZone: 'America/Bogota',
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    // Generate download link (valid 7 days)
    let downloadLink = ''
    if (document_id && manufacturer_id) {
      const path = `${manufacturer_id}/${document_type}_${document_id}.pdf`
      const { data: urlData } = await supabase.storage
        .from('signed_documents')
        .createSignedUrl(path, 604800)
      if (urlData?.signedUrl) {
        downloadLink = urlData.signedUrl
      }
    }

    const downloadSection = downloadLink
      ? `<div style="margin: 1.5rem 0;">
          <a href="${downloadLink}" target="_blank" style="background:#22c55e;color:white;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;">
            ↓ Download Signed ${docType}
          </a>
        </div>`
      : ''

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #22c55e; margin: 0 0 1.5rem;">✅ ${docType} Signed</h2>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 0.6rem 1rem 0.6rem 0; color: #888; font-weight: 600; white-space: nowrap;">Manufacturer</td>
            <td style="padding: 0.6rem 0;">${manufacturer_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 0.6rem 1rem 0.6rem 0; color: #888; font-weight: 600;">Company</td>
            <td style="padding: 0.6rem 0;">${company_name}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 0.6rem 1rem 0.6rem 0; color: #888; font-weight: 600;">Signer</td>
            <td style="padding: 0.6rem 0;">${signer_name || '—'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 0.6rem 1rem 0.6rem 0; color: #888; font-weight: 600;">Email</td>
            <td style="padding: 0.6rem 0;">${signer_email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 0.6rem 1rem 0.6rem 0; color: #888; font-weight: 600;">Document</td>
            <td style="padding: 0.6rem 0;">${docType}</td>
          </tr>
          <tr>
            <td style="padding: 0.6rem 1rem 0.6rem 0; color: #888; font-weight: 600;">Signed at</td>
            <td style="padding: 0.6rem 0;">${signedAt} (Bogotá)</td>
          </tr>
        </table>

        ${downloadSection}
      </div>
    `

    // Send email notification
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SIINGE Studio <production@siinge.studio>',
        to: ['production@siinge.studio'],
        subject: `✅ ${docType} signed — ${manufacturer_name}`,
        html,
      }),
    })

    const resendData = await resendRes.json()
    if (!resendRes.ok) throw new Error(resendData.message ?? `Resend error ${resendRes.status}`)

    // Insert platform notification
    await supabase.from('notifications').insert([{
      recipient_email: 'production@siinge.studio',
      message: `✅ ${docType} signed by ${signer_name || signer_email} (${manufacturer_name})`,
    }])

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('notify-document-signed error:', err)
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
