<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>📅 Events Manager</h1>
        <p class="subtitle">Gestiona ferias y eventos textiles a nivel mundial</p>
      </div>
      <div class="header-actions">
        <div class="view-toggle">
          <button @click="currentView = 'list'" :class="{ active: currentView === 'list' }">
            📄 Lista
          </button>
          <button @click="currentView = 'kanban'" :class="{ active: currentView === 'kanban' }">
            📋 Kanban
          </button>
        </div>

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
      <textarea v-model="form.notes" placeholder="Notes (Description)" rows="2"></textarea>
      <div class="form-actions">
        <button @click="saveEvent" class="btn-primary">
          {{ editingId ? 'Update Event' : 'Save Event' }}
        </button>
        <button @click="cancelForm" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Cargando eventos...</div>
    <div v-else-if="filteredEvents.length === 0" class="empty">No hay eventos que coincidan con los filtros.</div>
    
    <div v-else-if="currentView === 'list'" class="list-view">
      <div class="list-header">
        <div class="col-main">Event Details</div>
        <div class="col-date">Date & Duration</div>
        <div class="col-status">Status</div>
        <div class="col-actions">Actions</div>
      </div>
      
      <div v-for="e in filteredEvents" :key="e.id" class="list-row" :class="{ expired: isPast(e.start_date, e.duration_days) }">
        
        <div class="col-main">
          <div class="event-title-group">
            <strong class="event-title">{{ e.event_name }}</strong>
            <span class="event-loc-sub">📍 {{ [e.city, e.country].filter(Boolean).join(', ') || 'Ubicación no especificada' }}</span>
          </div>
          <div v-if="e.notes" class="event-desc-preview">{{ e.notes }}</div>
          <a v-if="e.registration_url" :href="e.registration_url" target="_blank" class="btn-link-small">🔗 Link de Registro / Info</a>
        </div>

        <div class="col-date">
          <span class="date-text">🗓 {{ formatDate(e.start_date) }}</span>
          <span class="compact-duration">{{ e.duration_days }} day{{ e.duration_days > 1 ? 's' : '' }}</span>
        </div>
        
        <div class="col-status">
          <span v-if="isPast(e.start_date, e.duration_days)" class="status-badge past">⛔ Passed</span>
          <span v-else class="status-badge upcoming">⏳ In {{ daysUntil(e.start_date) }} days</span>
        </div>
        
        <div class="col-actions">
          <button @click="editEvent(e)" class="btn-icon" title="Edit">✏️</button>
          <button @click="deleteEvent(e.id)" class="btn-icon delete" title="Delete">✕</button>
        </div>
      </div>
    </div>

    <div 
      v-else-if="currentView === 'kanban'" 
      class="kanban-board"
      ref="kanbanRef"
      @mousedown="startDrag"
      @mouseleave="stopDrag"
      @mouseup="stopDrag"
      @mousemove="doDrag"
    >
      <div v-for="(eventsList, country) in kanbanGroups" :key="country" class="kanban-column">
        <div class="kanban-col-header">
          <h3>{{ country === 'null' || !country ? 'Global / Web' : country }}</h3>
          <span class="badge-count">{{ eventsList.length }}</span>
        </div>
        
        <div class="kanban-cards">
          <div v-for="e in eventsList" :key="e.id" class="k-card" :class="{ expired: isPast(e.start_date, e.duration_days) }">
            
            <div class="k-card-top">
              <div class="k-title-group">
                <strong class="k-title">{{ e.event_name }}</strong>
                <div class="k-location">📍 {{ [e.city, e.country].filter(Boolean).join(', ') || '—' }}</div>
              </div>
              <div class="k-actions">
                <button @click="editEvent(e)" title="Edit">✏️</button>
                <button @click="deleteEvent(e.id)" class="del" title="Delete">✕</button>
              </div>
            </div>

            <div v-if="e.notes" class="k-notes">{{ e.notes }}</div>
            <a v-if="e.registration_url" :href="e.registration_url" target="_blank" class="btn-link-small k-link">🔗 Registro / Info</a>
            
            <div class="k-dates">
              <span>🗓 {{ formatDateShort(e.start_date) }}</span>
              <span class="k-status" :class="isPast(e.start_date, e.duration_days) ? 'past' : 'upcoming'">
                {{ isPast(e.start_date, e.duration_days) ? 'Passed' : daysUntil(e.start_date) + ' days left' }}
              </span>
            </div>
            
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

const currentView = ref('list')
const filterMonth = ref('')
const filterCountry = ref('')

// --- VARIABLES PARA DRAG-TO-SCROLL (KANBAN) ---
const kanbanRef = ref(null)
let isDown = false
let startX
let scrollLeft

const startDrag = (e) => {
  isDown = true
  kanbanRef.value.classList.add('active')
  startX = e.pageX - kanbanRef.value.offsetLeft
  scrollLeft = kanbanRef.value.scrollLeft
}

const stopDrag = () => {
  isDown = false
  if (kanbanRef.value) kanbanRef.value.classList.remove('active')
}

const doDrag = (e) => {
  if (!isDown) return
  e.preventDefault()
  const x = e.pageX - kanbanRef.value.offsetLeft
  const walk = (x - startX) * 2 // Velocidad de arrastre (x2)
  kanbanRef.value.scrollLeft = scrollLeft - walk
}

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

// --- LÓGICA DE FILTROS Y VISTAS ---
const availableCountries = computed(() => {
  const countries = events.value.map(e => e.country).filter(Boolean)
  return [...new Set(countries)].sort()
})

const filteredEvents = computed(() => {
  let list = events.value.filter(e => {
    const matchMonth = !filterMonth.value || (e.start_date && e.start_date.slice(5, 7) === filterMonth.value)
    const matchCountry = !filterCountry.value || e.country === filterCountry.value
    return matchMonth && matchCountry
  })
  
  return list.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
})

// --- LÓGICA DEL TABLERO KANBAN ---
const kanbanGroups = computed(() => {
  const groups = {}
  
  filteredEvents.value.forEach(e => {
    const c = e.country || 'Other'
    if (!groups[c]) groups[c] = []
    groups[c].push(e)
  })

  Object.keys(groups).forEach(country => {
    groups[country].sort((a, b) => {
      const isPastA = isPast(a.start_date, a.duration_days)
      const isPastB = isPast(b.start_date, b.duration_days)
      
      if (isPastA && !isPastB) return 1  
      if (!isPastA && isPastB) return -1 
      
      const dateA = new Date(a.start_date).getTime()
      const dateB = new Date(b.start_date).getTime()
      
      if (!isPastA && !isPastB) return dateA - dateB 
      else return dateB - dateA 
    })
  })

  return Object.keys(groups).sort().reduce((obj, key) => {
    obj[key] = groups[key]
    return obj
  }, {})
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
  end.setHours(23, 59, 59, 999) 
  return end < new Date()
}

function daysUntil(startDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const eventDate = new Date(startDate)
  const diff = eventDate - today
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days < 0 ? 0 : days
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateShort(date) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(fetchEvents)
</script>

<style scoped>
.container { max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.header-actions { display: flex; gap: 0.75rem; align-items: center; }

h1 { font-size: 2rem; font-weight: 700; color: var(--text-main); }
.subtitle { color: var(--text-muted); margin-top: 0.25rem; font-size: 0.92rem; }

/* VIEW SWITCHER */
.view-toggle { display: flex; background: var(--border-light); border-radius: 10px; padding: 4px; margin-right: 10px; }
.view-toggle button { background: transparent; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; color: var(--text-muted); font-size: 0.85rem; transition: 0.2s; }
.view-toggle button.active { background: white; color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

/* BOTOONES GENERALES */
.import-label { background: var(--bg-card); border: 1px solid var(--border-main); padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 600; color: var(--text-main); transition: 0.2s; }
.import-label:hover { background: var(--border-light); }
.btn-primary { background: var(--primary); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 700; transition: 0.2s; }
.btn-secondary { background: var(--border-light); color: var(--text-main); border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-weight: 600; }
.btn-link-small { display: inline-block; margin-top: 8px; font-size: 0.8rem; background: rgba(79, 70, 229, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 6px; text-decoration: none; font-weight: 600; transition: 0.2s; }
.btn-link-small:hover { background: var(--primary); color: white; }

/* FILTROS */
.filters-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filter-select { padding: 0.6rem 1rem; border: 1px solid var(--border-main); border-radius: 10px; font-size: 0.9rem; color: var(--text-main); background: var(--bg-card); cursor: pointer; }
.btn-clear { background: var(--border-light); color: var(--text-muted); border: none; padding: 0.6rem 1rem; border-radius: 10px; cursor: pointer; font-size: 0.85rem; }
.results-count { margin-left: auto; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }

/* FORMULARIO */
.form-card { background: var(--bg-card); padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid var(--border-main); box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select { width: 100%; padding: 0.7rem 1rem; background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 10px; font-size: 0.92rem; color: var(--text-main); }
textarea { resize: vertical; margin-top: 0.75rem; }

/* ================= VISTA DE LISTA COMPACTA ================= */
.list-view { display: flex; flex-direction: column; gap: 0.5rem; }
.list-header { display: flex; padding: 0.8rem 1.5rem; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-light); margin-bottom: 0.5rem; }
.list-row { display: flex; align-items: center; background: var(--bg-card); padding: 1.2rem 1.5rem; border-radius: 12px; border: 1px solid var(--border-main); transition: 0.2s; gap: 1rem; }
.list-row:hover { border-color: var(--primary); transform: translateX(4px); }
.list-row.expired { opacity: 0.6; background: rgba(0,0,0,0.02); }

.col-main { flex: 3; display: flex; flex-direction: column; align-items: flex-start; }
.event-title-group { display: flex; flex-direction: column; margin-bottom: 4px; }
.event-title { font-size: 1rem; color: var(--text-main); line-height: 1.2; }
.event-loc-sub { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
.event-desc-preview { font-size: 0.85rem; color: var(--text-muted); margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }

.col-date { flex: 1.5; display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 500; }
.compact-duration { color: var(--text-muted); font-size: 0.75rem; margin-top: 2px; }

.col-status { flex: 1; }
.col-actions { flex: 0.5; display: flex; gap: 0.5rem; justify-content: flex-end; }

.status-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
.status-badge.upcoming { background: rgba(79, 70, 229, 0.1); color: var(--primary); }
.status-badge.past { background: var(--border-light); color: var(--text-muted); }

.btn-icon { background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 6px; padding: 0.4rem; cursor: pointer; transition: 0.2s; }
.btn-icon:hover { background: var(--border-light); }
.btn-icon.delete:hover { background: #fee2e2; color: #dc2626; }

/* ================= VISTA KANBAN DRAGGABLE ================= */
.kanban-board { 
  display: flex; overflow-x: auto; gap: 1.5rem; padding-bottom: 1rem; align-items: flex-start;
  cursor: grab; /* Muestra manito abierta */
  user-select: none; /* Evita seleccionar texto al arrastrar */
}
.kanban-board.active {
  cursor: grabbing; /* Manito cerrada al hacer click */
}
.kanban-board::-webkit-scrollbar { height: 8px; }
.kanban-board::-webkit-scrollbar-thumb { background: var(--border-main); border-radius: 10px; }

.kanban-column { min-width: 320px; max-width: 320px; flex-shrink: 0; background: var(--bg-app); border-radius: 16px; padding: 1rem; border: 1px solid var(--border-main); }
.kanban-col-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 0.5rem; }
.kanban-col-header h3 { font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0; }
.badge-count { background: var(--border-light); color: var(--text-muted); padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; }

.kanban-cards { display: flex; flex-direction: column; gap: 0.75rem; }
.k-card { background: var(--bg-card); border-radius: 12px; padding: 1.2rem; border: 1px solid var(--border-main); box-shadow: 0 2px 8px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 0.6rem; }
.k-card.expired { opacity: 0.6; filter: grayscale(0.8); }

.k-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.k-title-group { display: flex; flex-direction: column; flex: 1; padding-right: 10px; }
.k-title { font-size: 0.95rem; font-weight: 700; line-height: 1.3; margin-bottom: 4px;}
.k-location { font-size: 0.75rem; color: var(--text-muted); }

.k-actions { display: flex; gap: 4px; }
.k-actions button { background: var(--border-light); border: none; cursor: pointer; border-radius: 6px; padding: 4px; font-size: 0.8rem; transition: 0.2s; }
.k-actions button:hover { background: var(--border-main); }
.k-actions button.del:hover { background: #fee2e2; color: #dc2626; }

.k-notes { font-size: 0.8rem; color: var(--text-muted); background: var(--bg-app); padding: 8px; border-radius: 8px; border: 1px solid var(--border-light); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }

.k-dates { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 600; padding-top: 0.5rem; margin-top: 0.5rem; border-top: 1px dashed var(--border-light); }
.k-status { font-size: 0.75rem; padding: 2px 6px; border-radius: 6px; }
.k-status.upcoming { background: rgba(79, 70, 229, 0.1); color: var(--primary); }
.k-status.past { background: var(--border-light); color: var(--text-muted); }

/* GLOBALS */
.loading, .empty { text-align: center; padding: 3rem; color: var(--text-muted); font-weight: 500; }
</style>