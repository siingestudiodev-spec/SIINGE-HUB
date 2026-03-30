import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { manufacturerId, fileName, fileBase64 } = await req.json()
    const folderId = "1J7drSFMhFn88SiFahs9YXj8B9zCUWmpW" // Tu carpeta de Drive

    // 1. Obtener el JWT de Google usando el secreto que guardamos
    const credentials = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || '{}')
    
    // NOTA: Para producción real usarías una librería de Google Auth. 
    // Por ahora, validamos el flujo de guardado en base de datos.
    console.log(`Subiendo ${fileName} a la carpeta ${folderId}...`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Simulamos el ID de Drive para la prueba
    const fileIdInDrive = "FILE_" + Math.random().toString(36).substr(2, 9)
    const finalUrl = `https://drive.google.com/file/d/${fileIdInDrive}/view`

    // 2. Actualizamos la base de datos con el link
    const { error: dbError } = await supabase
      .from('manufacturers')
      .update({ nda_drive_link: finalUrl })
      .eq('id', manufacturerId)

    if (dbError) throw dbError

    return new Response(
      JSON.stringify({ success: true, url: finalUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})