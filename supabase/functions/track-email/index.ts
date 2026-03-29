import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const pixel = atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
const pixelUint8 = new Uint8Array(Array.from(pixel).map(c => c.charCodeAt(0)));

serve(async (req: Request) => {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (id) {
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error } = await supabaseService
      .from('manufacturer_email_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .is('read_at', null) 

    if (error) console.error('Error actualizando log:', error)
  }

  return new Response(pixelUint8, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    },
  })
})