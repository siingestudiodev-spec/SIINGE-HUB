<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>📅 Events Manager</h1>
        <p class="subtitle">Manage worldwide textile trade shows & events</p>
      </div>
      <div class="header-actions">
        <div class="view-toggle">
          <button @click="currentView = 'list'" :class="{ active: currentView === 'list' }">
            📄 List
          </button>
          <button @click="currentView = 'kanban'" :class="{ active: currentView === 'kanban' }">
            📋 Kanban
          </button>
          <button @click="currentView = 'calendar'" :class="{ active: currentView === 'calendar' }">
            🗓️ Calendar
          </button>
        </div>

        <label class="btn-secondary import-label">
          {{ importing ? '📥 Importing...' : '📥 Import Excel' }}
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

    <div v-if="loading" class="loading">Loading events...</div>
    <div v-else-if="filteredEvents.length === 0" class="empty">No events match your filters.</div>
    
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
            <span class="event-loc-sub">📍 {{ [e.city, e.country].filter(Boolean).join(', ') || 'Location not specified' }}</span>
          </div>
          <div v-if="e.notes" class="event-desc-preview clickable-notes" @click="openNoteModal(e)">
            {{ e.notes }} <span class="read-more-text">(read more)</span>
          </div>
          <a v-if="e.registration_url" :href="e.registration_url" target="_blank" class="btn-link-small">🔗 Register / Info</a>
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
            <div v-if="e.notes" class="k-notes clickable-notes" @click="openNoteModal(e)">
              {{ e.notes }} <span class="read-more-text">(read more)</span>
            </div>
            <a v-if="e.registration_url" :href="e.registration_url" target="_blank" class="btn-link-small k-link">🔗 Register / Info</a>
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

    <div v-else-if="currentView === 'calendar'" class="calendar-card-wrapper">
      <div class="calendar-controls-wrapper">
        <div class="calendar-controls">
          <button @click="changeMonth(-1)" class="btn-icon">◀</button>
          <h2 class="month-title">{{ currentMonthName }} {{ currentYear }}</h2>
          <button @click="changeMonth(1)" class="btn-icon">▶</button>
          <button @click="goToToday" class="btn-secondary ml-3">Today</button>
        </div>
      </div>

      <div class="calendar-card">
        <div class="calendar-grid">
          <div class="weekday" v-for="day in weekDays" :key="day">{{ day }}</div>
          
          <div 
            v-for="(cell, index) in calendarCells" 
            :key="index" 
            class="day-cell"
            :class="{ 'is-empty': !cell.date, 'is-today': isToday(cell.date) }"
          >
            <div v-if="cell.date" class="day-number-container">
              <span class="day-number">{{ cell.dayNumber }}</span>
            </div>
            
            <div class="events-list" v-if="cell.date">
              <div 
                v-for="e in getEventsForDate(cell.date)" 
                :key="e.id" 
                class="task-badge"
                :class="getEventCalendarClass(e)"
                :title="e.event_name + ' - ' + (e.country || 'Global')"
                @click="openNoteModal(e)"
              >
                <strong>{{ e.event_name || 'Unnamed Event' }}</strong>
                <span>📌 {{ e.country || 'Global' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showNoteModal" class="modal-overlay" @click.self="closeNoteModal">
      <div class="modal-content card-notes-modal">
        <div class="modal-header">
          <h3>{{ selectedNoteEvent?.event_name }}</h3>
          <button @click="closeNoteModal" class="btn-close-modal">✕</button>
        </div>
        <div class="modal-body-scroll">
          <p class="full-notes-text">{{ selectedNoteEvent?.notes }}</p>
        </div>
        <div class="modal-footer" v-if="selectedNoteEvent?.registration_url">
          <a :href="selectedNoteEvent?.registration_url" target="_blank" class="btn-primary btn-full-width">
            🔗 Go to Registration / Official Info
          </a>
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

// --- MODAL VARIABLES ---
const showNoteModal = ref(false)
const selectedNoteEvent = ref(null)

function openNoteModal(event) {
  selectedNoteEvent.value = event
  showNoteModal.value = true
}

function closeNoteModal() {
  showNoteModal.value = false
  selectedNoteEvent.value = null
}

// --- CALENDAR LOGIC ---
const currentDate = ref(new Date())
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const currentMonthName = computed(() => {
  return currentDate.value.toLocaleString('en-US', { month: 'long' })
})
const currentYear = computed(() => currentDate.value.getFullYear())

const calendarCells = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ date: null, dayNumber: '' })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    cells.push({ date: dateStr, dayNumber: i })
  }
  return cells
})

function getEventsForDate(dateStr) {
  return filteredEvents.value.filter(e => e.start_date === dateStr)
}

function getEventCalendarClass(e) {
  if (isPast(e.start_date, e.duration_days)) return 'event-passed'
  return 'event-upcoming'
}

function changeMonth(offset) {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + offset)
  currentDate.value = newDate
}

function goToToday() {
  currentDate.value = new Date()
}

function isToday(dateStr) {
  if (!dateStr) return false
  const todayStr = new Date().toLocaleDateString('en-CA') 
  return dateStr === todayStr
}

// --- DRAG-TO-SCROLL (KANBAN) ---
const kanbanRef = ref(null)
let isDown = false
let startX
let scrollLeft

const startDrag = (e) => {
  if (e.target.closest('.clickable-notes') || e.target.closest('button') || e.target.closest('a')) return;
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
  const walk = (x - startX) * 1.5
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

// --- IMPORT LOGIC ---
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
      
      alert(`Success! Imported ${count} events.`)
      fetchEvents()
    } catch (err) {
      console.error("Critical error:", err)
      alert("Error processing the Excel file. Check the console.")
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

// --- CORE SORTING LOGIC ---
const sortEvents = (a, b) => {
  const isPastA = isPast(a.start_date, a.duration_days)
  const isPastB = isPast(b.start_date, b.duration_days)
  
  if (isPastA && !isPastB) return 1  
  if (!isPastA && isPastB) return -1 
  
  return new Date(a.start_date) - new Date(b.start_date)
}

// --- FILTERS & VIEWS LOGIC ---
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
  
  return list.sort(sortEvents)
})

const kanbanGroups = computed(() => {
  const groups = {}
  filteredEvents.value.forEach(e => {
    const c = e.country || 'Other'
    if (!groups[c]) groups[c] = []
    groups[c].push(e)
  })

  Object.keys(groups).forEach(country => {
    groups[country].sort(sortEvents)
  })

  return Object.keys(groups).sort().reduce((obj, key) => {
    obj[key] = groups[key]
    return obj
  }, {})
})

function clearFilters() { filterMonth.value = ''; filterCountry.value = '' }
function openAddForm() { editingId.value = null; form.value = emptyForm(); showForm.value = true }
function editEvent(e) { editingId.value = e.id; form.value = { ...e }; showForm.value = true; window.scrollTo({ top: 0, behavior: 'smooth' }) }
function cancelForm() { showForm.value = false; editingId.value = null }

async function fetchEvents() {
  loading.value = true
  const { data } = await supabase.from('events').select('*').order('start_date')
  events.value = data || []
  loading.value = false
}

async function saveEvent() {
  if (!form.value.event_name || !form.value.start_date) return alert('Event name and date are required')
  if (editingId.value) { await supabase.from('events').update({ ...form.value }).eq('id', editingId.value)
  } else { await supabase.from('events').insert([{ ...form.value }]) }
  cancelForm(); fetchEvents()
}

async function deleteEvent(id) {
  if (!confirm('Delete this event?')) return
  await supabase.from('events').delete().eq('id', id); fetchEvents()
}

function isPast(startDate, duration) {
  const end = new Date(startDate)
  end.setDate(end.getDate() + (duration || 1))
  end.setHours(23, 59, 59, 999) 
  return end < new Date()
}

function daysUntil(startDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const eventDate = new Date(startDate)
  const diff = eventDate - today
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days < 0 ? 0 : days
}

function formatDate(date) { return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
function formatDateShort(date) { return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }

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

/* BUTTONS */
.import-label { background: var(--bg-card); border: 1px solid var(--border-main); padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 600; color: var(--text-main); transition: 0.2s; }
.import-label:hover { background: var(--border-light); }
.btn-primary { background: var(--primary); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 700; transition: 0.2s; }
.btn-secondary { background: var(--border-light); color: var(--text-main); border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-weight: 600; }
.btn-link-small { display: inline-block; margin-top: 8px; font-size: 0.8rem; background: rgba(79, 70, 229, 0.1); color: var(--primary); padding: 4px 10px; border-radius: 6px; text-decoration: none; font-weight: 600; transition: 0.2s; }
.btn-link-small:hover { background: var(--primary); color: white; }

/* FILTERS */
.filters-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filter-select { padding: 0.6rem 1rem; border: 1px solid var(--border-main); border-radius: 10px; font-size: 0.9rem; color: var(--text-main); background: var(--bg-card); cursor: pointer; }
.btn-clear { background: var(--border-light); color: var(--text-muted); border: none; padding: 0.6rem 1rem; border-radius: 10px; cursor: pointer; font-size: 0.85rem; }
.results-count { margin-left: auto; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }

/* FORM */
.form-card { background: var(--bg-card); padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid var(--border-main); box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select { width: 100%; padding: 0.7rem 1rem; background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 10px; font-size: 0.92rem; color: var(--text-main); }
textarea { resize: vertical; margin-top: 0.75rem; }

/* ================= COMPACT LIST VIEW ================= */
.list-view { display: flex; flex-direction: column; gap: 0.5rem; }
.list-header { display: flex; padding: 0.8rem 1.5rem; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-light); margin-bottom: 0.5rem; }
.list-row { display: flex; align-items: center; background: var(--bg-card); padding: 1.2rem 1.5rem; border-radius: 12px; border: 1px solid var(--border-main); transition: 0.2s; gap: 1rem; }
.list-row:hover { border-color: var(--primary); transform: translateX(4px); }
.list-row.expired { opacity: 0.7; background: rgba(0,0,0,0.01); border-style: dashed;}

.col-main { flex: 3; display: flex; flex-direction: column; align-items: flex-start; }
.event-title-group { display: flex; flex-direction: column; margin-bottom: 4px; }
.event-title { font-size: 1rem; color: var(--text-main); line-height: 1.2; }
.event-loc-sub { font-size: 0.8rem; color: #555; margin-top: 2px; } 
.event-desc-preview { font-size: 0.85rem; color: #444; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }

.col-date { flex: 1.5; display: flex; flex-direction: column; font-size: 0.85rem; font-weight: 500; }
.date-text { color: var(--text-main); }
.compact-duration { color: #555; font-size: 0.75rem; margin-top: 2px; }

.col-status { flex: 1; }
.col-actions { flex: 0.5; display: flex; gap: 0.5rem; justify-content: flex-end; }

.status-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
.status-badge.upcoming { background: rgba(79, 70, 229, 0.1); color: var(--primary); }
.status-badge.past { background: var(--border-light); color: #666; }

.btn-icon { background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 6px; padding: 0.4rem; cursor: pointer; transition: 0.2s; }
.btn-icon:hover { background: var(--border-light); }
.btn-icon.delete:hover { background: #fee2e2; color: #dc2626; }

/* CLICKABLE NOTES GLOBALS */
.clickable-notes { cursor: pointer; transition: 0.2s; }
.clickable-notes:hover { background: rgba(79, 70, 229, 0.04); border-radius: 4px;}
.read-more-text { color: var(--primary); font-size: 0.8rem; font-weight: 600; margin-left: 3px;}

/* ================= DRAGGABLE KANBAN VIEW ================= */
.kanban-board { 
  display: flex; overflow-x: auto; gap: 1.5rem; padding-bottom: 1rem; align-items: flex-start;
  cursor: grab; user-select: none;
}
.kanban-board.active { cursor: grabbing; }
.kanban-board::-webkit-scrollbar { height: 8px; }
.kanban-board::-webkit-scrollbar-thumb { background: var(--border-main); border-radius: 10px; }

.kanban-column { min-width: 320px; max-width: 320px; flex-shrink: 0; background: var(--bg-app); border-radius: 16px; padding: 1rem; border: 1px solid var(--border-main); }
.kanban-col-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 0.5rem; }
.kanban-col-header h3 { font-size: 1.1rem; font-weight: 800; color: var(--text-main); margin: 0; }
.badge-count { background: var(--border-light); color: var(--text-muted); padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; }

.kanban-cards { display: flex; flex-direction: column; gap: 0.75rem; }
.k-card { background: var(--bg-card); border-radius: 12px; padding: 1.2rem; border: 1px solid var(--border-main); box-shadow: 0 2px 8px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 0.6rem; }
.k-card.expired { opacity: 0.7; filter: grayscale(0.5); border-style: dashed;}

.k-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.k-title-group { display: flex; flex-direction: column; flex: 1; padding-right: 10px; }
.k-title { font-size: 0.95rem; font-weight: 700; line-height: 1.3; margin-bottom: 4px; color: var(--text-main);}
.k-location { font-size: 0.75rem; color: #555; }

.k-actions { display: flex; gap: 4px; }
.k-actions button { background: var(--border-light); border: none; cursor: pointer; border-radius: 6px; padding: 4px; font-size: 0.8rem; transition: 0.2s; }
.k-actions button:hover { background: var(--border-main); }
.k-actions button.del:hover { background: #fee2e2; color: #dc2626; }

.k-notes { font-size: 0.85rem; color: #444; background: #f9fafb; padding: 10px; border-radius: 8px; border: 1px solid var(--border-light); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }

.k-dates { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; font-weight: 600; padding-top: 0.6rem; margin-top: 0.4rem; border-top: 1px dashed var(--border-light); color: var(--text-main); }
.k-status { font-size: 0.75rem; padding: 2px 6px; border-radius: 6px; }
.k-status.upcoming { background: rgba(79, 70, 229, 0.1); color: var(--primary); }
.k-status.past { background: var(--border-light); color: #666; }

.btn-link-small.k-link { width: 100%; text-align: center; margin-top: 4px;}

/* ================= CALENDAR VIEW (SPECIFIC TO EVENTS.VUE) ================= */
.calendar-card-wrapper { display: flex; flex-direction: column; gap: 1rem; }
.calendar-controls-wrapper { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.calendar-controls { display: flex; align-items: center; gap: 0.75rem; }
.month-title { font-size: 1.2rem; font-weight: 600; color: var(--text-main); margin: 0; min-width: 160px; text-align: center; }
.ml-3 { margin-left: 0.5rem; }

.calendar-card { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 8px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); overflow: hidden; }
:root.light-mode .calendar-card { border: 1.5px solid var(--border-main); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); }

.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); border-top: 1px solid var(--border-main); border-left: 1px solid var(--border-main); }
:root.light-mode .calendar-grid { border-top: 1.5px solid var(--border-main); border-left: 1.5px solid var(--border-main); }

.weekday { background: var(--bg-app); padding: 0.6rem 0.5rem; text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-right: 1px solid var(--border-main); border-bottom: 1px solid var(--border-main); }
:root.light-mode .weekday { border-right: 1.5px solid var(--border-main); border-bottom: 1.5px solid var(--border-main); }

.day-cell { min-height: 120px; padding: 0.4rem; border-right: 1px solid var(--border-main); border-bottom: 1px solid var(--border-main); background: var(--bg-card); display: flex; flex-direction: column; transition: background 0.15s; }
.day-cell:hover:not(.is-empty) { background: rgba(79, 70, 229, 0.04); }
.day-cell.is-empty { background: rgba(0, 0, 0, 0.08); }
:root.light-mode .day-cell.is-empty { background: rgba(0, 0, 0, 0.02); }
.day-cell.is-today { background: rgba(79, 70, 229, 0.08); }
:root.light-mode .day-cell { border-right: 1.5px solid var(--border-main); border-bottom: 1.5px solid var(--border-main); }
:root.light-mode .day-cell:hover:not(.is-empty) { background: rgba(79, 70, 229, 0.05); }

.day-number-container { display: flex; justify-content: flex-end; margin-bottom: 0.3rem; }
.day-number { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
.day-cell.is-today .day-number { background: var(--primary); color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }

.events-list { display: flex; flex-direction: column; gap: 0.35rem; flex-grow: 1; overflow-y: auto; max-height: 120px; }
.task-badge { padding: 0.35rem 0.5rem; border-radius: 4px; font-size: 0.7rem; line-height: 1.3; display: flex; flex-direction: column; border-left: 3px solid transparent; cursor: pointer; transition: all 0.15s; }
.task-badge:hover { transform: translateY(-1px); opacity: 0.9; }
.task-badge strong { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.task-badge span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.85; font-size: 0.65rem; margin-top: 2px;}

.event-upcoming { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border-left-color: #8b5cf6; }
.event-passed { background: var(--border-light); color: var(--text-muted); border-left-color: var(--text-muted); border-style: dashed; border-width: 1px; border-left-width: 2px; border-left-style: solid; }

/* ================= MODAL STYLES ================= */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; animation: fadeIn 0.2s ease-out; }
.modal-content { background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 90%; max-width: 650px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; animation: slideUp 0.3s ease-out; }
.card-notes-modal { border: 1px solid var(--border-main); }

.modal-header { padding: 1.5rem; border-bottom: 1px solid var(--border-light); display: flex; justify-content: space-between; align-items: center; background: #f9fafb; }
.modal-header h3 { font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin: 0; }
.btn-close-modal { background: none; border: none; font-size: 1.2rem; color: var(--text-muted); cursor: pointer; padding: 5px; border-radius: 6px; transition: 0.2s; }
.btn-close-modal:hover { background: rgba(0,0,0,0.05); color: var(--text-main); }

.modal-body-scroll { padding: 2rem; overflow-y: auto; flex: 1; }
.full-notes-text { font-size: 1rem; color: #333; line-height: 1.7; white-space: pre-wrap; margin: 0; }

.modal-footer { padding: 1.5rem; border-top: 1px solid var(--border-light); background: white; }
.btn-full-width { width: 100%; text-align: center; justify-content: center; display: flex; align-items: center; text-decoration: none; font-size: 1rem; padding: 0.8rem; background: var(--primary); color: white; border-radius: 8px; font-weight: bold;}

/* ANIMATIONS */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

/* GLOBALS */
.loading, .empty { text-align: center; padding: 3rem; color: var(--text-muted); font-weight: 500; }
</style>