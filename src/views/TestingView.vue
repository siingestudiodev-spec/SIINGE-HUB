<template>
  <div class="testing-container">
    <div class="card">
      <div class="header">
        <div class="status-pill">SMART-FILL + AUTO-COORDINATES</div>
        <h1>Digital Signature</h1>
        <p class="subtitle">Fill in the details and download your signed document.</p>
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
        <span v-else>GENERATING DOCUMENT...</span>
      </button>

      <div v-if="success" class="success-box">
        <p>✅ Document generated successfully!</p>
        <p class="small">Check your downloads folder.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue'
import { PDFDocument } from 'pdf-lib'

const activeDoc = ref('nda')
const loading = ref(false)
const success = ref(false)

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

onMounted(() => {
  ctx = signaturePad.value.getContext('2d')
  ctx.lineWidth = 7.5 // <--- Aquí triplicamos el grosor del trazo
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#000000'
  const rect = signaturePad.value.getBoundingClientRect()
  signaturePad.value.width = rect.width
  signaturePad.value.height = rect.height
})

watch(activeDoc, () => {
  success.value = false
  clearPad()
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
    const today = new Date().toLocaleDateString('en-US') 
    const pdfUrl = activeDoc.value === 'nda' ? '/template_nda.pdf' : '/template_mma.pdf'
    
    const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const form = pdfDoc.getForm()

    // 1. Fill text fields
    if (activeDoc.value === 'mma') {
      fillField(form, 'fecha_firma', today)
      fillField(form, 'company_name_mma', formData.companyName)
      fillField(form, 'country_mma', formData.country)
      fillField(form, 'address_mma', formData.address)
      fillField(form, 'fecha_firma2', today)
      fillField(form, 'Name', formData.signerName)
      fillField(form, 'Title', formData.signerTitle)
      fillField(form, 'date_2_mma', today)
    } else {
      fillField(form, 'fecha_firma', today)
      fillField(form, 'company_name_nda', formData.companyName)
      fillField(form, 'fecha_firma2', today)
      fillField(form, 'name_title_nda', `${formData.signerName} - ${formData.signerTitle}`)
      fillField(form, 'Date_2', today)
    }

    // 2. Prepare signature image
    const signatureImage = signaturePad.value.toDataURL('image/png')
    const pngImg = await pdfDoc.embedPng(signatureImage)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1] 
    
    // 3. AUTO-DETECTION AND ASPECT RATIO PRESERVATION
    const sigFieldName = activeDoc.value === 'nda' ? 'signature_nda' : 'signature_mma'
    
    // Valores por defecto por si el campo no existe
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
        
        // Calcular la proporción original de la imagen (Aspect Ratio)
        const imgRatio = pngImg.width / pngImg.height
        const boxRatio = rect.width / rect.height
        
        if (imgRatio > boxRatio) {
          // La imagen es más ancha que la caja
          drawW = rect.width
          drawH = rect.width / imgRatio
        } else {
          // La imagen es más alta que la caja
          drawH = rect.height
          drawW = rect.height * imgRatio
        }
        
        // Centrar la imagen en las coordenadas del cuadro original de Acrobat
        drawX = rect.x + (rect.width - drawW) / 2
        drawY = rect.y + (rect.height - drawH) / 2
        
        // Eliminar el cuadro de Acrobat para evitar duplicados o fondos extraños
        form.removeField(sigFieldName)
      }
    } catch (e) {
      console.warn("Signature field not found. Make sure the name matches in Acrobat.", e)
    }

    // Dibujar la firma UNA SOLA VEZ con la escala y posición calculada
    lastPage.drawImage(pngImg, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    })

    // 4. Flatten and save
    form.flatten()
    const pdfBytes = await pdfDoc.save()

    // 5. Download
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${activeDoc.value.toUpperCase()}_Siinge_${formData.companyName.replace(/\s+/g, '_')}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

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