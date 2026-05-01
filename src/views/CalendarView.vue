<template>
  <div class="container">
    <div class="header">
      <h1>Calendar</h1>
      <div class="calendar-controls">
        <button @click="changeMonth(-1)" class="btn-icon">◀</button>
        <h2 class="month-title">{{ currentMonthName }} {{ currentYear }}</h2>
        <button @click="changeMonth(1)" class="btn-icon">▶</button>
        <button @click="goToToday" class="btn-secondary ml-3">Today</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading schedule...</div>
    <div v-else class="calendar-card">
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
              v-for="item in getItemsForDate(cell.date)" 
              :key="item.type + item.id" 
              class="task-badge"
              :class="getItemClass(item)"
              :title="getItemTitle(item)"
              @click="handleItemClick(item)"
            >
              <strong>{{ getItemMainText(item) }}</strong>
              <span>{{ getItemSubText(item) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEventModal" class="modal-overlay" @click.self="closeEventModal">
      <div class="modal-content card-notes-modal">
        <div class="modal-header">
          <h3>{{ selectedEvent?.event_name }}</h3>
          <button @click="closeEventModal" class="btn-close-modal">✕</button>
        </div>
        <div class="modal-body-scroll">
          <p class="full-notes-text">{{ selectedEvent?.notes || 'No description available.' }}</p>
        </div>
        <div class="modal-footer" v-if="selectedEvent?.registration_url">
          <a :href="selectedEvent?.registration_url" target="_blank" class="btn-primary btn-full-width">
            Go to Registration / Official Info
          </a>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const loading = ref(true)
const allItems = ref([]) // Combined tasks and events

const currentDate = ref(new Date())
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// --- MODAL STATE ---
const showEventModal = ref(false)
const selectedEvent = ref(null)

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

async function fetchAllData() {
  loading.value = true
  const combined = []

  // 1. Fetch Project Tasks
  const { data: tasksData, error: tasksError } = await supabase
    .from('project_stages')
    .select('*, projects(project_name)')
    .not('due_date', 'is', null)
  
  if (!tasksError && tasksData) {
    tasksData.forEach(t => combined.push({ ...t, type: 'task', target_date: t.due_date }))
  }

  // 2. Fetch Events (Textile Shows)
  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .not('start_date', 'is', null)

  if (!eventsError && eventsData) {
    eventsData.forEach(e => combined.push({ ...e, type: 'event', target_date: e.start_date }))
  }

  allItems.value = combined
  loading.value = false
}

function getItemsForDate(dateStr) {
  return allItems.value.filter(item => item.target_date === dateStr)
}

function getItemMainText(item) {
  return item.type === 'task' 
    ? (item.projects?.project_name || 'Unknown Project') 
    : (item.event_name || 'Unnamed Event')
}

function getItemSubText(item) {
  return item.type === 'task' ? item.stage_name : `${item.country || 'Global'}`
}

function getItemTitle(item) {
  return item.type === 'task' 
    ? `${item.projects?.project_name} - ${item.stage_name}` 
    : `${item.event_name} - ${item.country}`
}

function getItemClass(item) {
  const today = new Date().toISOString().split('T')[0]
  
  if (item.type === 'task') {
    if (item.status === 'Completed') return 'task-completed'
    if (item.target_date < today) return 'task-overdue'
    if (item.status === 'In Progress') return 'task-progress'
    return 'task-pending'
  } else {
    // Event styling
    if (item.target_date < today) return 'event-passed'
    return 'event-upcoming'
  }
}

function handleItemClick(item) {
  if (item.type === 'task') {
    router.push({
      path: '/projects',
      query: { project: item.project_id, stage: item.id }
    })
  } else {
    selectedEvent.value = item
    showEventModal.value = true
  }
}

function closeEventModal() {
  showEventModal.value = false
  selectedEvent.value = null
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
  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local
  return dateStr === todayStr
}

onMounted(fetchAllData)
</script>

<style scoped>
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 1.5rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.calendar-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.month-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-main);
  margin: 0;
  min-width: 140px;
  text-align: center;
}

.btn-icon {
  background: var(--bg-card);
  border: 1px solid var(--border-main);
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.9rem;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: var(--border-light);
  color: var(--text-main);
  border-color: var(--primary);
}

.btn-secondary {
  background: transparent;
  color: var(--text-main);
  border: 1px solid var(--border-main);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}

.btn-secondary:hover {
  background: var(--border-light);
  border-color: var(--primary);
}

.ml-3 { margin-left: 0.5rem; }

.calendar-card {
  background: var(--bg-card);
  border: 1px solid var(--border-main);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

:root.light-mode .calendar-card {
  border: 1.5px solid var(--border-main);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-top: 1px solid var(--border-main);
  border-left: 1px solid var(--border-main);
}

:root.light-mode .calendar-grid {
  border-top: 1.5px solid var(--border-main);
  border-left: 1.5px solid var(--border-main);
}

.weekday {
  background: var(--bg-app);
  padding: 0.6rem 0.5rem;
  text-align: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-right: 1px solid var(--border-main);
  border-bottom: 1px solid var(--border-main);
}

:root.light-mode .weekday {
  border-right: 1.5px solid var(--border-main);
  border-bottom: 1.5px solid var(--border-main);
}

.day-cell {
  min-height: 100px;
  padding: 0.4rem;
  border-right: 1px solid var(--border-main);
  border-bottom: 1px solid var(--border-main);
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  transition: background 0.15s;
}

.day-cell:hover:not(.is-empty) { background: rgba(79, 70, 229, 0.04); }
.day-cell.is-empty { background: rgba(0, 0, 0, 0.08); }
:root.light-mode .day-cell.is-empty { background: rgba(0, 0, 0, 0.02); }
.day-cell.is-today { background: rgba(79, 70, 229, 0.08); }
:root.light-mode .day-cell { border-right: 1.5px solid var(--border-main); border-bottom: 1.5px solid var(--border-main); }
:root.light-mode .day-cell:hover:not(.is-empty) { background: rgba(79, 70, 229, 0.05); }

.day-number-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.3rem;
}

.day-number {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.day-cell.is-today .day-number {
  background: var(--primary);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-grow: 1;
  overflow-y: auto;
  max-height: 120px;
}

.task-badge {
  padding: 0.3rem 0.4rem;
  border-radius: 4px;
  font-size: 0.65rem;
  line-height: 1.2;
  display: flex;
  flex-direction: column;
  border-left: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.task-badge:hover { transform: translateY(-1px); opacity: 0.9; }
.task-badge strong { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.task-badge span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.85; font-size: 0.6rem; margin-top: 2px; }

/* PROJECT TASK STYLES */
.task-completed { background: var(--success-bg); color: var(--success-text); border-left-color: var(--success-text); }
.task-overdue { background: var(--danger-bg); color: var(--danger-text); border-left-color: var(--danger-text); }
.task-progress { background: rgba(14, 165, 233, 0.12); color: #38bdf8; border-left-color: #0284c7; }
.task-pending { background: rgba(107, 114, 128, 0.1); color: var(--text-body); border-left-color: var(--text-muted); }

/* EVENT STYLES */
.event-upcoming { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border-left-color: #8b5cf6; }
.event-passed { background: var(--border-light); color: var(--text-muted); border-left-color: var(--text-muted); border-style: dashed; border-width: 1px; border-left-width: 2px; border-left-style: solid; }

.loading { text-align: center; padding: 3rem; color: var(--text-muted); font-size: 0.95rem; }

/* MODAL STYLES */
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

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>