import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { manufacturerId, fileName, fileBase64 } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Procesando archivo para: ${manufacturerId}`)

    // Por ahora, simulamos el link de Drive para validar que la conexión funciona
    const mockDriveLink = `https://drive.google.com/file/d/LOGRADO_EXITOSAMENTE/view`
    
    await supabaseClient
      .from('manufacturers')
      .update({ nda_drive_link: mockDriveLink })
      .eq('id', manufacturerId)

    return new Response(
      JSON.stringify({ success: true, url: mockDriveLink }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})