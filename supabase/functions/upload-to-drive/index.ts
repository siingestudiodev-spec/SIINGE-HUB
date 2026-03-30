import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejo de CORS para llamadas desde el navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { manufacturerId, fileName, fileBase64 } = await req.json()
    
    // Configuración con tus datos reales
    const FOLDER_ID = "1J7drSFMhFn88SiFahs9YXj8B9zCUWmpW"
    
    console.log(`>>> Iniciando proceso para fabricante: ${manufacturerId}`)

    // 1. Inicializar Supabase con Service Role (para saltar RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Generar un ID de simulación para el archivo (Mientras terminas OAuth de Google)
    const mockFileId = `SIGNED_${Date.now()}`
    const driveLink = `https://drive.google.com/drive/folders/${FOLDER_ID}`

    // 3. ACTUALIZAR LA BASE DE DATOS
    // Esto es lo más importante: que el link quede guardado en el fabricante
    const { data, error: dbError } = await supabaseAdmin
      .from('manufacturers')
      .update({ 
        nda_drive_link: driveLink,
        // Opcional: puedes guardar la fecha de firma si tienes la columna
      })
      .eq('id', manufacturerId)
      .select()

    if (dbError) {
      console.error("Error actualizando DB:", dbError)
      throw new Error(`Error en Base de Datos: ${dbError.message}`)
    }

    console.log(`>>> DB Actualizada con éxito para: ${manufacturerId}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Firma procesada y registrada", 
        url: driveLink 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Error crítico en la función:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})