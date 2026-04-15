<template>
  <div class="testing-container">
    <div class="card">
      <div class="header">
        <div class="status-pill">SIINGE STUDIO</div>
        <h1>Digital Signature</h1>
        <p class="subtitle">Please review the document, fill in your details, and sign.</p>
      </div>

      <div class="tab-group">
        <button 
          @click="activeDoc = 'nda'" 
          :class="{ active: activeDoc === 'nda' }"
        >NDA (Non-Disclosure Agreement)</button>
        <button 
          @click="activeDoc = 'mma'" 
          :class="{ active: activeDoc === 'mma' }"
        >MMA (Master Manufacturing Agreement)</button>
      </div>

      <div class="pdf-viewer-container">
        <div class="viewer-header">
          <span>Document Preview <span v-if="previewLoading" class="loading-text">(Cargando vista segura...)</span></span>
          <a v-if="!previewLoading" :href="previewUrl" target="_blank" class="link-open">Open in new tab ↗</a>
        </div>
        
        <iframe 
          v-if="!previewLoading"
          :src="previewUrl + '#toolbar=0&navpanes=0'" 
          class="pdf-frame"
          title="Document Preview"
        ></iframe>
        <div v-else class="pdf-frame skeleton-loader"></div>
      </div>

      <div class="form-section">
        <div class="input-group">
          <label>Legal Company Name:</label>
          <input v-model="formData.companyName" type="text" placeholder="e.g., Global Textiles Inc." />
        </div>
        
        <div class="row">
          <div class="input-group half">
            <label>Representative Name:</label>
            <input v-model="formData.signerName" type="text" placeholder="Full Name" />
          </div>
          <div class="input-group half">
            <label>Title:</label>
            <input v-model="formData.signerTitle" type="text" placeholder="e.g., CEO, Founder" />
          </div>
        </div>

        <template v-if="activeDoc === 'mma'">
          <div class="row">
            <div class="input-group half">
              <label>Country:</label>
              <input v-model="formData.country" type="text" placeholder="e.g., United States" />
            </div>
            <div class="input-group half">
              <label>Address:</label>
              <input v-model="formData.address" type="text" placeholder="Full Address" />
            </div>
          </div>
        </template>
      </div>

      <div class="signature-section">
        <div class="label-row">
          <label>Authorized Signature:</label>
          <button @click="clearPad" class="btn-clear">Clear pad</button>
        </div>
        <div class="canvas-container">
          <canvas 
            ref="signaturePad"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @touchstart="handleTouch"
            @touchmove="handleTouch"
            @touchend="stopDrawing"
          ></canvas>
        </div>
      </div>

      <button 
        @click="generateDocument" 
        :disabled="loading || !isFormValid" 
        class="btn-submit"
      >
        <span v-if="!loading">SIGN AND DOWNLOAD PDF</span>
        <span v-else>GENERATING & SAVING...</span>
      </button>

      <div v-if="success" class="success-box">
        <p>✅ Document generated successfully!</p>
        <p class="small">A copy has been saved to your downloads and synced to our secure drive.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch, nextTick } from 'vue'
import { PDFDocument } from 'pdf-lib'

// ID Fijo temporal para pruebas
const TARGET_ID = '0942abd4-cccd-443f-985f-f29f4c1212f9'
// URL de tu NUEVO Webhook en Make.com
const WEBHOOK_URL = 'https://hook.us2.make.com/iu8tlpynkaut9d3e3vrxf2bllt5qjyvb'

const activeDoc = ref('nda')
const loading = ref(false)
const success = ref(false)

// --- VARIABLES PARA LA VISTA PREVIA DE SOLO LECTURA ---
const previewUrl = ref('')
const previewLoading = ref(true)

const formData = reactive({
  companyName: '',
  signerName: '',
  signerTitle: '',
  country: '',
  address: ''
})

const isFormValid = computed(() => {
  if (activeDoc.value === 'nda') {
    return formData.companyName && formData.signerName && formData.signerTitle
  } else {
    return formData.companyName && formData.signerName && formData.signerTitle && formData.country && formData.address
  }
})

const signaturePad = ref(null)
let ctx = null
let drawing = false

// --- FUNCIÓN PARA GENERAR EL PDF DE SOLO LECTURA (FLATTEN) ---
const loadReadOnlyPreview = async () => {
  previewLoading.value = true
  try {
    const pdfUrl = activeDoc.value === 'nda' ? '/template_nda.pdf' : '/template_mma.pdf'
    
    // Obtenemos el PDF original
    const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    
    // LA MAGIA: Aplana el formulario. Convierte los campos en "dibujo" estático
    const form = pdfDoc.getForm()
    form.flatten()
    
    // Guardamos el resultado de solo lectura y creamos una URL local (Blob)
    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    
    // Limpiamos la URL anterior para no saturar la memoria del navegador
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    
    previewUrl.value = URL.createObjectURL(blob)
  } catch (err) {
    console.error("Error cargando vista previa segura:", err)
  } finally {
    previewLoading.value = false
  }
}

onMounted(async () => {
  // Inicializamos el Canvas
  ctx = signaturePad.value.getContext('2d')
  ctx.lineWidth = 15 
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#000000'
  ctx.shadowBlur = 1
  ctx.shadowColor = '#000000'

  const rect = signaturePad.value.getBoundingClientRect()
  signaturePad.value.width = rect.width
  signaturePad.value.height = rect.height

  // Cargamos la primera vista previa
  await loadReadOnlyPreview()
})

// Cuando cambian de pestaña, actualizamos la vista previa segura
watch(activeDoc, async () => {
  success.value = false
  clearPad()
  await loadReadOnlyPreview()
})

const startDrawing = (e) => { drawing = true; draw(e); }
const stopDrawing = () => { drawing = false; ctx.beginPath(); }
const draw = (e) => {
  if (!drawing) return
  const rect = signaturePad.value.getBoundingClientRect()
  const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left
  const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
  ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
}
const handleTouch = (e) => { e.preventDefault(); draw(e); }
const clearPad = () => ctx.clearRect(0, 0, signaturePad.value.width, signaturePad.value.height)

const fillField = (form, fieldName, value) => {
  try {
    const field = form.getTextField(fieldName)
    if (field) field.setText(value)
  } catch (error) {
    console.warn(`Could not fill field: ${fieldName}`)
  }
}

const generateDocument = async () => {
  loading.value = true
  success.value = false
  
  try {
    const d = new Date()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const year = d.getFullYear()
    const formattedDate = `${month}/${day}/${year}`
    
    // ATENCIÓN: Usamos el archivo ORIGINAL para rellenar los datos, NO la vista previa aplanada
    const pdfUrl = activeDoc.value === 'nda' ? '/template_nda.pdf' : '/template_mma.pdf'
    
    const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const form = pdfDoc.getForm()

    if (activeDoc.value === 'mma') {
      fillField(form, 'fecha_firma', formattedDate)
      fillField(form, 'company_name_mma', formData.companyName)
      fillField(form, 'country_mma', formData.country)
      fillField(form, 'address_mma', formData.address)
      fillField(form, 'fecha_firma2', formattedDate)
      fillField(form, 'Name', formData.signerName)
      fillField(form, 'Title', formData.signerTitle)
      fillField(form, 'date_2_mma', formattedDate)
    } else {
      fillField(form, 'fecha_firma', formattedDate)
      fillField(form, 'company_name_nda', formData.companyName)
      fillField(form, 'fecha_firma2', formattedDate)
      fillField(form, 'name_title_nda', `${formData.signerName} - ${formData.signerTitle}`)
      fillField(form, 'Date_2', formattedDate)
    }

    const signatureImage = signaturePad.value.toDataURL('image/png')
    const pngImg = await pdfDoc.embedPng(signatureImage)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1] 
    
    const sigFieldName = activeDoc.value === 'nda' ? 'signature_nda' : 'signature_mma'
    
    let drawX = 150
    let drawY = 180
    let drawW = 180
    let drawH = 70
    
    try {
      let sigField = null
      
      try {
        sigField = form.getSignature(sigFieldName)
      } catch (err) {
        sigField = form.getTextField(sigFieldName)
      }
      
      const widgets = sigField.acroField.getWidgets()
      
      if (widgets.length > 0) {
        const rect = widgets[0].getRectangle()
        
        const imgRatio = pngImg.width / pngImg.height
        const boxRatio = rect.width / rect.height
        
        if (imgRatio > boxRatio) {
          drawW = rect.width
          drawH = rect.width / imgRatio
        } else {
          drawH = rect.height
          drawW = rect.height * imgRatio
        }
        
        drawX = rect.x + (rect.width - drawW) / 2
        drawY = rect.y + (rect.height - drawH) / 2
        
        form.removeField(sigFieldName)
      }
    } catch (e) {
      console.warn("Signature field not found. Make sure the name matches in Acrobat.", e)
    }

    lastPage.drawImage(pngImg, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    })

    form.flatten()
    const pdfBytes = await pdfDoc.save()

    // 1. PREPARAMOS EL NOMBRE DEL ARCHIVO
    const cleanCompanyName = formData.companyName.replace(/\s+/g, '_')
    const finalFileName = `SIGNED-${activeDoc.value.toUpperCase()}-${cleanCompanyName}.pdf`

    // 2. DESCARGAMOS EL ARCHIVO LOCALMENTE
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = finalFileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 3. ENVIAMOS A MAKE.COM
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)))
    
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        manufacturerId: TARGET_ID,
        documentType: activeDoc.value.toUpperCase(),
        fileName: finalFileName,
        fileBase64: pdfBase64
      })
    })

    if (!webhookResponse.ok) {
      throw new Error("Failed to send data to Make.com")
    }

    success.value = true

  } catch (err) {
    console.error(err)
    alert('Error generating document: ' + err.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.testing-container { min-height: 100vh; background: #0f172a; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: 'Inter', sans-serif; }
.card { background: #1e293b; width: 100%; max-width: 500px; padding: 2rem; border-radius: 24px; border: 1px solid #334155; color: white; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
.header { text-align: center; margin-bottom: 20px; }
.status-pill { display: inline-block; background: #0f172a; color: #38bdf8; font-size: 10px; font-weight: 800; padding: 6px 14px; border-radius: 50px; margin-bottom: 12px; border: 1px solid #0284c7; letter-spacing: 0.5px; }
h1 { font-size: 1.6rem; margin: 0; font-weight: 800; color: #f8fafc; }
.subtitle { color: #94a3b8; font-size: 0.85rem; margin-top: 8px; }

.tab-group { display: flex; gap: 8px; margin-bottom: 20px; background: #0f172a; padding: 6px; border-radius: 14px; }
.tab-group button { flex: 1; padding: 10px; border-radius: 10px; border: none; background: transparent; color: #64748b; cursor: pointer; font-weight: 700; transition: 0.3s; font-size: 0.9rem; }
.tab-group button.active { background: #38bdf8; color: #0f172a; }

.pdf-viewer-container { background: #0f172a; border-radius: 16px; border: 1px solid #334155; overflow: hidden; margin-bottom: 20px; display: flex; flex-direction: column; }
.viewer-header { background: #1e293b; padding: 8px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; font-size: 0.75rem; font-weight: 600; color: #94a3b8; }
.loading-text { color: #38bdf8; font-style: italic; margin-left: 5px; }
.link-open { color: #38bdf8; text-decoration: none; transition: 0.2s; }
.link-open:hover { color: #7dd3fc; }

.pdf-frame { width: 100%; height: 250px; border: none; background: white; }
.skeleton-loader { background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%); background-size: 200% 100%; animation: skeletonLoading 1.5s infinite; }
@keyframes skeletonLoading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.form-section { text-align: left; margin-bottom: 20px; background: #0f172a; padding: 20px; border-radius: 16px; border: 1px solid #334155; }
.row { display: flex; gap: 15px; }
.half { flex: 1; }
.input-group { margin-bottom: 15px; }
.input-group label { display: block; font-size: 0.75rem; color: #94a3b8; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; }
.input-group input { width: 100%; background: #1e293b; border: 1px solid #475569; padding: 12px; border-radius: 10px; color: white; outline: none; transition: 0.2s; box-sizing: border-box; }
.input-group input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }

.signature-section { background: #0f172a; padding: 15px; border-radius: 16px; border: 1px solid #334155; }
.label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.label-row label { font-size: 0.75rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; }
.btn-clear { background: none; border: none; color: #ef4444; font-size: 0.75rem; font-weight: 700; cursor: pointer; padding: 0; }

.canvas-container { background: #f8fafc; border-radius: 10px; overflow: hidden; border: 2px dashed #cbd5e1; }
canvas { width: 100%; height: 120px; cursor: crosshair; display: block; }

.btn-submit { width: 100%; background: #f8fafc; color: #0f172a; border: none; padding: 1.2rem; border-radius: 14px; font-weight: 800; margin-top: 20px; cursor: pointer; transition: 0.2s; font-size: 0.95rem; }
.btn-submit:hover:not(:disabled) { background: #38bdf8; color: white; transform: translateY(-2px); }
.btn-submit:disabled { opacity: 0.4; cursor: not-allowed; }

.success-box { margin-top: 20px; padding: 15px; border-radius: 14px; background: rgba(56, 189, 248, 0.1); border: 1px solid #0284c7; text-align: center; }
.success-box p { color: #38bdf8; font-weight: 700; margin: 0; }
.success-box .small { font-size: 0.75rem; color: #7dd3fc; margin-top: 6px; font-weight: normal; }
</style>