<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>📅 Events 2026</h1>
        <p class="subtitle">Trade shows & industry events by Continent</p>
      </div>
      <div class="header-actions">
        <label class="btn-secondary import-label">
          {{ importing ? '📥 Importando...' : '📥 Import Excel' }}
          <input type="file" @change="handleImport" accept=".xlsx, .xls, .csv" hidden :disabled="importing" />
        </label>
        <button @click="openAddForm" class="btn-primary">+ Add Event</button>
      </div>
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
      <span class="results-count">{{ filteredEvents.length }} event{{ filteredEvents.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editingId ? 'Edit Event' : 'New Event' }}</h2>
      <div class="form-grid">
        <input v-model="form.event_name" placeholder="Event Name *" />
        <input v-model="form.country" placeholder="Country" />
        <input v-model="form.city" placeholder="City" />
        <input v-model="form.start_date" type="date" />
        <input v-model.number="form.duration_days" type="number" placeholder="Duration (days)" min="1" />
        <input v-model="form.registration_url" placeholder="Registration URL" />
      </div>
      <textarea v-model="form.notes" placeholder="Notes" rows="2"></textarea>
      <div class="form-actions">
        <button @click="saveEvent" class="btn-primary">
          {{ editingId ? 'Update Event' : 'Save Event' }}
        </button>
        <button @click="cancelForm" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading events...</div>
    <div v-else-if="filteredEvents.length === 0" class="empty">No events match your filters.</div>
    
    <div v-else class="continents-container">
      <div v-for="(eventsList, continent) in groupedEvents" :key="continent" class="continent-section">
        <h2 class="continent-title">🌍 {{ continent }} Events</h2>
        
        <div class="cards-grid">
          <div v-for="e in eventsList" :key="e.id" class="event-card" :class="{ expired: isPast(e.start_date, e.duration_days) }">
            <div class="card-top">
              <div>
                <strong class="event-name">{{ e.event_name }}</strong>
                <div class="event-location">📍 {{ [e.city, e.country].filter(Boolean).join(', ') || '—' }}</div>
              </div>
              <div class="card-actions">
                <button @click="editEvent(e)" class="btn-edit" title="Edit">✏️</button>
                <button @click="deleteEvent(e.id)" class="btn-delete" title="Delete">✕</button>
              </div>
            </div>

            <div class="event-dates">
              <span class="date-badge">🗓 {{ formatDate(e.start_date) }}</span>
              <span class="duration-badge">{{ e.duration_days }} day{{ e.duration_days > 1 ? 's' : '' }}</span>
            </div>

            <div v-if="isPast(e.start_date, e.duration_days)" class="expired-label">⛔ Event has passed</div>
            <div v-else class="days-left">⏳ {{ daysUntil(e.start_date) }} days away</div>

            <div v-if="e.registration_url" class="card-link">
              <a :href="e.registration_url" target="_blank" class="btn-register">🔗 Register / Info</a>
            </div>

            <div v-if="e.notes" class="card-notes">{{ e.notes }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

const events = ref([])
const loading = ref(true)
const importing = ref(false)
const showForm = ref(false)
const editingId = ref(null)

const filterMonth = ref('')
const filterCountry = ref('')

const monthOptions = [
  { value: '01', label: 'January' }, { value: '02', label: 'February' },
  { value: '03', label: 'March' },   { value: '04', label: 'April' },
  { value: '05', label: 'May' },     { value: '06', label: 'June' },
  { value: '07', label: 'July' },    { value: '08', label: 'August' },
  { value: '09', label: 'September'},{ value: '10', label: 'October' },
  { value: '11', label: 'November' },{ value: '12', label: 'December' }
]

const emptyForm = () => ({
  event_name: '', country: '', city: '',
  start_date: '', duration_days: 1, registration_url: '', notes: ''
})

const form = ref(emptyForm())

// --- DICCIONARIO DE CONTINENTES ---
function getContinent(country) {
  if (!country) return 'Other'
  
  const europe = ['Portugal', 'Spain', 'France', 'Italy', 'Germany', 'United Kingdom', 'UK', 'Netherlands', 'Belgium', 'Switzerland', 'Poland', 'Sweden', 'Denmark', 'Norway', 'Finland', 'Austria', 'Greece']
  const asia = ['China', 'Vietnam', 'Turkey', 'India', 'Japan', 'South Korea', 'Taiwan', 'Bangladesh', 'Pakistan', 'Indonesia', 'Thailand', 'Malaysia', 'Singapore']
  const america = ['United States', 'USA', 'Mexico', 'Colombia', 'Brazil', 'Argentina', 'Canada', 'Peru', 'Chile', 'Ecuador', 'Panama']
  const africa = ['Egypt', 'South Africa', 'Morocco', 'Nigeria', 'Kenya', 'Ethiopia']
  const oceania = ['Australia', 'New Zealand']

  if (europe.includes(country)) return 'Europe'
  if (asia.includes(country)) return 'Asia'
  if (america.includes(country)) return 'America'
  if (africa.includes(country)) return 'Africa'
  if (oceania.includes(country)) return 'Oceania'
  
  return 'Other' // Si el país no está en la lista o no tiene país asignado
}

// --- AGRUPACIÓN POR CONTINENTES ---
const groupedEvents = computed(() => {
  // Primero aplicamos los filtros normales
  const filtered = filteredEvents.value

  // Preparamos la estructura
  const groups = {
    'America': [],
    'Europe': [],
    'Asia': [],
    'Africa': [],
    'Oceania': [],
    'Other': []
  }

  // Llenamos los grupos
  filtered.forEach(e => {
    const continent = getContinent(e.country)
    groups[continent].push(e)
  })

  // Retornamos solo los continentes que tengan eventos
  return Object.fromEntries(Object.entries(groups).filter(([_, evts]) => evts.length > 0))
})

// --- LÓGICA DE IMPORTACIÓN ---
const handleImport = (ev) => {
  const file = ev.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      importing.value = true
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" })

      let count = 0
      for (const row of rawJson) {
        const cleanRow = {}
        Object.keys(row).forEach(k => cleanRow[k.trim()] = row[k])

        if (!cleanRow['Task Name'] || cleanRow['Task Name'].trim() === "") continue

        const parseClickUpDate = (dateStr) => {
          if (!dateStr) return null
          const cleanDate = String(dateStr).replace(/(\d+)(st|nd|rd|th)/, "$1")
          const d = new Date(cleanDate)
          return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
        }

        const startDate = parseClickUpDate(cleanRow['Start Date'])
        const dueDate = parseClickUpDate(cleanRow['Due Date'])

        if (!startDate) continue

        const startObj = new Date(startDate)
        const endObj = dueDate ? new Date(dueDate) : startObj
        let duration = Math.ceil(Math.abs(endObj - startObj) / (1000 * 60 * 60 * 24))
        if (duration === 0 || isNaN(duration)) duration = 1

        const newEvent = {
          event_name: cleanRow['Task Name'],
          country: cleanRow['Parent Name'] || '',
          city: '',
          start_date: startDate,
          duration_days: duration,
          registration_url: extractUrl(cleanRow['Task Content'] || ''),
          notes: cleanRow['Task Content'] || ''
        }

        const { error } = await supabase.from('events').insert([newEvent])
        if (!error) count++
      }
      
      alert(`¡Éxito! Se importaron ${count} eventos correctamente.`)
      fetchEvents()
    } catch (err) {
      console.error("Error crítico:", err)
      alert("Hubo un error al procesar el Excel. Revisa la consola.")
    } finally {
      importing.value = false
      ev.target.value = ''
    }
  }
  reader.readAsArrayBuffer(file)
}

function extractUrl(text) {
  if (!text) return ''
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const found = text.match(urlRegex)
  return found ? found[0] : ''
}

// --- LÓGICA DE FILTROS Y BASE DE DATOS ---
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

function clearFilters() {
  filterMonth.value = ''
  filterCountry.value = ''
}

function openAddForm() {
  editingId.value = null
  form.value = emptyForm()
  showForm.value = true
}

function editEvent(e) {
  editingId.value = e.id
  form.value = { ...e }
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
}

async function fetchEvents() {
  loading.value = true
  const { data } = await supabase.from('events').select('*').order('start_date')
  events.value = data || []
  loading.value = false
}

async function saveEvent() {
  if (!form.value.event_name || !form.value.start_date) return alert('Event name and date are required')
  if (editingId.value) {
    await supabase.from('events').update({ ...form.value }).eq('id', editingId.value)
  } else {
    await supabase.from('events').insert([{ ...form.value }])
  }
  cancelForm(); fetchEvents()
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return
  await supabase.from('events').delete().eq('id', id)
  fetchEvents()
}

function isPast(startDate, duration) {
  const end = new Date(startDate)
  end.setDate(end.getDate() + (duration || 1))
  return end < new Date()
}

function daysUntil(startDate) {
  const diff = new Date(startDate) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(fetchEvents)
</script>

<style scoped>
.container { max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

h1 { font-size: 2rem; font-weight: 700; color: var(--text-main); }
.subtitle { color: var(--text-muted); margin-top: 0.25rem; font-size: 0.92rem; }

/* IMPORT BAR */
.import-label { background: var(--bg-card); border: 1px solid var(--border-main); padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 600; color: var(--text-main); }
.import-label:hover { background: var(--border-light); }

/* FILTERS */
.filters-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filter-select { 
  padding: 0.6rem 1rem; border: 1px solid var(--border-main); border-radius: 10px; 
  font-size: 0.9rem; color: var(--text-main); background: var(--bg-card); cursor: pointer; 
}
.btn-clear { background: var(--border-light); color: var(--text-muted); border: none; padding: 0.6rem 1rem; border-radius: 10px; cursor: pointer; font-size: 0.85rem; }
.results-count { margin-left: auto; font-size: 0.85rem; color: var(--text-muted); }

/* FORM */
.form-card { background: var(--bg-card); padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid var(--border-main); box-shadow: 0 4px 24px rgba(0,0,0,0.2); }
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select { width: 100%; padding: 0.7rem 1rem; background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 10px; font-size: 0.92rem; color: var(--text-main); font-family: 'Inter', sans-serif; }
textarea { resize: vertical; margin-top: 0.75rem; }

/* CONTINENTS SECION */
.continent-section { margin-bottom: 3.5rem; }
.continent-title { font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 1.5rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--border-light); }

/* CARDS */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
.event-card { background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-main); padding: 1.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 0.75rem; transition: transform 0.2s; }
.event-card:hover { transform: translateY(-2px); border-color: var(--primary); }
.event-card.expired { opacity: 0.6; filter: grayscale(0.5); border-style: dashed; }

.card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.event-name { font-size: 1rem; font-weight: 700; color: var(--text-main); }
.event-location { font-size: 0.83rem; color: var(--text-muted); margin-top: 0.2rem; }

.card-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }
.btn-edit { background: var(--border-light); color: var(--primary); border: none; padding: 0.35rem 0.7rem; border-radius: 8px; cursor: pointer; }
.btn-delete { background: var(--danger-bg); color: var(--danger-text); border: none; padding: 0.35rem 0.7rem; border-radius: 8px; cursor: pointer; }

.event-dates { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.date-badge { background: rgba(79, 70, 229, 0.15); color: var(--primary); padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.82rem; font-weight: 600; }
.duration-badge { background: var(--success-bg); color: var(--success-text); padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.82rem; font-weight: 600; }

.expired-label { color: var(--danger-text); font-size: 0.85rem; font-weight: 600; }
.days-left { color: var(--warning-text); font-size: 0.85rem; font-weight: 600; }

.btn-register { display: inline-block; background: var(--primary); color: white; padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 700; text-align: center; width: 100%; }

.card-notes { font-size: 0.82rem; color: var(--text-muted); font-style: italic; border-top: 1px solid var(--border-light); padding-top: 0.5rem; }

.btn-primary { background: var(--primary); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 700; }
.btn-secondary { background: var(--border-light); color: var(--text-main); border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-weight: 600; }
.loading, .empty { text-align: center; padding: 3rem; color: var(--text-muted); }
</style>