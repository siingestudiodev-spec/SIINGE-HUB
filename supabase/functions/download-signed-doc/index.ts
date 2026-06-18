// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  // Allow CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  const url = new URL(req.url)
  const documentId = url.searchParams.get('id')

  if (!documentId) {
    return new Response('Missing document id', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Verify document exists and is signed
  const { data: doc, error: docErr } = await supabase
    .from('manufacturer_documents')
    .select('id, manufacturer_id, document_type, is_used, signer_company_name')
    .eq('id', documentId)
    .eq('is_used', true)
    .single()

  if (docErr || !doc) {
    return new Response('Document not found or not signed', { status: 404 })
  }

  const companySlug = (doc.signer_company_name || '')
    .trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase() || 'unsigned'
  const newPath = `${doc.manufacturer_id}/${companySlug}_${doc.document_type}_${doc.id}.pdf`
  const oldPath = `${doc.manufacturer_id}/${doc.document_type}_${doc.id}.pdf`

  // Try new path, fall back to old
  let { data: file, error: fileErr } = await supabase.storage.from('signed_documents').download(newPath)
  if (fileErr || !file) {
    const legacy = await supabase.storage.from('signed_documents').download(oldPath)
    file = legacy.data
    fileErr = legacy.error
  }

  if (fileErr || !file) {
    return new Response('File not found in storage', { status: 404 })
  }

  const fileName = `${doc.document_type.toUpperCase()}_signed_${companySlug}.pdf`

  return new Response(file, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Access-Control-Allow-Origin': '*',
    },
  })
})
