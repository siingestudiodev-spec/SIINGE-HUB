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
              v-for="task in getTasksForDate(cell.date)" 
              :key="task.id" 
              class="task-badge"
              :class="getTaskClass(task)"
              :title="task.projects?.project_name + ' - ' + task.stage_name"
              @click="goToProject(task)"
            >
              <strong>{{ task.projects?.project_name || 'Unknown Project' }}</strong>
              <span>{{ task.stage_name }}</span>
            </div>
          </div>
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
const tasks = ref([])

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

async function fetchTasks() {
  loading.value = true
  const { data, error } = await supabase
    .from('project_stages')
    .select('*, projects(project_name)')
    .not('due_date', 'is', null)
  
  if (!error && data) {
    tasks.value = data
  }
  loading.value = false
}

function getTasksForDate(dateStr) {
  return tasks.value.filter(t => t.due_date === dateStr)
}

function getTaskClass(task) {
  if (task.status === 'Completed') return 'task-completed'
  const today = new Date().toISOString().split('T')[0]
  if (task.due_date < today) return 'task-overdue'
  if (task.status === 'In Progress') return 'task-progress'
  return 'task-pending'
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
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

// NUEVA FUNCIÓN: Ir al proyecto y abrir la tarea
function goToProject(task) {
  router.push({
    path: '/projects',
    query: { project: task.project_id, stage: task.id }
  })
}

onMounted(fetchTasks)
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

.ml-3 {
  margin-left: 0.5rem;
}

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

.day-cell:hover:not(.is-empty) {
  background: rgba(79, 70, 229, 0.04);
}

.day-cell.is-empty {
  background: rgba(0, 0, 0, 0.08);
}

:root.light-mode .day-cell.is-empty {
  background: rgba(0, 0, 0, 0.02);
}

.day-cell.is-today {
  background: rgba(79, 70, 229, 0.08);
}

:root.light-mode .day-cell {
  border-right: 1.5px solid var(--border-main);
  border-bottom: 1.5px solid var(--border-main);
}

:root.light-mode .day-cell:hover:not(.is-empty) {
  background: rgba(79, 70, 229, 0.05);
}

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

.task-badge:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.task-badge strong {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-badge span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: 0.85;
  font-size: 0.6rem;
}

.task-completed {
  background: var(--success-bg);
  color: var(--success-text);
  border-left-color: var(--success-text);
}

.task-overdue {
  background: var(--danger-bg);
  color: var(--danger-text);
  border-left-color: var(--danger-text);
}

.task-progress {
  background: rgba(14, 165, 233, 0.12);
  color: #38bdf8;
  border-left-color: #0284c7;
}

.task-pending {
  background: rgba(107, 114, 128, 0.1);
  color: var(--text-body);
  border-left-color: var(--text-muted);
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
  font-size: 0.95rem;
}
</style>