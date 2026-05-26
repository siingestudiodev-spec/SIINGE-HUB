<template>
  <div class="signature-container">
    <div class="canvas-wrapper">
      <canvas
        ref="canvasElement"
        class="signature-canvas"
        @mousedown="startSigning"
        @mousemove="sign"
        @mouseup="stopSigning"
        @mouseout="stopSigning"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="stopSigning"
      ></canvas>
    </div>

    <div class="signature-actions">
      <button @click="clearSignature" class="btn-secondary btn-sm">
        Clear
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const canvasElement = ref(null)
const context = ref(null)
const isDrawing = ref(false)
const hasSignature = ref(false)

const emit = defineEmits(['signature-captured'])

onMounted(() => {
  const canvas = canvasElement.value
  context.value = canvas.getContext('2d')

  // Set canvas size
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight

  // White background
  context.value.fillStyle = 'white'
  context.value.fillRect(0, 0, canvas.width, canvas.height)

  // Border
  context.value.strokeStyle = '#e5e7eb'
  context.value.lineWidth = 1
  context.value.strokeRect(0, 0, canvas.width, canvas.height)
})

function startSigning(e) {
  isDrawing.value = true
  const rect = canvasElement.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  context.value.beginPath()
  context.value.moveTo(x, y)
}

function sign(e) {
  if (!isDrawing.value) return

  const rect = canvasElement.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  context.value.lineWidth = 2
  context.value.lineCap = 'round'
  context.value.strokeStyle = '#1f2937'
  context.value.lineTo(x, y)
  context.value.stroke()
  hasSignature.value = true
}

function stopSigning() {
  isDrawing.value = false
  if (hasSignature.value) {
    const signatureBase64 = canvasElement.value.toDataURL('image/png')
    emit('signature-captured', signatureBase64)
  }
}

function handleTouchStart(e) {
  e.preventDefault()
  const touch = e.touches[0]
  const mouseEvent = new MouseEvent('mousedown', {
    clientX: touch.clientX,
    clientY: touch.clientY,
  })
  canvasElement.value.dispatchEvent(mouseEvent)
}

function handleTouchMove(e) {
  e.preventDefault()
  const touch = e.touches[0]
  const mouseEvent = new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY,
  })
  canvasElement.value.dispatchEvent(mouseEvent)
}

function clearSignature() {
  const canvas = canvasElement.value
  context.value.fillStyle = 'white'
  context.value.fillRect(0, 0, canvas.width, canvas.height)
  context.value.strokeStyle = '#e5e7eb'
  context.value.lineWidth = 1
  context.value.strokeRect(0, 0, canvas.width, canvas.height)
  hasSignature.value = false
}

defineExpose({ clearSignature })
</script>

<style scoped>
.signature-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.canvas-wrapper {
  border: 2px dashed var(--border-main);
  border-radius: 10px;
  overflow: hidden;
  background: white;
}

.signature-canvas {
  display: block;
  width: 100%;
  height: 160px;
  cursor: crosshair;
  touch-action: none;
}

.signature-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--border-light);
  color: var(--text-main);
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
