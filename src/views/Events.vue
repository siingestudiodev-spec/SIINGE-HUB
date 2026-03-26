<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>📅 Events 2026</h1>
        <p class="subtitle">Trade shows & industry events</p>
      </div>
      <button @click="openAddForm" class="btn-primary">+ Add Event</button>
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
  start_date: '', duration_days: '', registration_url: '', notes: ''
})

const form = ref(emptyForm())

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
h1 { font-size: 2rem; font-weight: 700; color: var(--text-main); }
.subtitle { color: var(--text-muted); margin-top: 0.25rem; font-size: 0.92rem; }

/* FILTERS */
.filters-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filter-select { 
  padding: 0.6rem 1rem; border: 1px solid var(--border-main); border-radius: 10px; 
  font-size: 0.9rem; color: var(--text-main); background: var(--bg-card); cursor: pointer; 
}
.btn-clear { background: var(--border-light); color: var(--text-muted); border: none; padding: 0.6rem 1rem; border-radius: 10px; cursor: pointer; font-size: 0.85rem; }
.btn-clear:hover { background: var(--border-main); color: var(--text-main); }
.results-count { margin-left: auto; font-size: 0.85rem; color: var(--text-muted); }

/* FORM */
.form-card { background: var(--bg-card); padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1px solid var(--border-main); box-shadow: 0 4px 24px rgba(0,0,0,0.2); }
.form-card h2 { font-size: 1.1rem; margin-bottom: 1.25rem; color: var(--text-main); }
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select { 
  width: 100%; padding: 0.7rem 1rem; background: var(--bg-app); 
  border: 1px solid var(--border-main); border-radius: 10px; 
  font-size: 0.92rem; color: var(--text-main); font-family: 'Inter', sans-serif; 
}
textarea { resize: vertical; margin-top: 0.75rem; }
.form-actions { margin-top: 1rem; display: flex; gap: 0.75rem; }

/* CARDS */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem; }
.event-card { 
  background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-main); 
  padding: 1.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.1); display: flex; 
  flex-direction: column; gap: 0.75rem; transition: transform 0.2s; 
}
.event-card:hover { transform: translateY(-2px); border-color: var(--primary); }

/* Estilo para eventos pasados */
.event-card.expired { 
  opacity: 0.6; 
  background: rgba(0,0,0,0.2);
  border-style: dashed;
}

.card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.event-name { font-size: 1rem; font-weight: 700; color: var(--text-main); }
.event-location { font-size: 0.83rem; color: var(--text-muted); margin-top: 0.2rem; }

.card-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }
.btn-edit { background: var(--border-light); color: var(--primary); border: none; padding: 0.35rem 0.7rem; border-radius: 8px; cursor: pointer; }
.btn-delete { background: var(--danger-bg); color: var(--danger-text); border: none; padding: 0.35rem 0.7rem; border-radius: 8px; cursor: pointer; }

.event-dates { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.date-badge { background: rgba(79, 70, 229, 0.15); color: var(--primary); padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.82rem; font-weight: 600; }
.duration-badge { background: var(--success-bg); color: var(--success-text); padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.82rem; font-weight: 600; }

.expired-label { color: var(--danger-text); font-size: 0.85rem; font-weight: 600; }
.days-left { color: var(--warning-text); font-size: 0.85rem; font-weight: 600; }

.btn-register { 
  display: inline-block; background: var(--primary); color: white; 
  padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; 
  font-size: 0.85rem; font-weight: 700; text-align: center; width: 100%;
}
.btn-register:hover { filter: brightness(1.1); }

.card-notes { font-size: 0.82rem; color: var(--text-muted); font-style: italic; border-top: 1px solid var(--border-light); pt: 0.5rem; }

.btn-primary { 
  background: var(--primary); color: white; border: none; padding: 0.65rem 1.3rem; 
  border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 700; 
}
.btn-secondary { background: var(--border-light); color: var(--text-main); border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-weight: 600; }
.loading, .empty { text-align: center; padding: 3rem; color: var(--text-muted); }
</style>