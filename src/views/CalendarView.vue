<template>
  <div class="flex flex-col h-full" style="border: 1px solid var(--border-light); border-radius: 4px; background: var(--bg-card);">

    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--text-main);">
      <div>
        <h1 style="font-size: 1.75rem; font-weight: 400; font-style: italic; color: var(--text-main); margin: 0 0 4px; letter-spacing: -0.02em;">Calendar</h1>
        <p style="font-size: 13px; color: var(--text-muted); margin: 0;">Project due dates & textile events at a glance.</p>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <button @click="changeMonth(-1)" class="nav-btn">‹</button>
        <span style="font-size: 1.1rem; font-weight: 600; font-style: italic; color: var(--text-main); min-width: 160px; text-align: center; letter-spacing: -0.01em;">
          {{ currentMonthName }} {{ currentYear }}
        </span>
        <button @click="changeMonth(1)" class="nav-btn">›</button>
        <button @click="goToToday" class="today-btn">Today</button>
      </div>
    </div>

    <div v-if="loading" class="p-8 text-center" style="color: var(--text-muted);">Loading schedule...</div>

    <div v-else class="flex-1 overflow-auto" style="padding: 1rem;">
      <!-- Day headers -->
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px;">
        <div v-for="day in weekDays" :key="day"
          style="padding: 6px 8px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: var(--text-muted); text-align: center;">
          {{ day }}
        </div>
      </div>

      <!-- Calendar grid — border-left+top on container, border-right+bottom on each cell -->
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); border-left: 1px solid var(--border-light); border-top: 1px solid var(--border-light);">
        <div
          v-for="(cell, index) in calendarCells"
          :key="index"
          style="min-height: 100px; border-right: 1px solid var(--border-light); border-bottom: 1px solid var(--border-light); padding: 6px;"
          :style="(cell.isCurrentMonth ? 'cursor:pointer;' : 'cursor:default;') + (cell.isToday ? ' background: var(--bg-card);' : !cell.isCurrentMonth ? ' background: var(--bg-app);' : '')"
          @click="openAddModal(cell)"
        >
          <!-- Day number -->
          <div style="margin-bottom: 4px;">
            <span
              :style="cell.isToday
                ? 'display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:var(--text-main);color:var(--bg-app);border-radius:50%;font-size:11px;font-weight:700;'
                : 'font-size:11px;font-weight:600;color:' + (cell.isCurrentMonth ? 'var(--text-muted)' : 'var(--border-main)') + ';'"
            >{{ cell.dayNumber }}</span>
          </div>

          <!-- Event pills -->
          <div v-for="item in getItemsForDate(cell.date)" :key="item.type + item.id" style="margin-bottom: 3px;">
            <button
              @click.stop="handleItemClick(item)"
              style="width:100%;text-align:left;padding:3px 6px;border-radius:2px;border:none;cursor:pointer;font-size:9px;font-weight:600;line-height:1.2;overflow:hidden;display:block;transition:opacity 120ms;"
              :style="getItemPillStyle(item)"
              :title="getItemTitle(item)"
              @mouseenter="e => e.currentTarget.style.opacity = '0.8'"
              @mouseleave="e => e.currentTarget.style.opacity = '1'"
            >
              <span style="display:flex;align-items:center;gap:2px;min-width:0;">
                <span v-if="item.type==='crm_project'" style="flex-shrink:0;font-size:6px;font-weight:800;letter-spacing:0.08em;padding:1px 3px;border-radius:1px;background:rgba(0,0,0,0.12);color:inherit;">CRM</span>
                <span v-else-if="item.type==='task'||item.type==='event'" style="flex-shrink:0;font-size:6px;font-weight:800;letter-spacing:0.08em;padding:1px 3px;border-radius:1px;background:rgba(255,255,255,0.3);color:inherit;">HUB</span>
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ getItemMainText(item) }}</span>
              </span>
              <span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;opacity:0.75;font-size:8px;">{{ getItemSubText(item) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Due Date modal -->
    <div v-if="addModal.show" class="modal-overlay" @click.self="addModal.show = false">
      <div class="modal-content" style="max-width: 480px;">
        <div class="modal-header">
          <h3>Set Due Date — {{ formatDate(addModal.date) }}</h3>
          <button @click="addModal.show = false" class="btn-close-modal">✕</button>
        </div>
        <div class="modal-body-scroll" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label class="field-label">Project</label>
            <select v-model="addModal.projectId" @change="onProjectSelected" class="field-select">
              <option :value="null">— Select project —</option>
              <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.project_name }}</option>
            </select>
          </div>
          <div>
            <label class="field-label">Stage</label>
            <div v-if="addModal.loadingStages" style="font-size: 0.82rem; color: var(--text-muted);">Loading stages...</div>
            <select v-else v-model="addModal.stageId" class="field-select" :disabled="!addModal.projectId || addModal.stages.length === 0">
              <option :value="null">— Select stage —</option>
              <option v-for="s in addModal.stages" :key="s.id" :value="s.id">{{ s.displayName }}</option>
            </select>
            <p v-if="addModal.projectId && !addModal.loadingStages && addModal.stages.length === 0" style="font-size: 0.78rem; color: var(--text-muted); margin: 0.4rem 0 0;">No stages found for this project.</p>
          </div>
        </div>
        <div class="modal-footer" style="display: flex; gap: 0.75rem; justify-content: flex-end;">
          <button @click="addModal.show = false" style="padding: 0.55rem 1.2rem; border: 1px solid var(--border-main); border-radius: 6px; background: transparent; color: var(--text-main); cursor: pointer; font-size: 0.85rem;">Cancel</button>
          <button @click="saveAddModal" :disabled="!addModal.stageId || addModal.saving"
            style="padding: 0.55rem 1.2rem; border: none; border-radius: 6px; background: var(--primary); color: white; cursor: pointer; font-size: 0.85rem; font-weight: 600; opacity: 1;"
            :style="(!addModal.stageId || addModal.saving) ? 'opacity: 0.5; cursor: not-allowed;' : ''"
          >{{ addModal.saving ? 'Saving...' : 'Set Due Date' }}</button>
        </div>
      </div>
    </div>

    <!-- Event detail modal -->
    <div v-if="showEventModal" class="modal-overlay" @click.self="closeEventModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ selectedEvent?.event_name }}</h3>
          <button @click="closeEventModal" class="btn-close-modal">✕</button>
        </div>
        <div class="modal-body-scroll">
          <p class="full-notes-text">{{ selectedEvent?.notes || 'No description available.' }}</p>
        </div>
        <div class="modal-footer" v-if="selectedEvent?.registration_url">
          <a :href="selectedEvent?.registration_url" target="_blank" class="btn-full-width">
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
import { crmSupabase } from '../lib/crmClient'

const CRM_DELIVERABLE_LABELS = {
  due_date:                            'Main Due',
  deliverable_trend_analysis_due:      'Trend Analysis',
  deliverable_design_due:              'Apparel Design',
  deliverable_branding_due:            'Branding/Packaging',
  deliverable_tech_pack_due:           'Tech Pack',
  deliverable_manu_quotes_due:         'Manu Quotes',
  deliverable_initial_sample_due:      'Initial Sample',
  deliverable_approved_sample_due:     'Approved Sample',
  deliverable_size_range_due:          'Size Range Approval',
  deliverable_bulk_due:                'Bulk Due',
  deliverable_product_analysis_due:    'Product Analysis',
  deliverable_in_house_patternmaking_due: 'In House Patternmaking',
  deliverable_in_house_proto_due:      'In House Proto',
  deliverable_in_house_manufacturing_due: 'In House Mfg',
}

const router = useRouter()
const loading = ref(true)
const allItems = ref([])
const projects = ref([])

const currentDate = ref(new Date())
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const showEventModal = ref(false)
const selectedEvent = ref(null)

const addModal = ref({ show: false, date: '', projectId: null, stageId: null, stages: [], loadingStages: false, saving: false })

const currentMonthName = computed(() => currentDate.value.toLocaleString('en-US', { month: 'long' }))
const currentYear = computed(() => currentDate.value.getFullYear())

const calendarCells = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const todayStr = new Date().toLocaleDateString('en-CA')
  const cells = []

  // Prev month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ date: dateStr, dayNumber: day, isCurrentMonth: false, isToday: false })
  }

  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    cells.push({ date: dateStr, dayNumber: i, isCurrentMonth: true, isToday: dateStr === todayStr })
  }

  // Next month padding to fill 42 cells
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 1 : month + 2
    const y = month === 11 ? year + 1 : year
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: dateStr, dayNumber: d, isCurrentMonth: false, isToday: false })
  }

  return cells
})

async function fetchAllData() {
  loading.value = true
  const combined = []

  // Fetch projects map separately (no FK defined between project_stages and projects)
  const { data: projectsData } = await supabase.from('projects').select('id, project_name').order('project_name')
  const projectMap = {}
  if (projectsData) {
    projectsData.forEach(p => { projectMap[p.id] = p.project_name })
    projects.value = projectsData
  }

  const { data: tasksData, error: tasksError } = await supabase
    .from('project_stages')
    .select('*')
    .not('due_date', 'is', null)

  if (!tasksError && tasksData) {
    tasksData.forEach(t => combined.push({
      ...t,
      type: 'task',
      target_date: t.due_date,
      project_name: projectMap[t.project_id] || 'Unknown Project'
    }))
  }

  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .not('start_date', 'is', null)

  if (!eventsError && eventsData) {
    eventsData.forEach(e => combined.push({ ...e, type: 'event', target_date: e.start_date }))
  }

  // Fetch CRM projects and their deliverable due dates
  const crmFields = Object.keys(CRM_DELIVERABLE_LABELS).join(', ')
  const { data: crmProjects, error: crmError } = await crmSupabase
    .from('projects')
    .select(`id, title, pipeline_stage, ${crmFields}`)

  if (crmError) console.error('[Hub Calendar] CRM projects error:', crmError)

  if (crmProjects) {
    for (const p of crmProjects) {
      for (const [field, label] of Object.entries(CRM_DELIVERABLE_LABELS)) {
        if (p[field]) {
          combined.push({
            id: `crm-${field}-${p.id}`,
            type: 'crm_project',
            target_date: p[field],
            project_name: p.title,
            stage_name: label,
            pipeline_stage: p.pipeline_stage,
          })
        }
      }
    }
  }

  allItems.value = combined
  loading.value = false
}

function getItemsForDate(dateStr) {
  return allItems.value.filter(item => {
    const itemDate = item.target_date ? item.target_date.split('T')[0] : null
    return itemDate === dateStr
  })
}

function getItemMainText(item) {
  if (item.type === 'crm_project') return item.project_name || ''
  return item.type === 'task'
    ? (item.project_name || 'Unknown Project')
    : (item.event_name || 'Unnamed Event')
}

function getItemSubText(item) {
  if (item.type === 'crm_project') return item.stage_name
  return item.type === 'task' ? item.stage_name : (item.country || 'Global')
}

function getItemTitle(item) {
  if (item.type === 'crm_project') return `[CRM] ${item.project_name} — ${item.stage_name}`
  return item.type === 'task'
    ? `${item.project_name} — ${item.stage_name}`
    : `${item.event_name} — ${item.country}`
}

function getItemPillStyle(item) {
  const today = new Date().toISOString().split('T')[0]
  if (item.type === 'crm_project') {
    return item.target_date < today
      ? 'background: rgba(234,179,8,0.1); color: #92400e;'
      : 'background: rgba(234,179,8,0.18); color: #a16207;'
  }
  if (item.type === 'event') {
    return item.target_date < today
      ? 'background: rgba(107,114,128,0.1); color: var(--text-muted);'
      : 'background: rgba(139,92,246,0.15); color: #8b5cf6;'
  }
  // task
  if (item.status === 'Completed') return 'background: rgba(34,197,94,0.12); color: #16a34a;'
  if (item.target_date < today)    return 'background: rgba(239,68,68,0.12); color: #dc2626;'
  if (item.status === 'In Progress') return 'background: rgba(14,165,233,0.12); color: #0284c7;'
  return 'background: rgba(107,114,128,0.1); color: var(--text-body);'
}

function handleItemClick(item) {
  if (item.type === 'task') {
    router.push({ path: '/projects', query: { project: item.project_id, stage: item.id } })
  } else if (item.type === 'event') {
    selectedEvent.value = item
    showEventModal.value = true
  } else if (item.type === 'crm_project') {
    window.open(`https://siinge-crm.vercel.app/pipeline`, '_blank')
  }
}

function closeEventModal() {
  showEventModal.value = false
  selectedEvent.value = null
}

function openAddModal(cell) {
  if (!cell.isCurrentMonth && !cell.isToday) return
  addModal.value = { show: true, date: cell.date, projectId: null, stageId: null, stages: [], loadingStages: false, saving: false }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

async function onProjectSelected() {
  const pid = addModal.value.projectId
  if (!pid) { addModal.value.stages = []; return }
  addModal.value.loadingStages = true
  addModal.value.stageId = null
  const { data } = await supabase
    .from('project_stages')
    .select('id, stage_name, parent_id, step_order')
    .eq('project_id', pid)
    .order('step_order')
  if (data) {
    const nameMap = {}
    data.forEach(s => { nameMap[s.id] = s.stage_name })
    addModal.value.stages = data
      .filter(s => s.parent_id !== null)
      .map(s => ({ ...s, displayName: nameMap[s.parent_id] ? `${nameMap[s.parent_id]}  ›  ${s.stage_name}` : s.stage_name }))
  }
  addModal.value.loadingStages = false
}

async function saveAddModal() {
  if (!addModal.value.stageId || !addModal.value.date) return
  addModal.value.saving = true
  await supabase.from('project_stages').update({ due_date: addModal.value.date }).eq('id', addModal.value.stageId)
  addModal.value.show = false
  addModal.value.saving = false
  fetchAllData()
}

function changeMonth(offset) {
  const newDate = new Date(currentDate.value)
  newDate.setMonth(newDate.getMonth() + offset)
  currentDate.value = newDate
}

function goToToday() {
  currentDate.value = new Date()
}

onMounted(fetchAllData)
</script>

<style scoped>
.nav-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border-main);
  border-radius: 2px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1;
  transition: border-color 120ms;
}
.nav-btn:hover { border-color: var(--text-main); color: var(--text-main); }

.today-btn {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid var(--border-main);
  border-radius: 2px;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  margin-left: 4px;
  transition: border-color 120ms;
}
.today-btn:hover { border-color: var(--text-main); color: var(--text-main); }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 2000; }
.modal-content { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 90%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-main); display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin: 0; }
.btn-close-modal { background: none; border: none; font-size: 1.1rem; color: var(--text-muted); cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: 0.15s; }
.btn-close-modal:hover { background: rgba(0,0,0,0.06); color: var(--text-main); }
.modal-body-scroll { padding: 1.5rem; overflow-y: auto; flex: 1; }
.full-notes-text { font-size: 0.95rem; color: var(--text-body); line-height: 1.7; white-space: pre-wrap; margin: 0; }
.modal-footer { padding: 1.25rem 1.5rem; border-top: 1px solid var(--border-main); }
.btn-full-width { display: flex; align-items: center; justify-content: center; width: 100%; padding: 0.75rem; background: var(--primary); color: white; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 0.95rem; }

.field-label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.4rem; }
.field-select { width: 100%; padding: 0.55rem 0.75rem; border: 1px solid var(--border-main); border-radius: 6px; background: var(--bg-app); color: var(--text-main); font-size: 0.88rem; font-family: inherit; cursor: pointer; }
.field-select:focus { outline: none; border-color: var(--primary); }
</style>
