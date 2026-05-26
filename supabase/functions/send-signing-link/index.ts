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

  try {
    const {
      manufacturer_email,
      manufacturer_name,
      document_type,
      portal_url,
      expires_at,
      custom_subject,
      custom_body,
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

    let html
    if (custom_body) {
      // custom_body already contains the sign buttons — don't append another one
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          ${custom_body.replace(/\n/g, '<br>')}
        </div>
      `
    } else {
      // Default message
      html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Hi ${manufacturer_name},</p>

          <p>We would like you to review and sign the <strong>${docTypeFormatted}</strong> document.</p>

          <p>Please click the button below to access the secure signing portal:</p>

          ${signButton}

          <p>If you have any questions, please reach out to us.</p>

          <p>Best regards,<br>
          <strong>SIINGE STUDIO</strong><br>
          <a href="https://www.siinge.studio" style="color: #6366f1;">www.siinge.studio</a>
          </p>
        </div>
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
        from: 'SIINGE Studio <noreply@siinge.studio>',
        to: [manufacturer_email],
        subject: custom_subject || `${docTypeFormatted} Signing Request — SIINGE STUDIO`,
        html,
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
