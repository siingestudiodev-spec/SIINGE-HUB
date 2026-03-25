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
          <div v-if="cell.date" class="day-number">{{ cell.dayNumber }}</div>
          
          <div class="events-list" v-if="cell.date">
            <div 
              v-for="task in getTasksForDate(cell.date)" 
              :key="task.id" 
              class="task-badge"
              :class="getTaskClass(task)"
              :title="task.projects?.project_name + ' - ' + task.stage_name"
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
import { supabase } from '../lib/supabase'

const loading = ref(true)
const tasks = ref([])

// Configuración del Calendario
const currentDate = ref(new Date())
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const currentMonthName = computed(() => {
  return currentDate.value.toLocaleString('en-US', { month: 'long' })
})
const currentYear = computed(() => currentDate.value.getFullYear())

// Lógica para construir la cuadrícula del mes
const calendarCells = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const cells = []
  
  // Celdas vacías al principio
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push({ date: null, dayNumber: '' })
  }
  
  // Días del mes
  for (let i = 1; i <= daysInMonth; i++) {
    // Formato YYYY-MM-DD para comparar fácil
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    cells.push({ date: dateStr, dayNumber: i })
  }
  
  return cells
})

// Cargar todas las tareas (etapas) con fecha límite
async function fetchTasks() {
  loading.value = true
  // Traemos las etapas y el nombre del proyecto asociado
  const { data, error } = await supabase
    .from('project_stages')
    .select('*, projects(project_name)')
    .not('due_date', 'is', null) // Solo las que tienen fecha
  
  if (!error && data) {
    tasks.value = data
  }
  loading.value = false
}

function getTasksForDate(dateStr) {
  return tasks.value.filter(t => t.due_date === dateStr)
}

// Estilos de colores según el status y si está atrasado
function getTaskClass(task) {
  if (task.status === 'Completed') return 'task-completed'
  
  const today = new Date().toISOString().split('T')[0]
  if (task.due_date < today) return 'task-overdue' // Atrasado
  if (task.status === 'In Progress') return 'task-progress'
  
  return 'task-pending' // Pendiente y a tiempo
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

onMounted(fetchTasks)
</script>

<style scoped>
.container { max-width: 1300px; margin: 0 auto; padding: 2rem 1.5rem; font-family: 'Inter', sans-serif; color: #1f2937; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;}
h1 { font-size: 2rem; font-weight: 800; color: #111827; margin: 0; }

.calendar-controls { display: flex; align-items: center; gap: 1rem; }
.month-title { font-size: 1.25rem; font-weight: 700; color: #4f46e5; margin: 0; min-width: 150px; text-align: center; }
.btn-icon { background: white; border: 1px solid #e5e7eb; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4b5563; transition: all 0.2s; }
.btn-icon:hover { background: #f3f4f6; color: #111827; }
.btn-secondary { background: #f3f4f6; color: #4b5563; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
.ml-3 { margin-left: 0.75rem; }

.calendar-card { background: white; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 4px 24px rgba(79,70,229,0.05); overflow: hidden; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); border-top: 1px solid #e5e7eb; border-left: 1px solid #e5e7eb; }

.weekday { background: #f9fafb; padding: 0.75rem; text-align: center; font-size: 0.8rem; font-weight: 700; color: #6b7280; text-transform: uppercase; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }

.day-cell { min-height: 120px; padding: 0.5rem; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; background: white; display: flex; flex-direction: column; transition: background 0.2s; }
.day-cell:hover:not(.is-empty) { background: #fafbff; }
.is-empty { background: #f9fafb; }
.is-today { background: #eef2ff !important; }
.is-today .day-number { background: #4f46e5; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }

.day-number { font-size: 0.9rem; font-weight: 700; color: #374151; margin-bottom: 0.5rem; align-self: flex-end; }

.events-list { display: flex; flex-direction: column; gap: 0.4rem; flex-grow: 1; overflow-y: auto; max-height: 150px; }
.task-badge { padding: 0.4rem; border-radius: 6px; font-size: 0.7rem; line-height: 1.2; display: flex; flex-direction: column; border-left: 3px solid transparent; cursor: default; }
.task-badge strong { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.task-badge span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.9; }

/* Colores de las tareas */
.task-completed { background: #dcfce7; color: #166534; border-left-color: #16a34a; }
.task-overdue { background: #fee2e2; color: #991b1b; border-left-color: #dc2626; }
.task-progress { background: #e0f2fe; color: #075985; border-left-color: #0284c7; }
.task-pending { background: #f3f4f6; color: #4b5563; border-left-color: #9ca3af; }

.loading { text-align: center; padding: 4rem; color: #6b7280; font-size: 1.1rem; }
</style>