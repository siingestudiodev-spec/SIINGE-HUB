<template>
  <div class="portal-container">
    <!-- HEADER -->
    <div class="portal-header">
      <div class="header-content">
        <h1>{{ t.title }}</h1>
        <p class="subtitle">{{ t.subtitle }} {{ documentType.toUpperCase() }}</p>
      </div>
    </div>

    <!-- LOADING STATE -->
    <div v-if="loading" class="portal-body loading-state">
      <div class="spinner"></div>
    </div>

    <!-- ERROR STATE -->
    <div v-else-if="error" class="portal-body error-state">
      <div class="error-icon">⚠️</div>
      <h2>Unable to Access Document</h2>
      <p>{{ error }}</p>
    </div>

    <!-- SUCCESS STATE (Already signed) -->
    <div v-else-if="isAlreadySigned" class="portal-body success-state">
      <div class="success-icon">✅</div>
      <h2>Document Already Signed</h2>
      <p>{{ formatDate(signedDate) }}</p>
    </div>

    <!-- SIGNING STATE -->
    <div v-else-if="!loading && document" class="portal-body signing-state">
      <div class="signing-container">

        <!-- PDF VIEWER -->
        <div class="pdf-section">
          <div class="pdf-preview">
            <iframe :src="pdfUrl" class="pdf-frame" title="Document Preview"></iframe>
          </div>
          <p class="expiration-info">⏰ {{ t.expires }} {{ formatDate(document.expiresAt) }}</p>
        </div>

        <!-- FORM SECTION -->
        <div class="form-section" v-if="!submitted">
          <h3>{{ t.formTitle }}</h3>

          <div class="form-grid">
            <div class="form-group">
              <label>{{ t.companyName }} *</label>
              <input v-model="formData.companyName" type="text" class="form-input" required />
            </div>

            <template v-if="documentType === 'mma'">
              <div class="form-group">
                <label>{{ t.country }} *</label>
                <input v-model="formData.country" type="text" class="form-input" required />
              </div>
              <div class="form-group full-width">
                <label>{{ t.address }} *</label>
                <textarea v-model="formData.address" class="form-input" rows="2" required></textarea>
              </div>
            </template>

            <div class="form-group">
              <label>{{ t.signerName }} *</label>
              <input v-model="formData.signerName" type="text" class="form-input" required />
            </div>

            <div class="form-group">
              <label>{{ t.signerTitle }} *</label>
              <input v-model="formData.signerTitle" type="text" class="form-input" required />
            </div>
          </div>

          <div class="signature-group">
            <label>{{ t.signature }} *</label>
            <p class="signature-hint">{{ t.signatureHint }}</p>
            <SignatureCanvas ref="signatureCanvas" @signature-captured="handleSignatureCapture" />
          </div>

          <button @click="submitSignature" :disabled="!canSubmit || submitting" class="btn-sign">
            {{ submitting ? t.submitting : t.signBtn }}
          </button>
        </div>

        <!-- SUCCESS AFTER SIGNING -->
        <div v-else class="success-section">
          <div class="success-icon-large">✅</div>
          <h2>{{ t.successTitle }}</h2>
          <p>{{ t.successMsg }}</p>
          <div class="success-details">
            <h4>{{ t.signedInfo }}</h4>
            <div class="detail-row"><span class="label">{{ t.company }}:</span><span class="value">{{ formData.companyName }}</span></div>
            <div class="detail-row"><span class="label">{{ t.signer }}:</span><span class="value">{{ formData.signerName }}</span></div>
            <div class="detail-row"><span class="label">{{ t.titleLabel }}:</span><span class="value">{{ formData.signerTitle }}</span></div>
            <div v-if="documentType === 'mma'" class="detail-row"><span class="label">{{ t.countryLabel }}:</span><span class="value">{{ formData.country }}</span></div>
          </div>
          <p style="color:var(--text-muted);font-size:0.85rem;margin-top:1rem;">{{ t.successEmail }} <strong>{{ document.companyEmail }}</strong></p>
          <p style="color:var(--text-muted);font-size:0.8rem;margin-top:0.5rem;">{{ t.successClose }}</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { PDFDocument, rgb } from 'pdf-lib'
import SignatureCanvas from '../components/SignatureCanvas.vue'
import { validateToken, saveSignature, generateAndUploadSignedPDF } from '../lib/documentSigning'
import { supabase } from '../lib/supabase'

const route = useRoute()
const signatureCanvas = ref(null)
const lang = computed(() => route.query.lang === 'es' ? 'es' : 'en')

const t = computed(() => {
  const es = {
    title: 'Portal de Firma de Documentos',
    subtitle: 'Firma tu',
    formTitle: 'Información Requerida',
    formHint: 'Por favor complete la información requerida antes de firmar.',
    companyName: 'Nombre de la Empresa',
    country: 'País / Jurisdicción',
    address: 'Dirección Registrada',
    signerName: 'Nombre Completo del Firmante',
    signerTitle: 'Puesto / Cargo',
    signature: 'Su Firma',
    signatureHint: 'Firme abajo con su ratón o pantalla táctil',
    signBtn: 'Firmar y Enviar',
    submitting: 'Enviando...',
    successTitle: '¡Gracias!',
    successMsg: 'Su documento ha sido firmado exitosamente.',
    successEmail: 'Una copia firmada ha sido enviada a',
    successClose: 'Puede cerrar esta ventana ahora.',
    signedInfo: 'Información de Firma',
    company: 'Empresa',
    signer: 'Firmante',
    titleLabel: 'Puesto',
    countryLabel: 'País',
    expires: 'Este enlace expira el',
  }
  const en = {
    title: 'Document Signing Portal',
    subtitle: 'Sign your',
    formTitle: 'Required Information',
    formHint: 'Please fill in the required information below before signing.',
    companyName: 'Company Name',
    country: 'Country / Jurisdiction',
    address: 'Registered Address',
    signerName: 'Signer Full Name',
    signerTitle: 'Title / Position',
    signature: 'Your Signature',
    signatureHint: 'Sign below with your mouse or touchscreen',
    signBtn: 'Sign & Submit',
    submitting: 'Submitting...',
    successTitle: 'Thank You!',
    successMsg: 'Your document has been signed successfully.',
    successEmail: 'A signed copy has been sent to',
    successClose: 'You can close this window now.',
    signedInfo: 'Signed Information',
    company: 'Company',
    signer: 'Signer',
    titleLabel: 'Title',
    countryLabel: 'Country',
    expires: 'This link expires on',
  }
  return lang.value === 'es' ? es : en
})

const pdfUrl = ref('')

const formatDateForPDF = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const MMA_SEND_DATE_FIELDS = ['fecha_firma', 'fecha_firma2']
const NDA_SEND_DATE_FIELDS = ['fecha_firma', 'fecha_firma2']

function fillFieldSafe(form, fieldName, value) {
  try {
    const field = form.getFields().find(f => f.getName() === fieldName)
    if (field) {
      field.setText(value)
      console.log(`✓ Preview filled "${fieldName}" = "${value}"`)
    } else {
      console.warn(`⚠ Preview field not found: "${fieldName}"`)
    }
  } catch (e) {
    console.warn(`⚠ Could not fill "${fieldName}":`, e.message)
  }
}

async function generatePDFWithDate(documentType, sendDate) {
  try {
    const templatePath = documentType === 'mma' ? '/template_mma.pdf' : '/template_nda.pdf'
    const pdfRes = await fetch(templatePath)
    const pdfBytes = await pdfRes.arrayBuffer()

    const pdfDoc = await PDFDocument.load(pdfBytes)
    const dateStr = formatDateForPDF(sendDate)
    const form = pdfDoc.getForm()

    const sendDateFields = documentType === 'mma' ? MMA_SEND_DATE_FIELDS : NDA_SEND_DATE_FIELDS
    for (const name of sendDateFields) {
      fillFieldSafe(form, name, dateStr)
    }

    // Flatten so it's read-only in the preview
    form.flatten()

    const modifiedPdfBytes = await pdfDoc.save()
    const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' })
    const blobUrl = URL.createObjectURL(blob)
    return `${blobUrl}#toolbar=0&navpanes=0`
  } catch (err) {
    console.error('Error generating PDF with date:', err)
    // Fallback to original PDF if generation fails
    const templatePath = documentType === 'mma' ? '/template_mma.pdf' : '/template_nda.pdf'
    return `${templatePath}#toolbar=0&zoom=100`
  }
}

const loading = ref(true)
const error = ref(null)
const document = ref(null)
const documentType = ref('')
const capturedSignature = ref(null)
const submitted = ref(false)
const submitting = ref(false)
const signedDate = ref(null)
const isAlreadySigned = ref(false)

const formData = ref({
  companyName: '',
  country: '',
  address: '',
  signerName: '',
  signerTitle: ''
})

const canSubmit = computed(() => {
  return (
    capturedSignature.value &&
    formData.value.companyName &&
    formData.value.signerName &&
    formData.value.signerTitle &&
    (documentType.value !== 'mma' || (formData.value.country && formData.value.address))
  )
})

onMounted(async () => {
  const token = route.query.token
  if (!token) {
    error.value = 'No signing token provided in URL'
    loading.value = false
    return
  }

  try {
    const validation = await validateToken(token)

    if (!validation.valid) {
      error.value = validation.reason
      loading.value = false
      return
    }

    if (validation.document) {
      document.value = validation.document
      documentType.value = validation.document.documentType

      // Check if already signed
      const { data } = await supabase
        .from('manufacturer_documents')
        .select('signed_date, is_used, created_at')
        .eq('token', token)
        .single()

      if (data && data.is_used) {
        isAlreadySigned.value = true
        signedDate.value = data.signed_date
      }

      // Generate PDF with date
      const sendDate = data?.created_at || new Date().toISOString()
      pdfUrl.value = await generatePDFWithDate(documentType.value, sendDate)
    }
  } catch (err) {
    console.error('Token validation error:', err)
    error.value = 'An error occurred while validating your access'
  } finally {
    loading.value = false
  }
})

function handleSignatureCapture(signatureBase64) {
  capturedSignature.value = signatureBase64
}

async function submitSignature() {
  if (!canSubmit.value) return

  submitting.value = true
  try {
    // Save signature with form data
    await saveSignature(
      document.value.id,
      capturedSignature.value,
      document.value.companyEmail,
      formData.value.signerName,
      {
        companyName: formData.value.companyName,
        country: formData.value.country,
        address: formData.value.address,
        signerTitle: formData.value.signerTitle
      }
    )

    // Mark NDA/MMA as signed on the manufacturer record
    const signedField = documentType.value === 'nda' ? 'nda_signed' : 'mma_signed'
    await supabase
      .from('manufacturers')
      .update({ [signedField]: true })
      .eq('id', document.value.manufacturerId)

    // Log the signing event
    await supabase.from('manufacturer_email_logs').insert([{
      manufacturer_id: document.value.manufacturerId,
      template_name: `${documentType.value.toUpperCase()} signed by ${formData.value.signerName || document.value.companyEmail}`,
      sent_at: new Date().toISOString(),
    }])

    // Generate and upload signed PDF
    await generateAndUploadSignedPDF(
      document.value.id,
      documentType.value,
      document.value.manufacturerId,
      capturedSignature.value
    )

    // Send confirmation email with download link
    await generateAndSendSignedPDF()

    // Notify SIINGE team
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-document-signed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_type: documentType.value,
        document_id: document.value.id,
        manufacturer_id: document.value.manufacturerId,
        manufacturer_name: document.value.companyName,
        company_name: formData.value.companyName,
        signer_name: formData.value.signerName,
        signer_email: document.value.companyEmail,
      }),
    }).catch(() => {})

    submitted.value = true
  } catch (err) {
    console.error('Error saving signature:', err)
    error.value = 'An error occurred while saving your signature. Please try again.'
  } finally {
    submitting.value = false
  }
}

async function generateAndSendSignedPDF() {
  try {
    const emailRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-signed-doc-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: document.value.id,
        document_type: documentType.value,
        signer_email: document.value.companyEmail,
        signer_name: formData.value.signerName,
        company_name: formData.value.companyName,
        language: lang.value,
      }),
    })

    if (!emailRes.ok) {
      console.warn('Email sending failed, but signature was saved')
    }
  } catch (err) {
    console.warn('Could not send confirmation email:', err)
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<style scoped>
.portal-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  flex-direction: column;
}

.portal-header {
  background: white;
  border-bottom: 1px solid #e5e7eb;
  padding: 2rem 1.5rem;
  text-align: center;
}

.header-content h1 {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

.subtitle {
  color: var(--text-muted);
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
}

.portal-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
}

/* LOADING STATE */
.loading-state {
  flex-direction: column;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ERROR STATE */
.error-state {
  flex-direction: column;
  gap: 1rem;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  max-width: 400px;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
}

.error-state h2 {
  color: var(--text-main);
  margin: 0;
}

.error-state p {
  color: var(--text-muted);
  margin: 0.5rem 0;
}

.error-hint {
  font-size: 0.85rem;
  color: #999;
}

/* SUCCESS STATE */
.success-state {
  flex-direction: column;
  gap: 1rem;
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  max-width: 400px;
  text-align: center;
}

.success-icon {
  font-size: 3rem;
}

.success-state h2 {
  color: var(--text-main);
  margin: 0;
}

.success-state p {
  color: var(--text-muted);
  margin: 0.5rem 0;
}

.success-hint {
  font-size: 0.85rem;
  color: #999;
}

.success-icon-large {
  font-size: 4rem;
  margin-bottom: 1rem;
}

/* SIGNING STATE */
.signing-state {
  width: 100%;
  max-width: 100%;
  align-self: flex-start;
}

.signing-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  background: white;
  border-radius: 0;
  padding: 2rem;
  box-shadow: none;
  width: 100%;
}

.pdf-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pdf-section h3 {
  font-size: 1.1rem;
  color: var(--text-main);
  margin: 0;
  font-weight: 600;
}

.pdf-preview {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
  height: 1100px;
}

.pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}


.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.form-section h3 {
  font-size: 1rem;
  color: var(--text-main);
  margin: 0 0 0.25rem;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.form-grid .full-width {
  grid-column: 1 / -1;
}

.form-hint {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.form-group label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-input {
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--border-main);
  border-radius: 6px;
  font-size: 0.85rem;
  box-sizing: border-box;
  font-family: inherit;
  width: 100%;
}

.form-input:focus {
  border-color: var(--primary);
  outline: none;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
}

.signature-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.signature-group label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.signature-hint {
  color: var(--text-muted);
  font-size: 0.75rem;
  margin: 0;
}

.btn-sign {
  width: 100%;
  padding: 0.8rem 1.5rem;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: auto;
}

.btn-sign:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-section {
  text-align: center;
  padding: 2rem;
}

.success-section h2 {
  color: var(--text-main);
  margin: 1rem 0 0.5rem;
  font-size: 1.5rem;
}

.success-section p {
  color: var(--text-muted);
  margin: 0.5rem 0;
}

.success-details {
  background: var(--bg-app);
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  text-align: left;
}

.success-details h4 {
  color: var(--text-main);
  margin: 0 0 1rem;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border-light);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row .label {
  font-weight: 600;
  color: var(--text-muted);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-row .value {
  color: var(--text-main);
  font-weight: 500;
}

.expiration-info {
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  text-align: center;
  color: #1e40af;
  font-size: 0.85rem;
  margin-top: auto;
}

@media (max-width: 1200px) {
  .pdf-preview {
    height: 900px;
  }

  .signing-container {
    padding: 2rem 2rem;
  }
}

@media (max-width: 768px) {
  .pdf-preview {
    height: 600px;
  }

  .signing-container {
    padding: 1.5rem 1rem;
  }
}
</style>
