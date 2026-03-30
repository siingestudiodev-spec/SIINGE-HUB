<template>
  <div class="testing-container">
    <div class="card">
      <div class="card-header">
        <h2>🖋️ Signature Test: NDA Agreement</h2>
        <p>Siinge Studio x {{ testManufacturer.company_name }}</p>
      </div>

      <div class="document-preview">
        <p><strong>CONFIDENTIALITY AGREEMENT</strong></p>
        <p class="text-xs">This agreement ensures that all technical packs, patterns, and pricing shared by Siinge Studio remain confidential...</p>
        
        <div class="signature-section">
          <label>Draw your signature below:</label>
          <div class="canvas-wrapper">
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
            <button @click="clearPad" class="btn-clear">Clear</button>
          </div>
        </div>
      </div>

      <div class="card-actions">
        <button @click="handleSignAndUpload" :disabled="loading" class="btn-primary-glow">
          {{ loading ? 'Generating & Uploading...' : 'Confirm & Sign Document' }}
        </button>
      </div>

      <div v-if="driveLink" class="success-banner">
        <span class="icon">✅</span>
        <div>
          <p><strong>Success!</strong> Document signed and uploaded.</p>
          <a :href="driveLink" target="_blank" class="link">View in Google Drive</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { PDFDocument, rgb } from 'pdf-lib'

// Para probar, necesitamos un ID real de un fabricante de tu lista
const testManufacturer = ref({
  id: 'TU_ID_AQUI', // <--- PEGA AQUÍ UN ID DE TU TABLA PARA PROBAR
  company_name: 'Test Factory Co.'
})

const signaturePad = ref(null)
const loading = ref(false)
const driveLink = ref('')
let ctx = null
let drawing = false

onMounted(() => {
  ctx = signaturePad.value.getContext('2d')
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#000000'
  
  // Ajuste de resolución para que no se vea pixelado
  const rect = signaturePad.value.getBoundingClientRect()
  signaturePad.value.width = rect.width
  signaturePad.value.height = rect.height
})

// Lógica de dibujo
const startDrawing = (e) => { drawing = true; draw(e); }
const stopDrawing = () => { drawing = false; ctx.beginPath(); }

const draw = (e) => {
  if (!drawing) return
  const rect = signaturePad.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

const handleTouch = (e) => {
  e.preventDefault()
  const touch = e.touches[0]
  const rect = signaturePad.value.getBoundingClientRect()
  const x = touch.clientX - rect.left
  const y = touch.clientY - rect.top
  if (e.type === 'touchstart') {
    drawing = true
    ctx.moveTo(x, y)
  } else if (e.type === 'touchmove' && drawing) {
    ctx.lineTo(x, y)
    ctx.stroke()
  }
}

const clearPad = () => ctx.clearRect(0, 0, signaturePad.value.width, signaturePad.value.height)

const handleSignAndUpload = async () => {
  loading.value = true
  try {
    // 1. Crear PDF
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([600, 400])
    page.drawText('NON-DISCLOSURE AGREEMENT', { x: 50, y: 350, size: 20 })
    page.drawText(`Signed by: ${testManufacturer.value.company_name}`, { x: 50, y: 300, size: 12 })
    
    // 2. Incrustar Firma
    const signatureImage = signaturePad.value.toDataURL('image/png')
    const pngImage = await pdfDoc.embedPng(signatureImage)
    page.drawImage(pngImage, { x: 50, y: 150, width: 200, height: 80 })

    const pdfBase64 = await pdfDoc.saveAsBase64()

    // 3. Llamar a la Edge Function
    const { data, error } = await supabase.functions.invoke('upload-to-drive', {
      body: { 
        manufacturerId: testManufacturer.value.id,
        fileName: `NDA_${testManufacturer.value.company_name}.pdf`,
        fileBase64: pdfBase64
      }
    })

    if (error) throw error
    driveLink.value = data.url
    alert('Document successfully uploaded to Drive!')
  } catch (err) {
    console.error(err)
    alert('Upload failed: ' + err.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.testing-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; padding: 20px; font-family: 'Inter', sans-serif; }
.card { background: #1e293b; width: 100%; max-width: 500px; border-radius: 20px; border: 1px solid #334155; padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
.card-header h2 { color: white; margin: 0; font-size: 1.5rem; }
.card-header p { color: #94a3b8; margin-top: 5px; }
.document-preview { background: #f8fafc; border-radius: 12px; padding: 1.5rem; margin: 1.5rem 0; color: #334155; }
.text-xs { font-size: 0.75rem; color: #64748b; line-height: 1.4; margin-top: 10px; }
.canvas-wrapper { position: relative; background: white; border: 2px dashed #cbd5e1; border-radius: 8px; margin-top: 10px; overflow: hidden; }
canvas { display: block; width: 100%; height: 150px; cursor: crosshair; }
.btn-clear { position: absolute; top: 10px; right: 10px; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 4px 8px; border-radius: 6px; font-size: 10px; cursor: pointer; color: #64748b; }
.btn-primary-glow { width: 100%; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; border: none; padding: 1rem; border-radius: 12px; font-weight: 700; cursor: pointer; transition: transform 0.2s; }
.btn-primary-glow:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.4); }
.success-banner { margin-top: 1.5rem; background: rgba(34, 197, 94, 0.1); border: 1px solid #22c55e; padding: 1rem; border-radius: 12px; display: flex; gap: 12px; color: #4ade80; }
.link { color: white; text-decoration: underline; font-weight: bold; }
</style>