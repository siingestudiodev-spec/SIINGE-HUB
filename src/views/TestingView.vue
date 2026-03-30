<template>
  <div class="testing-container">
    <div class="card">
      <div class="header-section">
        <div class="badge">MODO PRUEBA</div>
        <h2>Firma de NDA</h2>
        <p class="subtitle">ID Fabricante: <code class="id-tag">0942abd4...</code></p>
      </div>

      <div class="doc-box">
        <div class="doc-header">
          <strong>ACUERDO DE CONFIDENCIALIDAD (NDA)</strong>
          <span>V1.0</span>
        </div>
        <p class="doc-text">
          Al firmar este documento, el fabricante se compromete a proteger toda la propiedad intelectual, 
          fichas técnicas y diseños compartidos por <strong>SIINGE STUDIO</strong>.
        </p>
        
        <div class="signature-pad-container">
          <label>Firma aquí abajo:</label>
          <div class="canvas-border">
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
            <button @click="clearPad" class="btn-clear">LIMPIAR</button>
          </div>
        </div>
      </div>

      <button 
        @click="processSignature" 
        :disabled="loading" 
        class="btn-submit"
        :class="{ 'loading': loading }"
      >
        {{ loading ? 'SUBIENDO A DRIVE...' : 'FIRMAR Y ENVIAR' }}
      </button>

      <div v-if="driveLink" class="success-msg">
        <p>✅ <strong>¡Documento guardado!</strong></p>
        <p class="small">Se ha actualizado el registro en Supabase.</p>
        <a :href="driveLink" target="_blank">Ver archivo en Google Drive ➔</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { PDFDocument, rgb } from 'pdf-lib'

// ID del fabricante proporcionado
const manufacturerId = '0942abd4-cccd-443f-985f-f29f4c1212f9'

const signaturePad = ref(null)
const loading = ref(false)
const driveLink = ref('')
let ctx = null
let isDrawing = false

onMounted(() => {
  ctx = signaturePad.value.getContext('2d')
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#000000'
  
  // Ajuste de resolución
  const rect = signaturePad.value.getBoundingClientRect()
  signaturePad.value.width = rect.width
  signaturePad.value.height = rect.height
})

// Lógica de dibujo (Mouse)
const startDrawing = (e) => { isDrawing = true; draw(e); }
const stopDrawing = () => { isDrawing = false; ctx.beginPath(); }

const draw = (e) => {
  if (!isDrawing) return
  const rect = signaturePad.value.getBoundingClientRect()
  const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left
  const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
  
  ctx.lineTo(x, y)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x, y)
}

// Lógica para móviles
const handleTouch = (e) => {
  e.preventDefault()
  if (e.type === 'touchstart') isDrawing = true
  draw(e)
}

const clearPad = () => ctx.clearRect(0, 0, signaturePad.value.width, signaturePad.value.height)

const processSignature = async () => {
  loading.value = true
  try {
    // 1. Crear el PDF en el cliente
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([600, 400])
    page.drawText('SIINGE STUDIO - CONTRATO NDA', { x: 50, y: 350, size: 20 })
    page.drawText(`ID Fabricante: ${manufacturerId}`, { x: 50, y: 320, size: 10 })
    page.drawText('Este documento es una prueba de integracion con Google Drive.', { x: 50, y: 280, size: 12 })
    
    // 2. Capturar firma e insertarla
    const sigData = signaturePad.value.toDataURL('image/png')
    const sigImg = await pdfDoc.embedPng(sigData)
    page.drawImage(sigImg, { x: 50, y: 100, width: 200, height: 80 })

    const pdfBase64 = await pdfDoc.saveAsBase64()

    // 3. Invocar la Edge Function de Supabase
    const { data, error } = await supabase.functions.invoke('upload-to-drive', {
      body: { 
        manufacturerId: manufacturerId,
        fileName: `NDA_FIRMADO_${Date.now()}.pdf`,
        fileBase64: pdfBase64
      }
    })

    if (error) throw error
    
    driveLink.value = data.url
    console.log('Respuesta de la función:', data)

  } catch (err) {
    console.error('Error completo:', err)
    alert('Error al procesar: ' + err.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.testing-container { min-height: 100vh; background: #0a0a0a; display: flex; align-items: center; justify-content: center; padding: 20px; font-family: 'Inter', system-ui, sans-serif; }
.card { background: #141414; border: 1px solid #262626; width: 100%; max-width: 480px; padding: 2.5rem; border-radius: 28px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
.badge { display: inline-block; background: #262626; color: #a3a3a3; font-size: 0.7rem; font-weight: 700; padding: 4px 12px; border-radius: 100px; margin-bottom: 1rem; letter-spacing: 0.5px; }
h2 { color: white; margin: 0; font-size: 1.8rem; letter-spacing: -0.5px; }
.subtitle { color: #737373; font-size: 0.9rem; margin-top: 8px; }
.id-tag { background: #1f1f1f; padding: 2px 6px; border-radius: 4px; color: #d4d4d4; }
.doc-box { background: white; border-radius: 20px; padding: 1.5rem; margin: 2rem 0; text-align: left; color: #171717; }
.doc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
.doc-header strong { font-size: 0.8rem; color: #525252; }
.doc-header span { font-size: 0.7rem; color: #a3a3a3; }
.doc-text { font-size: 0.95rem; line-height: 1.6; color: #404040; margin-bottom: 25px; }
.canvas-border { border: 2px dashed #e5e5e5; border-radius: 14px; position: relative; margin-top: 10px; background: #fafafa; transition: border-color 0.3s; }
.canvas-border:hover { border-color: #d4d4d4; }
canvas { width: 100%; height: 140px; cursor: url('https://www.gstatic.com/images/icons/material/system/2x/create_black_24dp.png'), crosshair; }
.btn-clear { position: absolute; top: 10px; right: 10px; font-size: 0.65rem; font-weight: 800; background: white; border: 1px solid #e5e5e5; padding: 5px 10px; border-radius: 8px; cursor: pointer; color: #737373; }
.btn-submit { width: 100%; background: #ffffff; color: #000000; border: none; padding: 1.2rem; border-radius: 16px; font-weight: 800; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); font-size: 1rem; }
.btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(255,255,255,0.1); background: #f5f5f5; }
.btn-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.success-msg { margin-top: 1.5rem; border: 1px solid #22c55e; padding: 1.2rem; border-radius: 18px; background: rgba(34, 197, 94, 0.05); text-align: center; }
.success-msg p { color: #4ade80; margin: 0; }
.success-msg .small { color: #166534; font-size: 0.8rem; margin-top: 4px; }
.success-msg a { color: white; text-decoration: none; display: inline-block; margin-top: 12px; font-weight: 600; font-size: 0.85rem; border-bottom: 1px solid #4ade80; padding-bottom: 2px; }
</style>