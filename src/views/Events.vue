<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>📅 Events 2026</h1>
        <p class="subtitle">Trade shows & industry events</p>
      </div>
      <button @click="openAddForm" class="btn-primary">+ Add Event</button>
    </div>

    <!-- FILTERS - NEW -->
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

    <!-- FORM (Add & Edit) -->
    <div v-if="showForm" class="form-card">
      <h2>{{ editingId ? 'Edit Event' : 'New Event' }}</h2>
      <div class="form-grid">
        <input v-model="form.event_name" placeholder="Event Name *" />
        <input v-model="form.country" placeholder="Country" />
        <input v-model="form.city" placeholder="City" />
        <input v-model="form.start_date" type="date" />
        <select v-model.number="form.duration_days">
          <option value="" disabled>Duration</option>
          <option :value="1">1 day</option>
          <option :value="2">2 days</option>
          <option :value="3">3 days</option>
          <option :value="4">4 days</option>
          <option :value="5">5 days</option>
        </select>
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

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="filteredEvents.length === 0" class="empty">No events match your filters.</div>
    <div v-else class="cards-grid">
      <div v-for="e in filteredEvents" :key="e.id" class="event-card" :class="{ expired: isPast(e.start_date, e.duration_days) }">
        <div class="card-top">
          <div>
            <strong class="event-name">{{ e.event_name }}</strong>
            <div class="event-location">📍 {{ [e.city, e.country].filter(Boolean).join(', ') || '—' }}</div>
          </div>
          <!-- EDIT & DELETE - NEW -->
          <div class="card-actions">
            <button @click="editEvent(e)" class="btn-edit">✏️</button>
            <button @click="deleteEvent(e.id)" class="btn-delete">✕</button>
          </div>
        </div>

        <div class="event-dates">
          <span class="date-badge">🗓 {{ formatDate(e.start_date) }}</span>
          <span class="duration-badge">{{ e.duration_days }} day{{ e.duration_days > 1 ? 's' : '' }}</span>
        </div>

        <div v-if="isPast(e.start_date, e.duration_days)" class="expired-label">⛔ Event has passed</div>
        <div v-else class="days-left">⏳ {{ daysUntil(e.start_date) }} days away</div>

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

const events = ref([])
const loading = ref(true)
const showForm = ref(false)
const editingId = ref(null) // NEW

// FILTERS - NEW
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
  start_date: '', duration_days: '', registration_url: '', notes: ''
})

const form = ref(emptyForm())

// COMPUTED - NEW
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

// OPEN FORM FOR ADD - NEW
function openAddForm() {
  editingId.value = null
  form.value = emptyForm()
  showForm.value = true
}

// EDIT EVENT - NEW
function editEvent(e) {
  editingId.value = e.id
  form.value = {
    event_name: e.event_name || '',
    country: e.country || '',
    city: e.city || '',
    start_date: e.start_date || '',
    duration_days: e.duration_days || '',
    registration_url: e.registration_url || '',
    notes: e.notes || ''
  }
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
  form.value = emptyForm()
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
    // UPDATE - NEW
    await supabase.from('events').update({ ...form.value }).eq('id', editingId.value)
  } else {
    await supabase.from('events').insert([{ ...form.value }])
  }

  cancelForm()
  fetchEvents()
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
h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; }
.subtitle { color: #6b7280; margin-top: 0.25rem; font-size: 0.92rem; }

/* FILTERS - NEW */
.filters-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filter-select { padding: 0.6rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.9rem; color: #1a1a2e; background: white; cursor: pointer; font-family: 'Inter', sans-serif; }
.filter-select:focus { outline: none; border-color: #4f46e5; }
.btn-clear { background: #f3f4f6; color: #6b7280; border: none; padding: 0.6rem 1rem; border-radius: 10px; cursor: pointer; font-size: 0.85rem; }
.btn-clear:hover { background: #e5e7eb; }
.results-count { margin-left: auto; font-size: 0.85rem; color: #9ca3af; }

.form-card { background: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1.5px solid #e5e7eb; box-shadow: 0 4px 24px rgba(79,70,229,0.07); }
.form-card h2 { font-size: 1.1rem; margin-bottom: 1.25rem; color: #1a1a2e; }
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.92rem; color: #1a1a2e; background: white; font-family: 'Inter', sans-serif; transition: border-color 0.15s; box-sizing: border-box; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; margin-top: 0.75rem; }
.form-actions { margin-top: 1rem; display: flex; gap: 0.75rem; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem; }
.event-card { background: white; border-radius: 16px; border: 1.5px solid #e5e7eb; padding: 1.5rem; box-shadow: 0 4px 24px rgba(79,70,229,0.07); display: flex; flex-direction: column; gap: 0.75rem; transition: border-color 0.2s; }
.event-card.expired { background: #fff5f5; border-color: #fecaca; }

.card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.event-name { font-size: 1rem; font-weight: 700; color: #1a1a2e; }
.event-location { font-size: 0.83rem; color: #9ca3af; margin-top: 0.2rem; }

/* CARD ACTIONS - NEW */
.card-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }
.btn-edit { background: #eff6ff; color: #3b82f6; border: none; padding: 0.35rem 0.7rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-edit:hover { background: #dbeafe; }

.event-dates { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.date-badge { background: #eef2ff; color: #4f46e5; padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.82rem; font-weight: 500; }
.duration-badge { background: #f0fdf4; color: #16a34a; padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.82rem; font-weight: 500; }

.expired-label { color: #e11d48; font-size: 0.85rem; font-weight: 600; }
.days-left { color: #f59e0b; font-size: 0.85rem; font-weight: 600; }

.card-link { display: flex; }
.btn-register { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
.btn-register:hover { opacity: 0.9; }

.card-notes { font-size: 0.82rem; color: #9ca3af; font-style: italic; }

.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; font-family: 'Inter', sans-serif; transition: opacity 0.15s, transform 0.15s; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary { background: #f3f4f6; color: #6b7280; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; font-family: 'Inter', sans-serif; }
.btn-secondary:hover { background: #e5e7eb; }
.btn-delete { background: #fff1f2; color: #e11d48; border: none; padding: 0.35rem 0.7rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-delete:hover { background: #ffe4e6; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }
</style>
