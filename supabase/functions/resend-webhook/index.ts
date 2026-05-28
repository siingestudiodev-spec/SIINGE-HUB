// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const event = await req.json()
    console.log('resend-webhook event:', JSON.stringify(event))

    if (event.type !== 'email.opened') {
      return new Response(JSON.stringify({ skipped: event.type }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const rawTags = event.data?.tags

    // Resend can send tags as array [{name, value}] or object {key: value}
    let logId: string | null = null
    if (Array.isArray(rawTags)) {
      logId = rawTags.find((t: any) => t.name === 'log_id')?.value ?? null
    } else if (rawTags && typeof rawTags === 'object') {
      logId = rawTags['log_id'] ?? null
    }

    console.log('log_id resolved:', logId)

    if (!logId) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no log_id tag', tags: rawTags }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { error } = await supabase
      .from('manufacturer_email_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('id', logId)
      .is('read_at', null)

    if (error) throw error

    console.log('read_at updated for log_id:', logId)

    return new Response(JSON.stringify({ ok: true, log_id: logId }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('resend-webhook error:', err)
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
