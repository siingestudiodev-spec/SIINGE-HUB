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
          <option v-for="stage in projectStages" :key="stage" :value="stage">{{ stage }}</option>
        </select>
        
        <input v-model="form.tech_pack_url" placeholder="Tech Pack URL (Google Drive, etc.)" />
      </div>
      <textarea v-model="form.description" placeholder="Description" rows="3" class="mt-4"></textarea>
      <div class="form-actions mt-4">
        <button @click="saveProject" class="btn-primary" :disabled="savingProject">
          {{ savingProject ? 'Saving...' : (editing ? 'Update' : 'Save') }}
        </button>
      </div>
    </div>

    <div class="filters">
      <input v-model="search" placeholder="🔍 Search by project or client..." class="search-input" />
      <select v-model="filterStatus" class="filter-select">
        <option value="">All Stages</option>
        <option v-for="stage in projectStages" :key="stage" :value="stage">{{ stage }}</option>
      </select>
      <button v-if="search || filterStatus" @click="clearFilters" class="btn-clear">✕ Clear</button>
      <span class="results-count">{{ filteredProjects.length }} result{{ filteredProjects.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="filteredProjects.length === 0" class="empty">No projects found.</div>
    <div v-else class="list-container">
      
      <div v-for="p in filteredProjects" :key="p.id" class="horizontal-card">
        
        <div class="card-identity">
          <div class="card-avatar">{{ p.project_name?.charAt(0) }}</div>
          <div class="card-title-block">
            <h3>{{ p.project_name }}</h3>
            <div class="badges-row">
              <span class="stage-badge">📍 {{ p.status }}</span>
            </div>
          </div>
        </div>

        <div class="card-info-main">
          <div class="contact-info">
            <div class="info-row" v-if="p.client_name">
              <span class="info-icon">👤</span><strong>{{ p.client_name }}</strong>
            </div>
            <div class="info-row text-muted">
              <span class="info-icon">📅</span> Created: {{ new Date(p.created_at).toLocaleDateString() }}
            </div>
          </div>

          <div class="info-row notes-row" v-if="p.description">
            <span class="info-icon">📄</span>
            <span class="truncate-text" :title="p.description">{{ p.description }}</span>
          </div>
        </div>

        <div class="card-details-block">
          <div class="tools-grid">
            <a v-if="p.tech_pack_url" :href="p.tech_pack_url" target="_blank" class="btn-tool techpack">📎 Tech Pack</a>
            <router-link :to="'/projects/' + p.id + '/quotes'" class="btn-tool quotes">📊 Quotes</router-link>
            <router-link :to="'/projects/' + p.id + '/sourcing'" class="btn-tool sourcing">📦 Sourcing</router-link>
          </div>
        </div>

        <div class="card-actions-vertical">
          <button @click="openTimeline(p)" class="btn-action-full btn-timeline">⏱️ TIMELINE</button>
          <div class="action-top-row mt-2">
            <button @click="editProject(p)" class="btn-action-icon btn-edit" title="Edit">✏️</button>
            <button @click="deleteProject(p.id)" class="btn-action-icon btn-delete" title="Delete">🗑️</button>
          </div>
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
                <strong>{{ cat.stage_name }}</strong>
                <span v-if="cat.notes && cat.notes.length > 0" class="notes-indicator">{{ cat.notes.length }}</span>
              </div>
              <div class="task-empty-slots"></div>
              <div class="task-actions" @click.stop>
                <button @click="openNotes(cat)" class="btn-note-micro" title="Notes">💬</button>
                <button @click="addSubtask(cat.id)" class="btn-add-micro" title="Add Subtask">➕</button>
              </div>
            </div>

            <div v-if="expanded.includes(cat.id)" class="children-container">
              <div v-for="sub in getChildren(cat.id)" :key="sub.id" class="subtask-wrapper">
                <div class="task-row level-2" @click="toggleExpand(sub.id)">
                  <div class="task-info indent-1">
                    <span class="expand-arrow" :class="{ 'expanded': expanded.includes(sub.id), 'hidden': getChildren(sub.id).length === 0 }">▶</span>
                    <input v-model="sub.stage_name" class="task-name-input" @click.stop />
                    <span v-if="sub.notes && sub.notes.length > 0" class="notes-indicator">{{ sub.notes.length }}</span>
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
                    <button @click="openNotes(sub)" class="btn-note-micro" title="Notes">💬</button>
                    <button @click="addSubtask(sub.id)" class="btn-add-micro" title="Add Sub-subtask">➕</button>
                    <button @click="deleteStage(sub.id)" class="btn-del-micro" title="Delete">🗑️</button>
                  </div>
                </div>

                <div v-if="expanded.includes(sub.id)">
                  <div v-for="subsub in getChildren(sub.id)" :key="subsub.id" class="task-row level-3">
                    <div class="task-info indent-2">
                      <span class="spacer-icon"></span>
                      <input v-model="subsub.stage_name" class="task-name-input" />
                      <span v-if="subsub.notes && subsub.notes.length > 0" class="notes-indicator">{{ subsub.notes.length }}</span>
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
                      <button @click="openNotes(subsub)" class="btn-note-micro" title="Notes">💬</button>
                      <button @click="deleteStage(subsub.id)" class="btn-del-micro" title="Delete">🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="timelineModal.show = false" class="btn-secondary">Cancel</button>
          <button @click="saveTimeline" class="btn-primary" :disabled="timelineModal.saving || timelineModal.loading">
            {{ timelineModal.saving ? 'Saving...' : 'Save Timeline' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="notesModal.show" class="modal-overlay z-high" @click.self="notesModal.show = false">
      <div class="modal notes-modal">
        <div class="modal-header">
          <h2>💬 Notes: {{ notesModal.stageName }}</h2>
          <button @click="notesModal.show = false" class="modal-close">✕</button>
        </div>
        
        <div class="notes-list">
          <div v-if="notesModal.notes.length === 0" class="empty-notes">
            No notes yet. Be the first to add one!
          </div>
          <div v-for="note in notesModal.notes" :key="note.id" class="note-item">
            <div class="note-meta">
              <strong>{{ note.user_email }}</strong> 
              <span>{{ new Date(note.created_at).toLocaleString() }}</span>
            </div>
            <div class="note-text">{{ note.text }}</div>
          </div>
        </div>

        <div class="add-note-box">
          <textarea v-model="notesModal.newNoteText" placeholder="Write an update or note..." rows="3"></textarea>
          <button @click="saveNote" class="btn-primary mt-2" :disabled="notesModal.saving || !notesModal.newNoteText.trim()">
            {{ notesModal.saving ? 'Saving...' : 'Add Note' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

// NUEVAS ETAPAS DE DESARROLLO (Basadas en la imagen)
const projectStages = [
  'Concept & Design',
  'Quote',
  'Material & Trim Sourcing',
  'Sample Development',
  'Final Tech Pack & Bulk Prep',
  'Quality Inspection',
  'Shipping & Logistics',
  'Project Completion'
]

const projects = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(false)
const editId = ref(null)
const search = ref('')
const filterStatus = ref('')
const savingProject = ref(false)
const currentUser = ref(null)

const form = ref({ project_name: '', client_name: '', description: '', status: projectStages[0], tech_pack_url: '' })

const timelineModal = ref({ show: false, loading: false, saving: false, projectId: null, projectName: '', stages: [] })
const expanded = ref([])
const notesModal = ref({ show: false, stageId: null, stageName: '', notes: [], newNoteText: '', saving: false })

const CLICKUP_TEMPLATE = [
  { name: 'CONCEPT & DESIGN', children: [{ name: 'Sketches Sent to Client' }, { name: 'Design Approved' }, { name: 'Tech Pack Due Date' }, { name: '3D Design Approved' }, { name: 'Tech Pack Completed' }] },
  { name: 'QUOTE', children: [{ name: 'Quote Due Date' }, { name: 'Quote Requests Sent to Factories' }, { name: 'Quote Received Date' }, { name: 'Factory Selected for Sampling' }] },
  { name: 'MATERIAL & TRIM SOURCING', children: [{ name: 'Sourcing Request Date' }, { name: 'Swatches Due Date' }, { name: 'Swatches Received Date' }, { name: 'Fabric Approval Date' }, { name: 'Fabric Lead Time' }, { name: 'Bulk Fabric Arrival at Factory — Date' }, { name: 'Labdip Due Date' }, { name: 'Lab Dip Received Date' }, { name: 'Lab Dip Approval Date' }] },
  { name: 'SAMPLE DEVELOPMENT', children: [{ name: 'First Sample', children: ['First Sample Due Date', 'Images Received Date', 'Corrections Completed Date', 'First Sample Received Date', 'Fit Notes Sent Date'] }, { name: 'Second Sample', children: ['Second sample due date', 'Images received date', 'Corrections completed date', 'Second sample received date', 'Fit Notes Sent Date'] }, { name: 'Fit Approval', children: ['Fit Approved — Initial Size', 'Fit Approved — Full Size Range'] }, { name: 'SIZE RANGE SAMPLES', children: ['Size Range Samples Due Date', 'Images Received Date', 'Corrections Completed Date', 'Size Range Received Date'] }, { name: 'TESTING', children: ['Required Tests (Dropdown)', 'Test Due Dates', 'Test Completed Dates', 'Testing Documentation'] }] },
  { name: 'FINAL TECH PACK & BULK PREPARATION', children: [{ name: 'Final Tech Pack Sent' }, { name: 'Bulk QC Due Date' }, { name: 'Bulk Due Date' }, { name: 'Bulk Shipping Date' }, { name: 'Bulk Arrival Date to 3PL' }] },
  { name: 'QUALITY INSPECTION', children: [{ name: 'Quality Inspection — Overview' }, { name: 'QC Document/Link' }, { name: 'QC Approval Date' }] },
  { name: 'SHIPPING & LOGISTICS', children: [{ name: 'Estimated Shipping Time' }, { name: 'Actual Shipping Time' }] },
  { name: 'PROJECT COMPLETION', children: [{ name: 'Total Project Duration' }, { name: 'Completion Date' }, { name: 'Reflection' }] }
]

const filteredProjects = computed(() => {
  return projects.value.filter(p => {
    const s = search.value.toLowerCase()
    const matchSearch = !s || p.project_name?.toLowerCase().includes(s) || p.client_name?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s)
    const matchStatus = !filterStatus.value || p.status === filterStatus.value
    return matchSearch && matchStatus
  })
})

const rootStages = computed(() => timelineModal.value.stages.filter(s => !s.parent_id).sort((a, b) => a.step_order - b.step_order))
function getChildren(parentId) { return timelineModal.value.stages.filter(s => s.parent_id === parentId).sort((a, b) => a.step_order - b.step_order) }
function toggleExpand(id) { if (expanded.value.includes(id)) expanded.value = expanded.value.filter(i => i !== id); else expanded.value.push(id) }
function clearFilters() { search.value = ''; filterStatus.value = '' }

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) currentUser.value = session.user
  fetchProjects()
})

async function fetchProjects() {
  loading.value = true
  const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
  projects.value = data || []
  loading.value = false
}

async function saveProject() {
  if (!form.value.project_name) return alert('Project name is required')
  savingProject.value = true
  
  if (editing.value) await supabase.from('projects').update(form.value).eq('id', editId.value)
  else await supabase.from('projects').insert([form.value])
  
  savingProject.value = false
  resetForm(); fetchProjects()
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
  form.value = { project_name: '', client_name: '', description: '', status: projectStages[0], tech_pack_url: '' }
  editing.value = false; editId.value = null; showForm.value = false
}

function openNotes(stage) { notesModal.value = { show: true, stageId: stage.id, stageName: stage.stage_name, notes: stage.notes || [], newNoteText: '', saving: false } }
async function saveNote() {
  if (!notesModal.value.newNoteText.trim()) return
  notesModal.value.saving = true
  const newNote = { id: crypto.randomUUID(), text: notesModal.value.newNoteText, user_email: currentUser.value?.email || 'Team Member', created_at: new Date().toISOString() }
  const updatedNotes = [...notesModal.value.notes, newNote]
  const { error } = await supabase.from('project_stages').update({ notes: updatedNotes }).eq('id', notesModal.value.stageId)
  if (!error) { notesModal.value.notes = updatedNotes; notesModal.value.newNoteText = ''; const stage = timelineModal.value.stages.find(s => s.id === notesModal.value.stageId); if (stage) stage.notes = updatedNotes } else alert('Error: ' + error.message)
  notesModal.value.saving = false
}

async function seedDefaultTree(projectId) {
  const allStagesToInsert = []
  for (let i = 0; i < CLICKUP_TEMPLATE.length; i++) {
    const l1 = CLICKUP_TEMPLATE[i]; const l1Id = crypto.randomUUID()
    allStagesToInsert.push({ id: l1Id, project_id: projectId, stage_name: l1.name, step_order: i + 1, status: 'Pending', parent_id: null, notes: [] })
    if (l1.name === 'SAMPLE DEVELOPMENT') expanded.value.push(l1Id)
    if (l1.children) {
      for (let j = 0; j < l1.children.length; j++) {
        const l2 = l1.children[j]; const l2Id = crypto.randomUUID(); const l2Name = typeof l2 === 'string' ? l2 : l2.name
        allStagesToInsert.push({ id: l2Id, project_id: projectId, parent_id: l1Id, stage_name: l2Name, step_order: j + 1, status: 'Pending', notes: [] })
        if (typeof l2 === 'object' && l2.children) {
          expanded.value.push(l2Id)
          for (let k = 0; k < l2.children.length; k++) allStagesToInsert.push({ id: crypto.randomUUID(), project_id: projectId, parent_id: l2Id, stage_name: l2.children[k], step_order: k + 1, status: 'Pending', notes: [] })
        }
      }
    }
  }
  await supabase.from('project_stages').insert(allStagesToInsert)
}

async function reloadTimelineData(projectId) { const { data } = await supabase.from('project_stages').select('*').eq('project_id', projectId); timelineModal.value.stages = data || [] }

async function openTimeline(p) {
  timelineModal.value.show = true; timelineModal.value.projectName = p.project_name; timelineModal.value.projectId = p.id; timelineModal.value.loading = true; expanded.value = []
  await reloadTimelineData(p.id)
  if (timelineModal.value.stages.length === 0) { await seedDefaultTree(p.id); await reloadTimelineData(p.id) }
  timelineModal.value.loading = false
}

async function forceResetTimeline() {
  if (!confirm('This will erase current dates. Proceed?')) return
  timelineModal.value.loading = true
  await supabase.from('project_stages').delete().eq('project_id', timelineModal.value.projectId); expanded.value = []
  await seedDefaultTree(timelineModal.value.projectId); await reloadTimelineData(timelineModal.value.projectId)
  timelineModal.value.loading = false
}

async function addSubtask(parentId) {
  const newTask = { id: crypto.randomUUID(), project_id: timelineModal.value.projectId, parent_id: parentId, stage_name: 'New Task', status: 'Pending', step_order: 99, notes: [] }
  await supabase.from('project_stages').insert([newTask])
  if (!expanded.value.includes(parentId)) expanded.value.push(parentId)
  await reloadTimelineData(timelineModal.value.projectId)
}

async function deleteStage(id) { if (!confirm('Delete this task?')) return; await supabase.from('project_stages').delete().eq('id', id); await reloadTimelineData(timelineModal.value.projectId) }

async function saveTimeline() {
  timelineModal.value.saving = true
  const updates = timelineModal.value.stages.map(stage => ({
    id: stage.id, project_id: stage.project_id, parent_id: stage.parent_id, stage_name: stage.stage_name, step_order: stage.step_order,
    due_date: stage.due_date || null, completed_date: stage.completed_date || null, status: stage.status
  }))
  const { error } = await supabase.from('project_stages').upsert(updates)
  timelineModal.value.saving = false
  if (error) alert('Error: ' + error.message); else timelineModal.value.show = false
}
</script>

<style scoped>
.container { max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem; color: var(--text-body); }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1, h2, h3 { color: var(--text-main); font-weight: 700; margin-bottom: 0.5rem; }
h1 { font-size: 2rem; margin: 0; }

.form-card { background: var(--bg-card); padding: 2rem; border-radius: 16px; border: 1px solid var(--border-main); margin-bottom: 2rem; box-shadow: 0 4px 24px rgba(0,0,0,0.2); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; }
input, textarea, select { width: 100%; padding: 0.7rem 1rem; background: var(--bg-app); color: var(--text-main); border: 1px solid var(--border-main); border-radius: 10px; font-size: 0.92rem; font-family: 'Inter', sans-serif; transition: border-color 0.15s; box-sizing: border-box; }
input:focus, textarea:focus, select:focus { outline: none; border-color: var(--primary); }
textarea { resize: vertical; }

.filters { display: flex; gap: 1rem; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; background: var(--bg-card); padding: 1rem; border-radius: 12px; border: 1px solid var(--border-main); }
.search-input, .filter-select { background: var(--bg-app); color: var(--text-main); border-color: var(--border-main); }
.results-count { color: var(--text-muted); font-size: 0.85rem; margin-left: auto; }

/* LISTA HORIZONTAL (NUEVA ESTRUCTURA) */
.list-container { display: flex; flex-direction: column; gap: 1.2rem; }

.horizontal-card { 
  background: var(--bg-card); 
  border-radius: 16px; 
  border: 1px solid var(--border-main); 
  display: flex; 
  align-items: stretch; 
  transition: transform 0.2s, box-shadow 0.2s; 
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  overflow: hidden; 
}
.horizontal-card:hover { transform: translateX(4px); border-color: var(--primary); box-shadow: 0 8px 15px rgba(0,0,0,0.15); }

/* Bloque 1: Identidad */
.card-identity { display: flex; align-items: flex-start; gap: 1rem; min-width: 280px; max-width: 320px; padding: 1.5rem; border-right: 1px solid var(--border-light); background: rgba(255,255,255,0.01); }
.card-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, var(--primary), #ec4899); color: white; font-weight: 700; font-size: 1.3rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-title-block h3 { margin: 0 0 0.3rem 0; font-size: 1.1rem; font-weight: 700; color: var(--text-main); line-height: 1.2; }
.stage-badge { background: rgba(99, 102, 241, 0.15); color: var(--primary); padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(99, 102, 241, 0.3); display: inline-block; margin-top: 0.3rem;}

/* Bloque 2: Info */
.card-info-main { flex: 2; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.8rem; }
.contact-info { display: flex; flex-wrap: wrap; gap: 1.2rem; }
.info-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; color: var(--text-body); }
.text-muted { color: var(--text-muted); font-size: 0.8rem; }

.notes-row { background: rgba(0,0,0,0.15); padding: 0.8rem; border-radius: 8px; border-left: 3px solid var(--border-main); color: var(--text-muted); font-style: italic; align-items: flex-start; }
.truncate-text { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.85rem; }

/* Bloque 3: Herramientas */
.card-details-block { flex: 1; padding: 1.5rem; border-left: 1px dashed var(--border-light); display: flex; flex-direction: column; gap: 0.8rem; min-width: 200px; justify-content: center;}
.tools-grid { display: flex; flex-direction: column; gap: 0.5rem; }
.btn-tool { padding: 0.5rem 0.8rem; border-radius: 8px; text-decoration: none; font-size: 0.8rem; font-weight: 600; border: 1px solid var(--border-main); color: var(--text-main); background: var(--bg-app); cursor: pointer; text-align: center;}
.btn-tool.techpack:hover { border-color: #a855f7; color: #a855f7; }
.btn-tool.quotes:hover { border-color: var(--success-text); color: var(--success-text); }
.btn-tool.sourcing:hover { border-color: var(--warning-text); color: var(--warning-text); }

/* Bloque 4: Acciones */
.card-actions-vertical { background: rgba(0,0,0,0.15); border-left: 1px solid var(--border-main); padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 0.6rem; min-width: 140px; justify-content: center; }
.action-top-row { display: flex; justify-content: space-between; gap: 0.3rem; }
.btn-action-icon { background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 6px; padding: 0.4rem; cursor: pointer; font-size: 0.8rem; flex: 1; display: flex; justify-content: center; align-items: center; transition: 0.2s; }
.btn-action-icon.btn-edit:hover { background: var(--border-light); }
.btn-action-icon.btn-delete:hover { background: var(--danger-bg); border-color: rgba(251, 113, 133, 0.3);}
.btn-action-full { width: 100%; padding: 0.6rem; border-radius: 8px; font-size: 0.75rem; font-weight: 800; border: none; cursor: pointer; text-transform: uppercase; transition: filter 0.2s; }
.btn-timeline { background: var(--primary); color: white; }
.btn-timeline:hover { filter: brightness(1.1); }

/* BOTONES GLOBALES */
.btn-primary { background: var(--primary); color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; transition: 0.15s; }
.btn-primary:hover { opacity: 0.9; }
.btn-secondary { background: var(--bg-app); color: var(--text-main); border: 1px solid var(--border-main); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 500; }
.btn-clear { background: var(--border-light); color: var(--text-muted); border: none; padding: 0.7rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; }

.loading, .empty { text-align: center; padding: 3rem; color: var(--text-muted); }
.mt-4 { margin-top: 1rem; }

/* MODAL DE TIMELINE (MANTENIDO INTACTO PERO CON VARIABLES GLOBALES) */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: var(--bg-card); padding: 2rem; border-radius: 16px; width: 100%; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border-main); }
.modal-large { max-width: 950px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding-bottom: 1rem; margin-bottom: 1.5rem; }
.header-actions { display: flex; gap: 1rem; align-items: center; }
.btn-reset-template { background: var(--danger-bg); color: var(--danger-text); border: 1px solid transparent; padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.modal-close { background: var(--bg-app); color: var(--text-muted); border: 1px solid var(--border-main); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;}

.timeline-container { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border-main); border-radius: 8px; overflow: hidden; }
.timeline-header-row { display: flex; padding: 0.75rem 1rem; background: var(--bg-app); font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border-main); }
.th-name { flex: 3; }
.th-date { flex: 1; text-align: center; }
.th-status { flex: 1; text-align: center; }
.th-action { width: 80px; }

.stage-group { border-bottom: 1px solid var(--border-light); background: var(--bg-card); }
.expand-arrow { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: var(--text-muted); font-size: 0.75rem; transition: transform 0.2s; user-select: none; }
.expand-arrow.expanded { transform: rotate(90deg); }
.expand-arrow.hidden { visibility: hidden; }
.spacer-icon { width: 20px; display: inline-block; }

.task-row { display: flex; align-items: center; padding: 0.5rem 1rem; border-bottom: 1px solid var(--border-light); cursor: pointer; transition: background 0.2s; }
.task-row:last-child { border-bottom: none; }
.level-1 { background: var(--bg-card); }
.level-1:hover { background: var(--bg-app); }
.level-1 strong { font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
.children-container { background: var(--bg-app); border-top: 1px solid var(--border-light); }
.level-2, .level-3 { background: transparent; }
.level-2:hover, .level-3:hover { background: var(--bg-card); }
.level-3 { border-top: 1px dashed var(--border-light); }

.task-info { flex: 3; display: flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; color: var(--text-main); }
.indent-1 { padding-left: 1rem; }
.indent-2 { padding-left: 2.5rem; }
.task-name-input { width: 100%; border: 1px solid transparent; background: transparent; padding: 0.2rem 0.4rem; font-size: 0.88rem; font-weight: 500; border-radius: 4px; color: var(--text-main); transition: border 0.2s; }
.task-name-input:focus { border: 1px solid var(--primary); background: var(--bg-card); }

.task-empty-slots { flex: 2; }
.task-date { flex: 1; display: flex; justify-content: center; }
.date-input { width: 100%; max-width: 130px; padding: 0.3rem; font-size: 0.75rem; color: var(--text-main); background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 6px; }

.task-status { flex: 1; display: flex; justify-content: center; }
.status-select { padding: 0.3rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; outline: none; cursor: pointer; width: 110px; background: var(--bg-card); border: 1px solid var(--border-main); color: var(--text-main); }
.status-pending { background: var(--warning-bg); color: var(--warning-text); border-color: transparent;}
.status-in-progress { background: rgba(14, 165, 233, 0.15); color: #7dd3fc; border-color: transparent;}
.status-completed { background: var(--success-bg); color: var(--success-text); border-color: transparent;}

.notes-indicator { background: var(--primary); color: white; font-size: 0.65rem; font-weight: 800; padding: 0.1rem 0.4rem; border-radius: 20px; margin-left: 0.3rem; }
.task-actions { width: 80px; display: flex; gap: 0.3rem; justify-content: flex-end; opacity: 0; transition: opacity 0.2s; }
.task-row:hover .task-actions { opacity: 1; }
.btn-note-micro, .btn-add-micro, .btn-del-micro { background: transparent; color: var(--text-muted); border: none; font-size: 0.8rem; cursor: pointer; padding: 0.2rem; border-radius: 4px; }
.btn-note-micro:hover { color: var(--primary); }
.btn-add-micro:hover { color: var(--success-text); }
.btn-del-micro:hover { color: var(--danger-text); }

.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }

/* MODAL DE NOTAS */
.z-high { z-index: 2000; }
.notes-modal { max-width: 450px; padding: 1.5rem; }
.notes-list { max-height: 300px; overflow-y: auto; margin-bottom: 1rem; border: 1px solid var(--border-main); border-radius: 8px; padding: 0.5rem; background: var(--bg-app); }
.empty-notes { text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 2rem; }
.note-item { background: var(--bg-card); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-main); margin-bottom: 0.5rem; }
.note-meta { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.4rem; border-bottom: 1px dashed var(--border-light); padding-bottom: 0.3rem;}
.note-meta strong { color: var(--primary); }
.note-text { font-size: 0.85rem; color: var(--text-body); line-height: 1.5; white-space: pre-wrap; }
.add-note-box { display: flex; flex-direction: column; gap: 0.5rem; }

/* RESPONSIVE */
@media (max-width: 1000px) {
  .horizontal-card { flex-direction: column; align-items: stretch; }
  .card-identity { border-right: none; border-bottom: 1px solid var(--border-light); max-width: none; }
  .card-details-block { border-left: none; border-top: 1px dashed var(--border-light); }
  .card-actions-vertical { border-left: none; border-top: 1px solid var(--border-main); flex-direction: row; flex-wrap: wrap; justify-content: space-between;}
  .card-actions-vertical > * { flex: 1; }
}
</style>