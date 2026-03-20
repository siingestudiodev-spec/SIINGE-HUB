<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>📅 Events 2026</h1>
        <p class="subtitle">Trade shows & industry events</p>
      </div>
      <button @click="showForm = !showForm" class="btn-primary">
        {{ showForm ? 'Cancel' : '+ Add Event' }}
      </button>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>New Event</h2>
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
        <button @click="saveEvent" class="btn-primary">Save Event</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="events.length === 0" class="empty">No events yet. Add the first one!</div>
    <div v-else class="cards-grid">
      <div v-for="e in events" :key="e.id" class="event-card" :class="{ expired: isPast(e.start_date, e.duration_days) }">
        <div class="card-top">
          <div>
            <strong class="event-name">{{ e.event_name }}</strong>
            <div class="event-location">📍 {{ [e.city, e.country].filter(Boolean).join(', ') || '—' }}</div>
          </div>
          <button @click="deleteEvent(e.id)" class="btn-delete">✕</button>
        </div>

        <div class="event-dates">
          <span class="date-badge">🗓 {{ formatDate(e.start_date) }}</span>
          <span class="duration-badge">{{ e.duration_days }} day{{ e.duration_days > 1 ? 's' : '' }}</span>
        </div>

        <div v-if="isPast(e.start_date, e.duration_days)" class="expired-label">⛔ Event has passed</div>
        <div v-else class="days-left">⏳ {{ daysUntil(e.start_date) }} days away</div>

        <div v-if="e.registration_url" class="card-actions">
          <a :href="e.registration_url" target="_blank" class="btn-register">🔗 Register</a>
        </div>

        <div v-if="e.notes" class="card-notes">{{ e.notes }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const events = ref([])
const loading = ref(true)
const showForm = ref(false)

const form = ref({
  event_name: '', country: '', city: '',
  start_date: '', duration_days: '', registration_url: '', notes: ''
})

async function fetchEvents() {
  loading.value = true
  const { data } = await supabase.from('events').select('*').order('start_date')
  events.value = data || []
  loading.value = false
}

async function saveEvent() {
  if (!form.value.event_name || !form.value.start_date) return alert('Event name and date are required')
  await supabase.from('events').insert([{ ...form.value }])
  form.value = { event_name: '', country: '', city: '', start_date: '', duration_days: '', registration_url: '', notes: '' }
  showForm.value = false
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

.form-card { background: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1.5px solid #e5e7eb; box-shadow: 0 4px 24px rgba(79,70,229,0.07); }
.form-card h2 { font-size: 1.1rem; margin-bottom: 1.25rem; color: #1a1a2e; }
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.92rem; color: #1a1a2e; background: white; font-family: 'Inter', sans-serif; transition: border-color 0.15s; box-sizing: border-box; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; margin-top: 0.75rem; }
.form-actions { margin-top: 1rem; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem; }
.event-card { background: white; border-radius: 16px; border: 1.5px solid #e5e7eb; padding: 1.5rem; box-shadow: 0 4px 24px rgba(79,70,229,0.07); display: flex; flex-direction: column; gap: 0.75rem; transition: border-color 0.2s; }
.event-card.expired { background: #fff5f5; border-color: #fecaca; }

.card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.event-name { font-size: 1rem; font-weight: 700; color: #1a1a2e; }
.event-location { font-size: 0.83rem; color: #9ca3af; margin-top: 0.2rem; }

.event-dates { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.date-badge { background: #eef2ff; color: #4f46e5; padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.82rem; font-weight: 500; }
.duration-badge { background: #f0fdf4; color: #16a34a; padding: 0.25rem 0.7rem; border-radius: 20px; font-size: 0.82rem; font-weight: 500; }

.expired-label { color: #e11d48; font-size: 0.85rem; font-weight: 600; }
.days-left { color: #f59e0b; font-size: 0.85rem; font-weight: 600; }

.btn-register { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
.btn-register:hover { opacity: 0.9; }

.card-notes { font-size: 0.82rem; color: #9ca3af; font-style: italic; }

.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; font-family: 'Inter', sans-serif; transition: opacity 0.15s, transform 0.15s; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-delete { background: #fff1f2; color: #e11d48; border: none; padding: 0.35rem 0.7rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-delete:hover { background: #ffe4e6; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }
</style>
