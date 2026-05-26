<template>
  <div class="pdf-canvas-container" ref="containerRef">
    <div v-if="loading" class="pdf-loading">
      <div class="pdf-spinner"></div>
      <p>Loading document...</p>
    </div>
    <div v-else-if="pdfError" class="pdf-error">Failed to load document</div>
    <div v-else class="pdf-pages">
      <canvas
        v-for="pageNum in totalPages"
        :key="pageNum"
        :ref="el => setCanvasRef(el, pageNum)"
        class="pdf-page-canvas"
      ></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  src: { type: String, required: true }
})

const containerRef = ref(null)
const loading = ref(true)
const pdfError = ref(false)
const totalPages = ref(0)
const canvasRefs = {}
let pdfDoc = null

function setCanvasRef(el, pageNum) {
  if (el) canvasRefs[pageNum] = el
}

async function loadPdf(src) {
  if (!src) return
  loading.value = true
  pdfError.value = false

  try {
    const pdfjsLib = await import('pdfjs-dist')
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).href

    const loadingTask = pdfjsLib.getDocument(src)
    pdfDoc = await loadingTask.promise
    totalPages.value = pdfDoc.numPages
    loading.value = false

    // Wait a tick for canvases to render
    await new Promise(r => setTimeout(r, 50))
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      await renderPage(i)
    }
  } catch (err) {
    console.error('PDF.js error:', err)
    pdfError.value = true
    loading.value = false
  }
}

async function renderPage(pageNum) {
  if (!pdfDoc) return
  const page = await pdfDoc.getPage(pageNum)
  const canvas = canvasRefs[pageNum]
  if (!canvas) return

  const containerWidth = Math.min(containerRef.value?.clientWidth || 800, 750)
  const viewport = page.getViewport({ scale: 1 })
  const scale = containerWidth / viewport.width
  const scaledViewport = page.getViewport({ scale })

  canvas.width = scaledViewport.width
  canvas.height = scaledViewport.height

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'white'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise
}

watch(() => props.src, (newSrc) => {
  if (newSrc) loadPdf(newSrc)
})

onMounted(() => {
  if (props.src) loadPdf(props.src)
})

onBeforeUnmount(() => {
  if (pdfDoc) pdfDoc.destroy()
})
</script>

<style scoped>
.pdf-canvas-container {
  width: 100%;
  background: white;
  border-radius: 8px;
  overflow-y: auto;
  overflow-x: hidden;
}

.pdf-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 1rem;
  color: #666;
}

.pdf-spinner {
  width: 36px;
  height: 36px;
  border: 4px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pdf-error {
  padding: 2rem;
  text-align: center;
  color: #ef4444;
}

.pdf-pages {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pdf-page-canvas {
  width: 100%;
  display: block;
  border-bottom: 1px solid #e5e7eb;
}

.pdf-page-canvas:last-child {
  border-bottom: none;
}
</style>
