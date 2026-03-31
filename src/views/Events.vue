<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>📅 Events 2026</h1>
        <p class="subtitle">Manage and import your textile events</p>
      </div>
      <div class="header-actions">
        <label class="btn-secondary import-label">
          📥 Import Excel
          <input type="file" @change="handleImport" accept=".xlsx, .xls, .csv" hidden />
        </label>
        <button @click="openAddForm" class="btn-primary">+ Add Event</button>
      </div>
    </div>

    <div v-if="importing" class="import-progress">
      <div class="progress-bar" :style="{ width: importProgress + '%' }"></div>
      <span>Importing events... {{ importProgress }}%</span>
    </div>

    <div class="filters-bar">
      <select v-model="filterMonth" class="filter-select">
        <option value="">All Months</option>
        <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
      <select v-model="filterCountry" class="filter-select">
        <option value="">All Countries</option>
        <option v-for="c in availableCountries" :key="c" :value="c">{{ c }}</option>
      </select>
      <button v-if="filterMonth || filterCountry" @click="clearFilters" class="btn-clear">✕ Clear</button>
      <span class="results-count">{{ filteredEvents.length }} events</span>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editingId ? 'Edit Event' : 'New Event' }}</h2>
      <div class="form-grid">
        <input v-model="form.event_name" placeholder="Event Name *" />
        <input v-model="form.country" placeholder="Country" />
        <input v-model="form.city" placeholder="City" />
        <input v-model="form.start_date" type="date" />
        <input v-model.number="form.duration_days" type="number" placeholder="Days" />
        <input v-model="form.registration_url" placeholder="Registration URL" />
      </div>
      <textarea v-model="form.notes" placeholder="Notes" rows="2"></textarea>
      <div class="form-actions">
        <button @click="saveEvent" class="btn-primary">{{ editingId ? 'Update' : 'Save' }}</button>
        <button @click="cancelForm" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else class="cards-grid">
      <div v-for="e in filteredEvents" :key="e.id" class="event-card" :class="{ expired: isPast(e.start_date, e.duration_days) }">
        <div class="card-top">
          <div>
            <strong class="event-name">{{ e.event_name }}</strong>
            <div class="event-location">📍 {{ [e.city, e.country].filter(Boolean).join(', ') || '—' }}</div>
          </div>
          <div class="card-actions">
            <button @click="editEvent(e)" class="btn-edit">✏️</button>
            <button @click="deleteEvent(e.id)" class="btn-delete">✕</button>
          </div>
        </div>
        <div class="event-dates">
          <span class="date-badge">🗓 {{ formatDate(e.start_date) }}</span>
          <span class="duration-badge">{{ e.duration_days }} days</span>
        </div>
        <div v-if="e.registration_url" class="card-link">
          <a :href="e.registration_url" target="_blank" class="btn-register">🔗 Register</a>
        </div>
        <div v-if="e.notes" class="card-notes">{{ e.notes }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx' // IMPORTANTE: Librería para el Excel

const events = ref([])
const loading = ref(true)
const importing = ref(false)
const importProgress = ref(0)
const showForm = ref(false)
const editingId = ref(null)
const filterMonth = ref('')
const filterCountry = ref('')

const monthOptions = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' }, { value: '04', label: 'April' },
  { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' },
  { value: '09', label: 'September'}, { value: '10', label: 'October' },
  { value: '11', label: 'November' }, { value: '12', label: 'December' }
]

const emptyForm = () => ({
  event_name: '', country: '', city: '',
  start_date: '', duration_days: 1, registration_url: '', notes: ''
})
const form = ref(emptyForm())

// LÓGICA DE IMPORTACIÓN
const handleImport = (ev) => {
  const file = ev.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    importing.ref = true
    const data = new Uint8Array(e.target.result)
    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const json = XLSX.utils.sheet_to_json(worksheet)

    let count = 0
    for (const row of json) {
      // Mapeamos las columnas exactas de tu ClickUp/Excel
      const start = new Date(row['Start Date'])
      const end = new Date(row['Due Date'])
      
      // Calculamos la duración restando milisegundos y pasando a días
      const diffTime = Math.abs(end - start)
      const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1

      const newEvent = {
        event_name: row['Task Name'] || 'Unnamed Event',
        country: row['Parent Name'] || '',
        city: '', // El excel no traía ciudad específica
        start_date: start.toISOString().split('T')[0],
        duration_days: duration,
        registration_url: extractUrl(row['Task Content']),
        notes: row['Task Content'] || ''
      }

      await supabase.from('events').insert([newEvent])
      count++
      importProgress.value = Math.round((count / json.length) * 100)
    }
    
    alert(`Successfully imported ${count} events!`)
    importing.value = false
    importProgress.value = 0
    fetchEvents()
  }
  reader.readAsArrayBuffer(file)
}

// Función extra para buscar URLs en el contenido de la descripción
function extractUrl(text) {
  if (!text) return ''
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const found = text.match(urlRegex)
  return found ? found[0] : ''
}

// --- Resto de funciones se mantienen igual ---
const availableCountries = computed(() => {
  const countries = events.value.map(e => e.country).filter(Boolean)
  return [...new Set(countries)].sort()
})

const filteredEvents = computed(() => {
  return events.value.filter(e => {
    const matchMonth = !filterMonth.value || (e.start_date && e.start_date.slice(5, 7) === filterMonth.value)
    const matchCountry = !filterCountry.value || e.country === filterCountry.value
    return matchMonth && matchCountry
  })
})

async function fetchEvents() {
  loading.value = true
  const { data } = await supabase.from('events').select('*').order('start_date')
  events.value = data || []
  loading.value = false
}

async function saveEvent() {
  if (editingId.value) {
    await supabase.from('events').update({ ...form.value }).eq('id', editingId.value)
  } else {
    await supabase.from('events').insert([{ ...form.value }])
  }
  cancelForm(); fetchEvents()
}

async function deleteEvent(id) {
  if (confirm('Delete?')) {
    await supabase.from('events').delete().eq('id', id)
    fetchEvents()
  }
}

function formatDate(date) { return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
function isPast(startDate, duration) { const end = new Date(startDate); end.setDate(end.getDate() + (duration || 1)); return end < new Date(); }
function daysUntil(startDate) { const diff = new Date(startDate) - new Date(); return Math.ceil(diff / (1000 * 60 * 60 * 24)) }
function clearFilters() { filterMonth.value = ''; filterCountry.value = '' }
function openAddForm() { editingId.value = null; form.value = emptyForm(); showForm.value = true }
function editEvent(e) { editingId.value = e.id; form.value = { ...e }; showForm.value = true; window.scrollTo({ top: 0, behavior: 'smooth' }) }
function cancelForm() { showForm.value = false; editingId.value = null }

onMounted(fetchEvents)
</script>

<style scoped>
/* Tus estilos anteriores + mejoras para el import */
.container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.header-actions { display: flex; gap: 1rem; }

.import-label { cursor: pointer; display: inline-block; padding: 0.65rem 1.3rem; border-radius: 10px; font-weight: 600; background: var(--bg-card); border: 1px solid var(--border-main); }
.import-label:hover { background: var(--border-light); }

.import-progress { margin-bottom: 2rem; background: var(--bg-card); padding: 1rem; border-radius: 10px; border: 1px solid var(--primary); text-align: center; }
.progress-bar { height: 8px; background: var(--primary); border-radius: 4px; transition: width 0.3s; margin-bottom: 0.5rem; }

/* REUTILIZAMOS TUS CARDS */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
.event-card { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 16px; padding: 1.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
.event-name { font-size: 1.1rem; color: var(--text-main); }
.date-badge { background: rgba(79, 70, 229, 0.1); color: var(--primary); padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
.btn-primary { background: var(--primary); color: white; padding: 0.7rem 1.5rem; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; }
.btn-secondary { background: #eee; color: #333; padding: 0.7rem 1.5rem; border-radius: 10px; border: none; cursor: pointer; }
</style>