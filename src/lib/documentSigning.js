import { supabase } from './supabase'

/**
 * Genera un token único para que un fabricante firme un documento
 * @param {UUID} manufacturerId - ID del fabricante
 * @param {string} documentType - 'nda' o 'mma'
 * @returns {Promise<{token, expiresAt}>}
 */
export async function generateDocumentToken(manufacturerId, documentType) {
  if (!['nda', 'mma'].includes(documentType)) {
    throw new Error('Invalid document type')
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30) // 30 días

  const { data, error } = await supabase
    .from('manufacturer_documents')
    .insert([
      {
        manufacturer_id: manufacturerId,
        document_type: documentType,
        token_expires_at: expiresAt.toISOString(),
        is_used: false,
      },
    ])
    .select('token, token_expires_at')
    .single()

  if (error) throw error
  return data
}

/**
 * Valida un token (sin marcarlo como usado)
 * @param {UUID} token - Token del documento
 * @returns {Promise<{valid, reason, document}>}
 */
export async function validateToken(token) {
  const { data, error } = await supabase
    .from('manufacturer_documents')
    .select('*, manufacturers(company_name, email)')
    .eq('token', token)
    .single()

  if (error || !data) {
    return { valid: false, reason: 'Token not found' }
  }

  // Validar expiración
  const expiresAt = new Date(data.token_expires_at)
  const now = new Date()
  if (expiresAt < now) {
    return { valid: false, reason: 'Token has expired' }
  }

  // ponytail: un token ya usado sigue siendo válido; firmar de nuevo reemplaza la firma anterior
  return {
    valid: true,
    document: {
      id: data.id,
      manufacturerId: data.manufacturer_id,
      documentType: data.document_type,
      companyName: data.manufacturers.company_name,
      companyEmail: data.manufacturers.email,
      expiresAt: data.token_expires_at,
    },
  }
}

/**
 * Guarda la firma y marca el token como usado
 * @param {UUID} documentId - ID del documento
 * @param {string} signatureBase64 - Imagen de firma en base64
 * @param {string} signedByEmail - Email de quien firma
 * @param {string} signedByName - Nombre de quien firma (opcional)
 * @param {object} formData - Datos adicionales del formulario
 * @returns {Promise<success>}
 */
export async function saveSignature(
  documentId,
  signatureBase64,
  signedByEmail,
  signedByName = null,
  formData = {}
) {
  const signedDate = new Date().toISOString()

  const updateData = {
    signature_base64: signatureBase64,
    signed_by_email: signedByEmail,
    signed_by_name: signedByName,
    signed_date: signedDate,
    is_used: true,
    updated_at: signedDate,
  }

  // Add form data if provided
  if (formData.effectiveDate) updateData.effective_date = formData.effectiveDate
  if (formData.companyName) updateData.signer_company_name = formData.companyName
  if (formData.country) updateData.signer_country = formData.country
  if (formData.address) updateData.signer_address = formData.address
  if (formData.signerTitle) updateData.signed_by_title = formData.signerTitle

  const { data, error } = await supabase
    .from('manufacturer_documents')
    .update(updateData)
    .eq('id', documentId)
    .select('id')

  if (error) throw error
  // RLS puede filtrar la fila y devolver 0 filas sin error: eso es un fallo, no un éxito
  if (!data?.length) throw new Error('Signature was not saved (document not updatable)')
  return true
}

/**
 * Obtiene un documento firmado por ID
 * @param {UUID} documentId
 * @returns {Promise<document>}
 */
export async function getSignedDocument(documentId) {
  const { data, error } = await supabase
    .from('manufacturer_documents')
    .select('*, manufacturers(company_name, email)')
    .eq('id', documentId)
    .single()

  if (error) throw error
  return data
}

/**
 * Obtiene todos los documentos de un fabricante
 * @param {UUID} manufacturerId
 * @returns {Promise<documents>}
 */
export async function getManufacturerDocuments(manufacturerId) {
  const { data, error } = await supabase
    .from('manufacturer_documents')
    .select('*')
    .eq('manufacturer_id', manufacturerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Genera y sube el PDF firmado a Supabase Storage
 * @param {UUID} documentId
 * @param {string} documentType
 * @param {string} manufacturerId
 * @param {string} signatureBase64
 * @returns {Promise<success>}
 */
export async function generateAndUploadSignedPDF(documentId, documentType, manufacturerId, signatureBase64) {
  try {
    const { PDFDocument, rgb } = await import('pdf-lib')

    // Get signed document data
    const { data: document } = await supabase
      .from('manufacturer_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (!document) throw new Error('Document not found')

    const templatePath = documentType === 'mma' ? '/template_mma.pdf' : '/template_nda.pdf'
    const pdfRes = await fetch(templatePath)
    const pdfBytes = await pdfRes.arrayBuffer()

    const pdfDoc = await PDFDocument.load(pdfBytes)
    const form = pdfDoc.getForm()
    const fields = form.getFields()

    console.log('📄 Filling PDF fields:', fields.map(f => f.getName()))

    function fillField(name, value) {
      try {
        const field = fields.find(f => f.getName() === name)
        if (field) {
          field.setText(value || '')
          console.log(`✓ Filled "${name}" = "${value}"`)
        } else {
          console.warn(`⚠ Field not found: "${name}"`)
        }
      } catch (e) {
        console.warn(`⚠ Could not fill "${name}":`, e.message)
      }
    }

    const signedDate = new Date(document.signed_date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    const sentDate = new Date(document.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    if (documentType === 'mma') {
      fillField('fecha_firma',      sentDate)
      fillField('fecha_firma2',     sentDate)
      fillField('date_2_mma',       signedDate)
      fillField('company_name_mma', document.signer_company_name)
      fillField('country_mma',      document.signer_country)
      fillField('address_mma',      document.signer_address)
      fillField('Name',             document.signed_by_name)
      fillField('Title',            document.signed_by_title)
    } else {
      // NDA
      fillField('fecha_firma',     sentDate)
      fillField('fecha_firma2',    sentDate)
      fillField('Date_2',          signedDate)
      fillField('company_name_nda', document.signer_company_name)
      // name_title_nda is a combined field
      const nameTitle = [document.signed_by_name, document.signed_by_title].filter(Boolean).join(' / ')
      fillField('name_title_nda',  nameTitle)
    }

    const pages = pdfDoc.getPages()

    // Embed signature image
    const base64Data = signatureBase64.split(',')[1]
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const signatureImage = await pdfDoc.embedPng(bytes)

    // Determine the signature field name per document type
    const sigFieldName = documentType === 'mma' ? 'signature_mma' : 'signature_nda'

    let sigPlaced = false

    if (sigFieldName) {
      try {
        const sigField = form.getField(sigFieldName)
        const widgets = sigField.acroField.getWidgets()
        if (widgets.length > 0) {
          const rect = widgets[0].getRectangle()

          // Find which page contains this widget
          let targetPage = pages[pages.length - 1]
          for (let i = 0; i < pages.length; i++) {
            const annots = pages[i].node.Annots()
            if (annots) {
              for (const ref of annots.asArray()) {
                if (ref === widgets[0].ref) {
                  targetPage = pages[i]
                  break
                }
              }
            }
          }

          console.log(`✓ Placing signature in "${sigFieldName}" at x:${Math.round(rect.x)} y:${Math.round(rect.y)} w:${Math.round(rect.width)} h:${Math.round(rect.height)}`)
          targetPage.drawImage(signatureImage, {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          })
          sigPlaced = true
        }
      } catch (e) {
        console.warn(`Could not place signature in "${sigFieldName}":`, e.message)
      }
    }

    // Fallback: bottom-right of last page
    if (!sigPlaced) {
      const lastPage = pages[pages.length - 1]
      const { width } = lastPage.getSize()
      lastPage.drawImage(signatureImage, {
        x: width - 220,
        y: 80,
        width: 180,
        height: 70,
      })
    }

    // Flatten form to make PDF non-editable
    form.flatten()

    const pdfBytes2 = await pdfDoc.save()
    const blob = new Blob([pdfBytes2], { type: 'application/pdf' })

    // Upload to Supabase Storage
    const companySlug = (document.signer_company_name || '')
      .trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase() || 'unsigned'
    const fileName = `${companySlug}_${documentType}_${documentId}.pdf`
    const filePath = `${manufacturerId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('signed_documents')
      .upload(filePath, blob, { upsert: true })

    if (uploadError) throw uploadError
    console.log('✓ PDF uploaded to storage')
    return true
  } catch (err) {
    console.error('Error generating signed PDF:', err)
    throw err
  }
}
