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

    if (event.type !== 'email.opened') {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const tags: { name: string; value: string }[] = event.data?.tags ?? []
    const logTag = tags.find(t => t.name === 'log_id')

    if (!logTag?.value) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no log_id tag' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { error } = await supabase
      .from('manufacturer_email_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('id', logTag.value)
      .is('read_at', null)

    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
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
