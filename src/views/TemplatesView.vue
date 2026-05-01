<template>
  <div class="container">
    <div class="header">
      <h1>Email Templates & Documents</h1>
      <button @click="showForm = !showForm" class="btn-primary">
        {{ showForm ? 'Cancel' : '+ Add Email Template' }}
      </button>
    </div>

    <div class="legal-documents-section">
      <div class="legal-header">
        <h2>Legal Documents</h2>
        <p>Download your official SIINGE templates automatically stamped with today's date.</p>
      </div>
      <div class="legal-actions">
        <button @click="descargarDocumento('NDA')" class="btn-legal nda">
          <span class="icon"><FileText :size="20" :stroke-width="1.5" /></span>
          <div class="btn-text">
            <strong>Download NDA</strong>
            <span>Non-Disclosure Agreement</span>
          </div>
        </button>

        <button @click="descargarDocumento('MMA')" class="btn-legal mma">
          <span class="icon"><FileText :size="20" :stroke-width="1.5" /></span>
          <div class="btn-text">
            <strong>Download MMA</strong>
            <span>Master Manufacturing Agreement</span>
          </div>
        </button>
      </div>
    </div>
    
    <hr class="section-divider" />

    <div v-if="showForm" class="form-card">
      <h2>{{ editing ? 'Edit Email Template' : 'New Email Template' }}</h2>
      <div class="form-grid-single">
        <input v-model="form.name" placeholder="Template Name (e.g., Initial Reach) *" />
        <input v-model="form.subject" placeholder="Email Subject *" />
      </div>
      <textarea v-model="form.body" placeholder="Email Body (Use {{company_name}} to auto-fill the manufacturer's name)" rows="10"></textarea>
      <div class="form-actions">
        <button @click="saveTemplate" class="btn-primary">{{ editing ? 'Update' : 'Save' }}</button>
      </div>
    </div>

    <div class="section-title">
      <h2>Saved Email Templates</h2>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="templates.length === 0" class="empty">No email templates found. Create one above!</div>
    <div v-else class="cards-grid">
      <div v-for="t in templates" :key="t.id" class="card">
        <div class="card-top">
          <div class="card-avatar">T</div>
          <div class="card-title">
            <h3>{{ t.name }}</h3>
          </div>
        </div>
        <div class="card-body">
          <div class="info-row"><strong>Subject:</strong> {{ t.subject }}</div>
          <div class="info-row notes-row line-clamp">
            {{ t.body.substring(0, 100) }}...
          </div>
        </div>
        <div class="card-actions">
          <button @click="editTemplate(t)" class="btn-secondary">Edit</button>
          <button @click="deleteTemplate(t.id)" class="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { FileText } from 'lucide-vue-next'
import { PDFDocument } from 'pdf-lib' // NUEVO: Importación para PDFs

const templates = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(false)
const editId = ref(null)

const form = ref({
  name: '',
  subject: '',
  body: ''
})

// ==========================================
// NUEVO: LÓGICA DE DESCARGA DE PDFS
// ==========================================
async function descargarDocumento(tipo) {
  try {
    const archivoOrigen = tipo === 'NDA' ? '/template_nda.pdf' : '/template_mma.pdf'
    const prefijoNombre = tipo === 'NDA' ? 'SIINGE_NDA' : 'SIINGE_MMA'

    const existingPdfBytes = await fetch(archivoOrigen).then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const formPdf = pdfDoc.getForm()

    const campoFecha1 = formPdf.getTextField('fecha_firma')
    const campoFecha2 = formPdf.getTextField('fecha_firma2')

    // ==========================================
    // NUEVO FORMATO DE FECHA: MM/DD/YYYY
    // ==========================================
    const hoy = new Date()
    const mes = String(hoy.getMonth() + 1).padStart(2, '0') // +1 porque enero es 0
    const dia = String(hoy.getDate()).padStart(2, '0')
    const anio = hoy.getFullYear()
    
    const fechaHoy = `${mes}/${dia}/${anio}`
    // ==========================================

    if (campoFecha1) campoFecha1.setText(fechaHoy)
    if (campoFecha2) campoFecha2.setText(fechaHoy)

    formPdf.flatten() 

    const pdfBytes = await pdfDoc.save()
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${prefijoNombre}_${fechaHoy.replace(/\//g, '-')}.pdf`
    link.click()
    
  } catch (error) {
    console.error(`Error generando el ${tipo}:`, error)
    alert(`Hubo un error al generar el ${tipo}. Verifica que el archivo (template_nda.pdf o template_mma.pdf) exista en la carpeta 'public'.`)
  }
}

async function fetchTemplates() {
  loading.value = true
  const { data } = await supabase.from('templates').select('*').order('name')
  templates.value = data || []
  loading.value = false
}

async function saveTemplate() {
  if (!form.value.name || !form.value.subject || !form.value.body) {
    return alert('Please fill out all fields.')
  }
  
  if (editing.value) {
    await supabase.from('templates').update(form.value).eq('id', editId.value)
  } else {
    await supabase.from('templates').insert([form.value])
  }
  resetForm()
  fetchTemplates()
}

function editTemplate(t) {
  form.value = { name: t.name, subject: t.subject, body: t.body }
  editId.value = t.id
  editing.value = true
  showForm.value = true
}

async function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return
  await supabase.from('templates').delete().eq('id', id)
  fetchTemplates()
}

function resetForm() {
  form.value = { name: '', subject: '', body: '' }
  editing.value = false
  editId.value = null
  showForm.value = false
}

onMounted(fetchTemplates)
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
h1 { font-size: 2rem; font-weight: 700; color: var(--text-main); margin: 0; }

/* NUEVO: ESTILOS PARA LA SECCIÓN LEGAL */
.legal-documents-section {
  background: rgba(0,0,0,0.1);
  border: 1px solid var(--border-main);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.legal-header h2 { margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--text-main); }
.legal-header p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

.legal-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.btn-legal {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-main);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 250px;
  text-align: left;
}
.btn-legal:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}
.btn-legal.nda:hover { border-color: #8b5cf6; }
.btn-legal.mma:hover { border-color: #ec4899; }

.btn-legal .icon { font-size: 2rem; }
.btn-text { display: flex; flex-direction: column; gap: 0.2rem; }
.btn-text strong { color: var(--text-main); font-size: 1.05rem; }
.btn-text span { color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;}

.section-divider { border: none; border-top: 1px dashed var(--border-main); margin: 2.5rem 0; opacity: 0.5; }
.section-title { margin-bottom: 1.5rem; }
.section-title h2 { font-size: 1.25rem; color: var(--text-main); margin: 0; }

/* ESTILOS ORIGINALES DEL FORMULARIO Y TARJETAS */
.form-card { background: var(--bg-card); padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1.5px solid var(--border-main); box-shadow: 0 4px 24px rgba(79,70,229,0.07); }
.form-card h2 { font-size: 1.1rem; margin-bottom: 1.25rem; color: var(--text-main); }
.form-grid-single { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid var(--border-main); border-radius: 10px; font-size: 0.92rem; color: var(--text-main); background: var(--bg-card); font-family: 'Poppins', sans-serif; transition: border-color 0.15s; box-sizing: border-box; }
input:focus, textarea:focus { outline: none; border-color: var(--primary); }
textarea { resize: vertical; }
.form-actions { margin-top: 1rem; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
.card { background: var(--bg-card); border-radius: 16px; padding: 1.5rem; border: 1.5px solid var(--border-main); box-shadow: 0 2px 12px rgba(0,0,0,0.05); transition: transform 0.18s, box-shadow 0.18s; }
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(79,70,229,0.12); border-color: var(--primary); }

.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.card-avatar { width: 48px; height: 48px; background: var(--primary); color: white; font-weight: 700; font-size: 1.3rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-title h3 { font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem; }

.card-body { margin-bottom: 1.25rem; }
.info-row { font-size: 0.88rem; color: var(--text-body); margin-bottom: 0.5rem; }
.notes-row { color: var(--text-muted) !important; font-style: italic; }
.line-clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.card-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid var(--border-light); }
.btn-primary { background: var(--primary); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; font-family: 'Poppins', sans-serif; transition: opacity 0.15s, transform 0.15s; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary { background: rgba(79, 70, 229, 0.1); color: var(--primary); border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Poppins', sans-serif; font-weight: 500; }
.btn-danger { background: var(--danger-bg); color: var(--danger-text); border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Poppins', sans-serif; font-weight: 500; }
.loading, .empty { text-align: center; padding: 3rem; color: var(--text-muted); }
</style>