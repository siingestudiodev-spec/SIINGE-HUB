<template>
  <div class="testing-container">
    <div class="card">
      <div class="header">
        <div class="status-pill">PRUEBA EN VIVO</div>
        <h1>Firma de Contrato</h1>
        <p class="id-display">Fabricante: <code>0942abd4...</code></p>
      </div>

      <div class="document-body">
        <div class="legal-text">
          <h3>NDA - SIINGE STUDIO</h3>
          <p>Este documento certifica que el fabricante acepta los términos de confidencialidad para el manejo de Tech Packs y propiedad intelectual.</p>
        </div>

        <div class="signature-area">
          <label>Firma digital aquí:</label>
          <div class="pad-container">
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
            <button @click="clearPad" class="btn-reset">BORRAR</button>
          </div>
        </div>
      </div>

      <button 
        @click="submitSignature" 
        :disabled="isProcessing" 
        class="btn-confirm"
      >
        <span v-if="!isProcessing">FIRMAR Y SUBIR A DRIVE</span>
        <span v-else>PROCESANDO...</span>
      </button>

      <div v-if="finalUrl" class="success-box">
        <p>✅ ¡Firma registrada con éxito!</p>
        <a :href="finalUrl" target="_blank">Abrir Carpeta en Drive ➔</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { PDFDocument } from 'pdf-lib'

// DATOS DE IDENTIFICACIÓN REALES
const TARGET_ID = '0942abd4-cccd-443f-985f-f29f4c1212f9'

const signaturePad = ref(null)
const isProcessing = ref(false)
const finalUrl = ref('')
let ctx = null
let drawing = false

onMounted(() => {
  ctx = signaturePad.value.getContext('2d')
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#000000'
  
  const rect = signaturePad.value.getBoundingClientRect()
  signaturePad.value.width = rect.width
  signaturePad.value.height = rect.height
})

// Lógica de Dibujo
const startDrawing = (e) => { drawing = true; draw(e); }
const stopDrawing = () => { drawing = false; ctx.beginPath(); }

const draw = (e) => {
  if (!drawing) return
  const rect = signaturePad.value.getBoundingClientRect()
  const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left
  const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

const handleTouch = (e) => {
  e.preventDefault()
  if (e.type === 'touchstart') drawing = true
  draw(e)
}

const clearPad = () => ctx.clearRect(0, 0, signaturePad.value.width, signaturePad.value.height)

const submitSignature = async () => {
  isProcessing.value = true
  try {
    // 1. Crear PDF base
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([600, 400])
    page.drawText('NDA FIRMADO - SIINGE STUDIO', { x: 50, y: 350, size: 20 })
    page.drawText(`ID Fabricante: ${TARGET_ID}`, { x: 50, y: 320, size: 10 })
    
    // 2. Insertar Firma del Canvas
    const signatureImage = signaturePad.value.toDataURL('image/png')
    const pngImage = await pdfDoc.embedPng(signatureImage)
    page.drawImage(pngImage, { x: 50, y: 150, width: 200, height: 80 })

    const pdfBase64 = await pdfDoc.saveAsBase64()

    // 3. Llamar a la Edge Function pasándole el ID real
    const { data, error } = await supabase.functions.invoke('upload-to-drive', {
      body: { 
        manufacturerId: TARGET_ID,
        fileName: `NDA_${Date.now()}.pdf`,
        fileBase64: pdfBase64
      }
    })

    if (error) throw new Error(error.message || 'Error en la función')
    
    finalUrl.value = data.url
    alert('¡Contrato firmado y guardado en la ficha del fabricante!')

  } catch (err) {
    console.error('Error detallado:', err)
    alert('Error al firmar: ' + err.message)
  } finally {
    isProcessing.value = false
  }
}
</script>

<style scoped>
.testing-container { min-height: 100vh; background: #050505; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: sans-serif; }
.card { background: #111; border: 1px solid #222; width: 100%; max-width: 440px; padding: 2rem; border-radius: 24px; color: white; }
.status-pill { display: inline-block; background: #1a1a1a; color: #4ade80; font-size: 10px; font-weight: bold; padding: 4px 10px; border-radius: 20px; margin-bottom: 10px; border: 1px solid #166534; }
h1 { margin: 0; font-size: 24px; }
.id-display { color: #555; font-size: 12px; margin-bottom: 20px; }
.document-body { background: white; color: black; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; text-align: left; }
.legal-text h3 { margin-top: 0; font-size: 14px; color: #888; }
.legal-text p { font-size: 14px; line-height: 1.4; }
.pad-container { position: relative; background: #f9f9f9; border: 2px dashed #ddd; border-radius: 12px; margin-top: 10px; }
canvas { width: 100%; height: 120px; cursor: crosshair; }
.btn-reset { position: absolute; top: 5px; right: 5px; font-size: 9px; background: #eee; border: none; padding: 4px; border-radius: 4px; cursor: pointer; color: #999; }
.btn-confirm { width: 100%; background: white; color: black; border: none; padding: 1rem; border-radius: 12px; font-weight: bold; cursor: pointer; }
.btn-confirm:disabled { opacity: 0.3; }
.success-box { margin-top: 1.5rem; border: 1px solid #22c55e; padding: 10px; border-radius: 12px; text-align: center; }
.success-box a { color: #4ade80; font-size: 13px; text-decoration: none; font-weight: bold; }
</style>