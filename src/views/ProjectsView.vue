<template>
  <div class="container">
    <div class="header">
      <h1>Projects</h1>
      <button @click="showForm = !showForm" class="btn-primary">
        {{ showForm ? 'Cancel' : '+ New Project' }}
      </button>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editing ? 'Edit Project' : 'New Project' }}</h2>
      <div class="form-grid">
        <input v-model="form.project_name" placeholder="Project Name *" />
        <input v-model="form.client_name" placeholder="Client Name" />
        <select v-model="form.status">
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
        <input v-model="form.tech_pack_url" placeholder="Tech Pack URL (Google Drive, etc.)" />
      </div>
      <textarea v-model="form.description" placeholder="Description" rows="3" style="margin-top: 0.75rem;"></textarea>
      <div class="form-actions">
        <button @click="saveProject" class="btn-primary" :disabled="savingProject">
          {{ savingProject ? 'Saving...' : (editing ? 'Update' : 'Save') }}
        </button>
      </div>
    </div>

    <div class="filters">
      <input v-model="search" placeholder="🔍 Search by project or client..." class="search-input" />
      <select v-model="filterStatus">
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="closed">Closed</option>
      </select>
      <button v-if="search || filterStatus" @click="clearFilters" class="btn-clear">✕ Clear</button>
      <span class="results-count">{{ filteredProjects.length }} result{{ filteredProjects.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="filteredProjects.length === 0" class="empty">No projects found.</div>
    <div v-else class="cards-grid">
      <div v-for="p in filteredProjects" :key="p.id" class="card">
        <div class="card-top">
          <div class="card-avatar">{{ p.project_name?.charAt(0) }}</div>
          <div class="card-title">
            <h3>{{ p.project_name }}</h3>
            <span :class="'status-badge status-' + p.status">{{ p.status }}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="info-row" v-if="p.client_name"><span class="info-icon">👤</span>{{ p.client_name }}</div>
          <div class="info-row" v-if="p.description"><span class="info-icon">📄</span>{{ p.description }}</div>
          <div class="info-row date-row"><span class="info-icon">📅</span>{{ new Date(p.created_at).toLocaleDateString() }}</div>
        </div>
        <div class="card-actions">
          <a v-if="p.tech_pack_url" :href="p.tech_pack_url" target="_blank" class="btn-techpack">📎 Tech Pack</a>
          <router-link :to="'/projects/' + p.id + '/quotes'" class="btn-quotes">📊 Quotes</router-link>
          <router-link :to="'/projects/' + p.id + '/sourcing'" class="btn-sourcing">📦 Sourcing</router-link>
          <button @click="openTimeline(p)" class="btn-timeline">⏱️ Timeline</button>
          <button @click="editProject(p)" class="btn-secondary">Edit</button>
          <button @click="deleteProject(p.id)" class="btn-danger">Delete</button>
        </div>
      </div>
    </div>

    <div v-if="timelineModal.show" class="modal-overlay" @click.self="timelineModal.show = false">
      <div class="modal modal-large">
        <div class="modal-header">
          <h2>⏱️ Timeline: {{ timelineModal.projectName }}</h2>
          <div class="header-actions">
            <button @click="forceResetTimeline" class="btn-reset-template">
              ⚠️ Load ClickUp Template
            </button>
            <button @click="timelineModal.show = false" class="modal-close">✕</button>
          </div>
        </div>
        
        <div v-if="timelineModal.loading" class="loading">
          <p>Processing structure...</p>
        </div>
        
        <div v-else class="timeline-container">
          <div class="timeline-header-row">
            <div class="th-name">Task Name</div>
            <div class="th-date">Due Date</div>
            <div class="th-date">Completed Date</div>
            <div class="th-status">Status</div>
            <div class="th-action"></div>
          </div>

          <div v-for="cat in rootStages" :key="cat.id" class="stage-group">
            
            <div class="task-row level-1" @click="toggleExpand(cat.id)">
              <div class="task-info">
                <span class="expand-arrow" :class="{ 'expanded': expanded.includes(cat.id) }">▶</span>
                <span class="status-circle"></span>
                <strong>{{ cat.stage_name }}</strong>
              </div>
              <div class="task-empty-slots"></div>
              <div class="task-actions" @click.stop>
                <button @click="addSubtask(cat.id)" class="btn-add-micro" title="Add Subtask">➕</button>
              </div>
            </div>

            <div v-if="expanded.includes(cat.id)" class="children-container">
              <div v-for="sub in getChildren(cat.id)" :key="sub.id" class="subtask-wrapper">
                
                <div class="task-row level-2" @click="toggleExpand(sub.id)">
                  <div class="task-info indent-1">
                    <span class="expand-arrow" :class="{ 'expanded': expanded.includes(sub.id), 'hidden': getChildren(sub.id).length === 0 }">▶</span>
                    <span class="status-circle"></span>
                    <input v-model="sub.stage_name" class="task-name-input" @click.stop />
                  </div>
                  
                  <template v-if="getChildren(sub.id).length > 0">
                    <div class="task-empty-slots"></div>
                  </template>
                  
                  <template v-else>
                    <div class="task-date" @click.stop><input type="date" v-model="sub.due_date" class="date-input" /></div>
                    <div class="task-date" @click.stop><input type="date" v-model="sub.completed_date" class="date-input" /></div>
                    <div class="task-status" @click.stop>
                      <select v-model="sub.status" :class="'status-select status-' + sub.status.toLowerCase().replace(' ', '-')">
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </template>

                  <div class="task-actions" @click.stop>
                    <button @click="addSubtask(sub.id)" class="btn-add-micro" title="Add Sub-subtask">➕</button>
                    <button @click="deleteStage(sub.id)" class="btn-del-micro" title="Delete">🗑️</button>
                  </div>
                </div>

                <div v-if="expanded.includes(sub.id)">
                  <div v-for="subsub in getChildren(sub.id)" :key="subsub.id" class="task-row level-3">
                    <div class="task-info indent-2">
                      <span class="status-circle"></span>
                      <input v-model="subsub.stage_name" class="task-name-input" />
                    </div>
                    <div class="task-date"><input type="date" v-model="subsub.due_date" class="date-input" /></div>
                    <div class="task-date"><input type="date" v-model="subsub.completed_date" class="date-input" /></div>
                    <div class="task-status">
                      <select v-model="subsub.status" :class="'status-select status-' + subsub.status.toLowerCase().replace(' ', '-')">
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                    <div class="task-actions">
                      <button @click="deleteStage(subsub.id)" class="btn-del-micro" title="Delete">🗑️</button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="timelineModal.show = false" class="btn-clear">Cancel</button>
          <button @click="saveTimeline" class="btn-primary" :disabled="timelineModal.saving || timelineModal.loading">
            {{ timelineModal.saving ? 'Saving...' : 'Save Timeline' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const projects = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(false)
const editId = ref(null)
const search = ref('')
const filterStatus = ref('')
const savingProject = ref(false)

const form = ref({ project_name: '', client_name: '', description: '', status: 'active', tech_pack_url: '' })

// TIMELINE STATE
const timelineModal = ref({ show: false, loading: false, saving: false, projectId: null, projectName: '', stages: [] })
const expanded = ref([])

const CLICKUP_TEMPLATE = [
  {
    name: 'CONCEPT & DESIGN',
    children: [
      { name: 'Sketches Sent to Client' },
      { name: 'Design Approved' },
      { name: 'Tech Pack Due Date' },
      { name: '3D Design Approved' },
      { name: 'Tech Pack Completed' }
    ]
  },
  {
    name: 'QUOTE',
    children: [
      { name: 'Quote Due Date' },
      { name: 'Quote Requests Sent to Factories' },
      { name: 'Quote Received Date' },
      { name: 'Factory Selected for Sampling' }
    ]
  },
  {
    name: 'MATERIAL & TRIM SOURCING',
    children: [
      { name: 'Sourcing Request Date' },
      { name: 'Swatches Due Date' },
      { name: 'Swatches Received Date' },
      { name: 'Fabric Approval Date' },
      { name: 'Fabric Lead Time' },
      { name: 'Bulk Fabric Arrival at Factory — Date' },
      { name: 'Labdip Due Date' },
      { name: 'Lab Dip Received Date' },
      { name: 'Lab Dip Approval Date' }
    ]
  },
  {
    name: 'SAMPLE DEVELOPMENT',
    children: [
      {
        name: 'First Sample',
        children: ['First Sample Due Date', 'Images Received Date', 'Corrections Completed Date', 'First Sample Received Date', 'Fit Notes Sent Date']
      },
      {
        name: 'Second Sample',
        children: ['Second sample due date', 'Images received date', 'Corrections completed date', 'Second sample received date', 'Fit Notes Sent Date']
      },
      {
        name: 'Fit Approval',
        children: ['Fit Approved — Initial Size', 'Fit Approved — Full Size Range']
      },
      {
        name: 'SIZE RANGE SAMPLES',
        children: ['Size Range Samples Due Date', 'Images Received Date', 'Corrections Completed Date', 'Size Range Received Date']
      },
      {
        name: 'TESTING',
        children: ['Required Tests (Dropdown)', 'Test Due Dates', 'Test Completed Dates', 'Testing Documentation']
      }
    ]
  },
  {
    name: 'FINAL TECH PACK & BULK PREPARATION',
    children: [
      { name: 'Final Tech Pack Sent' },
      { name: 'Bulk QC Due Date' },
      { name: 'Bulk Due Date' },
      { name: 'Bulk Shipping Date' },
      { name: 'Bulk Arrival Date to 3PL' }
    ]
  },
  {
    name: 'QUALITY INSPECTION',
    children: [
      { name: 'Quality Inspection — Overview' },
      { name: 'QC Document/Link' },
      { name: 'QC Approval Date' }
    ]
  },
  {
    name: 'SHIPPING & LOGISTICS',
    children: [
      { name: 'Estimated Shipping Time' },
      { name: 'Actual Shipping Time' }
    ]
  },
  {
    name: 'PROJECT COMPLETION',
    children: [
      { name: 'Total Project Duration' },
      { name: 'Completion Date' },
      { name: 'Reflection' }
    ]
  }
]

const filteredProjects = computed(() => {
  return projects.value.filter(p => {
    const s = search.value.toLowerCase()
    const matchSearch = !s || p.project_name?.toLowerCase().includes(s) || p.client_name?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s)
    const matchStatus = !filterStatus.value || p.status === filterStatus.value
    return matchSearch && matchStatus
  })
})

const rootStages = computed(() => {
  return timelineModal.value.stages.filter(s => !s.parent_id).sort((a, b) => a.step_order - b.step_order)
})

function getChildren(parentId) {
  return timelineModal.value.stages.filter(s => s.parent_id === parentId).sort((a, b) => a.step_order - b.step_order)
}

function toggleExpand(id) {
  if (expanded.value.includes(id)) {
    expanded.value = expanded.value.filter(i => i !== id)
  } else {
    expanded.value.push(id)
  }
}

function clearFilters() { search.value = ''; filterStatus.value = '' }

async function fetchProjects() {
  loading.value = true
  const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
  projects.value = data || []
  loading.value = false
}

async function saveProject() {
  if (!form.value.project_name) return alert('Project name is required')
  savingProject.value = true
  
  if (editing.value) {
    await supabase.from('projects').update(form.value).eq('id', editId.value)
  } else {
    await supabase.from('projects').insert([form.value])
  }
  
  savingProject.value = false
  resetForm()
  fetchProjects()
}

function editProject(p) {
  form.value = { ...p }; editId.value = p.id; editing.value = true; showForm.value = true
}

async function deleteProject(id) {
  if (!confirm('Delete this project?')) return
  await supabase.from('projects').delete().eq('id', id)
  fetchProjects()
}

function resetForm() {
  form.value = { project_name: '', client_name: '', description: '', status: 'active', tech_pack_url: '' }
  editing.value = false; editId.value = null; showForm.value = false
}

// INSERCIÓN MASIVA OPTIMIZADA (Super rápida)
async function seedDefaultTree(projectId) {
  const allStagesToInsert = []

  for (let i = 0; i < CLICKUP_TEMPLATE.length; i++) {
    const l1 = CLICKUP_TEMPLATE[i];
    const l1Id = crypto.randomUUID() // Generamos el ID en el navegador

    allStagesToInsert.push({
      id: l1Id, project_id: projectId, stage_name: l1.name, step_order: i + 1, status: 'Pending', parent_id: null
    })

    if (l1.name === 'SAMPLE DEVELOPMENT') {
      expanded.value.push(l1Id) // Lo expandimos por defecto
    }

    if (l1.children) {
      for (let j = 0; j < l1.children.length; j++) {
        const l2 = l1.children[j];
        const l2Id = crypto.randomUUID()
        const l2Name = typeof l2 === 'string' ? l2 : l2.name

        allStagesToInsert.push({
          id: l2Id, project_id: projectId, parent_id: l1Id, stage_name: l2Name, step_order: j + 1, status: 'Pending'
        })

        if (typeof l2 === 'object' && l2.children) {
          expanded.value.push(l2Id) // Expandir carpetas de Nivel 2
          for (let k = 0; k < l2.children.length; k++) {
            allStagesToInsert.push({
              id: crypto.randomUUID(), project_id: projectId, parent_id: l2Id, stage_name: l2.children[k], step_order: k + 1, status: 'Pending'
            })
          }
        }
      }
    }
  }

  // Una sola llamada a la base de datos en lugar de 40
  await supabase.from('project_stages').insert(allStagesToInsert)
}

async function reloadTimelineData(projectId) {
  const { data } = await supabase.from('project_stages').select('*').eq('project_id', projectId)
  timelineModal.value.stages = data || []
}

async function openTimeline(p) {
  timelineModal.value.show = true
  timelineModal.value.projectName = p.project_name
  timelineModal.value.projectId = p.id
  timelineModal.value.loading = true
  expanded.value = []

  await reloadTimelineData(p.id)

  if (timelineModal.value.stages.length === 0) {
    await seedDefaultTree(p.id)
    await reloadTimelineData(p.id)
  }
  
  timelineModal.value.loading = false
}

async function forceResetTimeline() {
  if (!confirm('This will load the full ClickUp structure and erase current dates. Proceed?')) return
  timelineModal.value.loading = true
  
  await supabase.from('project_stages').delete().eq('project_id', timelineModal.value.projectId)
  expanded.value = []
  
  await seedDefaultTree(timelineModal.value.projectId)
  await reloadTimelineData(timelineModal.value.projectId)
  timelineModal.value.loading = false
}

async function addSubtask(parentId) {
  const newTask = {
    id: crypto.randomUUID(),
    project_id: timelineModal.value.projectId,
    parent_id: parentId,
    stage_name: 'New Task',
    status: 'Pending',
    step_order: 99
  }
  await supabase.from('project_stages').insert([newTask])
  if (!expanded.value.includes(parentId)) expanded.value.push(parentId)
  await reloadTimelineData(timelineModal.value.projectId)
}

async function deleteStage(id) {
  if (!confirm('Delete this task?')) return
  await supabase.from('project_stages').delete().eq('id', id)
  await reloadTimelineData(timelineModal.value.projectId)
}

// GUARDADO MASIVO OPTIMIZADO (Super rápido)
async function saveTimeline() {
  timelineModal.value.saving = true
  
  // Extraemos solo los datos limpios que necesitamos guardar
  const updates = timelineModal.value.stages.map(stage => ({
    id: stage.id,
    project_id: stage.project_id,
    parent_id: stage.parent_id,
    stage_name: stage.stage_name,
    step_order: stage.step_order,
    due_date: stage.due_date || null,
    completed_date: stage.completed_date || null,
    status: stage.status
  }))

  // Usamos upsert para actualizar todo de golpe en un solo viaje al servidor
  const { error } = await supabase.from('project_stages').upsert(updates)
  
  timelineModal.value.saving = false
  if (error) alert('Error saving: ' + error.message)
  else timelineModal.value.show = false
}

onMounted(fetchProjects)
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; }

.form-card { background: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1.5px solid #e5e7eb; box-shadow: 0 4px 24px rgba(79,70,229,0.07); }
.form-card h2 { font-size: 1.1rem; margin-bottom: 1.25rem; color: #1a1a2e; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.92rem; color: #1a1a2e; background: white; font-family: 'Inter', sans-serif; transition: border-color 0.15s; box-sizing: border-box; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; }
.form-actions { margin-top: 1rem; }

.filters { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.75rem; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 220px; }
.btn-clear { background: white; color: #666; border: 1.5px solid #e5e7eb; padding: 0.6rem 0.9rem; border-radius: 10px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; }
.results-count { color: #9ca3af; font-size: 0.85rem; white-space: nowrap; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
.card { background: white; border-radius: 16px; padding: 1.5rem; border: 1.5px solid #e5e7eb; box-shadow: 0 2px 12px rgba(0,0,0,0.05); transition: transform 0.18s, box-shadow 0.18s; }
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(79,70,229,0.12); border-color: #c7d2fe; }

.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.card-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #f093fb, #f5576c); color: white; font-weight: 700; font-size: 1.3rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-title h3 { font-size: 1.05rem; font-weight: 700; color: #1a1a2e; margin-bottom: 0.3rem; }
.status-badge { padding: 0.2rem 0.65rem; border-radius: 20px; font-size: 0.78rem; font-weight: 600; text-transform: capitalize; }
.status-active { background: #dcfce7; color: #16a34a; }
.status-pending { background: #fef9c3; color: #ca8a04; }
.status-closed { background: #ffe4e6; color: #e11d48; }

.card-body { margin-bottom: 1.25rem; }
.info-row { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.45rem; font-size: 0.88rem; color: #4b5563; }
.info-icon { flex-shrink: 0; }
.date-row { color: #9ca3af !important; font-size: 0.82rem !important; }

.card-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; flex-wrap: wrap; align-items: center;}
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; font-family: 'Inter', sans-serif; transition: opacity 0.15s, transform 0.15s; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-techpack { background: #faf5ff; color: #7c3aed; padding: 0.5rem 0.9rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; }
.btn-quotes { background: #f0fdf4; color: #16a34a; padding: 0.5rem 0.9rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; }
.btn-sourcing { background: #fffbeb; color: #d97706; padding: 0.5rem 0.9rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; }
.btn-timeline { background: #f3e8ff; color: #6b21a8; border: none; padding: 0.5rem 0.9rem; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif;}
.btn-secondary { background: #eef2ff; color: #4f46e5; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }

/* MODAL DE TIMELINE */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: white; padding: 2rem; border-radius: 16px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal-large { max-width: 950px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 1.5rem; }
.modal-header h2 { margin: 0; font-size: 1.25rem; color: #1a1a2e; }
.header-actions { display: flex; gap: 1rem; align-items: center; }
.btn-reset-template { background: #fff1f2; color: #e11d48; border: 1px solid #fecdd3; padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.btn-reset-template:hover { background: #ffe4e6; }
.modal-close { background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #6b7280; display: flex; align-items: center; justify-content: center; font-weight: bold;}

.timeline-container { display: flex; flex-direction: column; gap: 0; border: 1px solid #e5e7eb; border-radius: 8px; }
.timeline-header-row { display: flex; padding: 0.75rem 1rem; background: #f9fafb; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
.th-name { flex: 3; }
.th-date { flex: 1; text-align: center; }
.th-status { flex: 1; text-align: center; }
.th-action { width: 50px; }

/* ESTRUCTURA DE LAS FILAS */
.task-row { display: flex; align-items: center; padding: 0.5rem 1rem; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: background 0.1s; }
.task-row:hover { background: #f8fafc; }
.task-row:last-child { border-bottom: none; }

/* DISEÑO DEL TEXTO Y FLECHAS */
.task-info { flex: 3; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: #111827; }
.indent-1 { padding-left: 1.5rem; }
.indent-2 { padding-left: 3rem; }

.expand-arrow { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; font-size: 0.65rem; color: #9ca3af; transition: transform 0.2s; }
.expand-arrow.expanded { transform: rotate(90deg); }
.expand-arrow.hidden { visibility: hidden; }

.status-circle { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #0ea5e9; display: inline-block; }
.level-1 strong { font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }

.task-name-input { width: 100%; border: 1px solid transparent; background: transparent; padding: 0.2rem 0.4rem; font-size: 0.88rem; font-weight: 500; border-radius: 4px; color: #374151; }
.task-name-input:focus { border: 1px solid #4f46e5; background: white; }

/* BLOQUES VACÍOS */
.task-empty-slots { flex: 2; }

/* FECHAS Y STATUS */
.task-date { flex: 1; display: flex; justify-content: center; }
.date-input { width: 100%; max-width: 130px; padding: 0.3rem; font-size: 0.75rem; color: #4b5563; border: 1px solid #e5e7eb; border-radius: 6px; cursor: text;}

.task-status { flex: 1; display: flex; justify-content: center; }
.status-select { padding: 0.3rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; border: 1px solid #e5e7eb; outline: none; cursor: pointer; width: 110px; }
.status-pending { background: #fef9c3; color: #ca8a04; border-color: #fef08a;}
.status-in-progress { background: #e0f2fe; color: #0284c7; border-color: #bae6fd;}
.status-completed { background: #dcfce7; color: #16a34a; border-color: #bbf7d0;}

/* ACCIONES */
.task-actions { width: 50px; display: flex; gap: 0.3rem; justify-content: flex-end; opacity: 0; transition: opacity 0.2s; }
.task-row:hover .task-actions { opacity: 1; }
.btn-add-micro, .btn-del-micro { background: transparent; border: none; font-size: 0.8rem; cursor: pointer; padding: 0.2rem; border-radius: 4px; }
.btn-add-micro:hover { background: #e0f2fe; }
.btn-del-micro:hover { background: #fee2e2; }

.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
</style>