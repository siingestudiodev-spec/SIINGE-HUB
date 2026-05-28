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
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''

  try {
    const {
      document_id,
      document_type,
      signer_email,
      company_name,
      language = 'en',
    } = await req.json()

    const es = language === 'es'

    console.log('📧 Received request with:', { document_id, document_type, signer_email, company_name })

    if (!document_id || !document_type || !signer_email) {
      console.error('❌ Missing required fields:', { document_id, document_type, signer_email, company_name })
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(signer_email)) {
      console.error('❌ Invalid email format:', signer_email)
      return new Response(
        JSON.stringify({ error: `Invalid email format: ${signer_email}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get signed document data
    const { data: document, error: docErr } = await supabase
      .from('manufacturer_documents')
      .select('*')
      .eq('id', document_id)
      .single()

    if (docErr || !document) {
      throw new Error('Document not found')
    }

    // Generate signed URL for 30 days
    const signedUrl = await supabase.storage
      .from('signed_documents')
      .createSignedUrl(`${document.manufacturer_id}/${document_type}_${document.id}.pdf`, 2592000) // 30 days

    if (!signedUrl || signedUrl.error) {
      // Even if file doesn't exist yet, we send confirmation email
      console.warn('Could not generate signed URL, but sending confirmation anyway')
    }

    const docTypeFormatted = document_type.toUpperCase()
    const locale = es ? 'es-ES' : 'en-US'
    const signedDate = new Date(document.signed_date).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Create tracking log entry
    let logEntryId: string | null = null
    const { data: logEntry } = await supabase
      .from('manufacturer_email_logs')
      .insert([{ manufacturer_id: document.manufacturer_id, template_name: `${docTypeFormatted} Signed Confirmation`, sent_at: new Date().toISOString() }])
      .select()
      .single()

    if (logEntry) logEntryId = String(logEntry.id)

    const pixelTag = logEntryId
      ? `<img src="${SUPABASE_URL}/functions/v1/track-email?id=${logEntryId}" width="1" height="1" style="display:none !important;" />`
      : ''

    // Build email HTML with download parameter
    const downloadLink = signedUrl?.data?.signedUrl
      ? `<p><a href="${signedUrl.data.signedUrl}?download" download style="color:#2563eb;text-decoration:underline;">${es ? 'Descargar tu copia firmada' : 'Download your signed copy'}</a></p>`
      : ''

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>${es ? `Hola ${company_name},` : `Hi ${company_name},`}</p>

        <p>${es
          ? `Gracias por firmar el documento <strong>${docTypeFormatted}</strong>.`
          : `Thank you for signing the <strong>${docTypeFormatted}</strong>.`
        }</p>

        <p>${es
          ? 'Tu documento ha sido recibido y procesado. Una copia ha sido almacenada de forma segura.'
          : 'Your document has been received and processed. A copy has been securely stored for your records.'
        }</p>

        ${downloadLink}

        <p style="color: #666; font-size: 14px; margin-top: 2rem;">
          <strong>${es ? 'Detalles del documento:' : 'Document Details:'}</strong><br>
          ${es ? 'Tipo' : 'Type'}: ${docTypeFormatted}<br>
          ${es ? 'Firmado' : 'Signed'}: ${signedDate}<br>
          ${es ? 'Firmante' : 'Signer'}: ${signer_email}
        </p>

        <p style="color: #999; font-size: 12px; margin-top: 2rem;">
          ${es
            ? 'Si no firmaste este documento o tienes preguntas, contáctanos de inmediato.'
            : 'If you did not sign this document or have questions, please contact us immediately.'
          }
        </p>

        <p>${es ? 'Saludos,' : 'Best regards,'}<br>
        <strong>SIINGE STUDIO</strong><br>
        <a href="https://www.siinge.studio" style="color: #2563eb;">www.siinge.studio</a>
        </p>
      </div>
      ${pixelTag}
    `

    const subject = es
      ? `${docTypeFormatted} Firmado Exitosamente — SIINGE STUDIO`
      : `${docTypeFormatted} Signed Successfully — SIINGE STUDIO`

    // Send via Resend to signer
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SIINGE Studio <production@siinge.studio>',
        to: [signer_email],
        subject,
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
    console.error('send-signed-doc-email error:', err)
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
