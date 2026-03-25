<template>
  <div class="container">
    <div class="header">
      <h1>Projects</h1>
      <button @click="showForm = !showForm" class="btn-primary">
        {{ showForm ? 'CANCEL' : '+ NEW PROJECT' }}
      </button>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editing ? 'Edit Project' : 'New Project' }}</h2>
      <div class="form-grid">
        <input v-model="form.name" placeholder="Project Name *" />
        <input v-model="form.client_name" placeholder="Client Name" />
        <input v-model="form.tech_pack_link" placeholder="Tech Pack URL" />
        <select v-model="form.status">
          <option value="Development">Development</option>
          <option value="Production">Production</option>
          <option value="Completed">Completed</option>
        </select>
        <input v-model="form.quotes" placeholder="Quote / Budget Info (e.g. $2,500)" class="full-row-input" />
      </div>
      <textarea v-model="form.description" placeholder="Project Description" rows="3" class="mt-3"></textarea>
      <div class="form-actions mt-3">
        <button @click="saveProject" class="btn-primary">
          {{ editing ? 'UPDATE PROJECT' : 'SAVE PROJECT' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading projects...</div>
    <div v-else class="cards-grid">
      <div v-for="p in projects" :key="p.id" class="card">
        <div class="card-content">
          <div class="card-top">
            <div class="card-avatar">{{ p.name?.charAt(0) }}</div>
            <div class="card-title">
              <h3>{{ p.name }}</h3>
              <span class="status-badge" :class="p.status?.toLowerCase().replace(' ', '-')">{{ p.status }}</span>
            </div>
          </div>

          <div class="card-body">
            <div class="info-row" v-if="p.client_name">
              <span class="info-icon">👤</span> <strong>Client:</strong> {{ p.client_name }}
            </div>
            
            <div class="info-row quote-highlight" v-if="p.quotes">
              <span class="info-icon">🧾</span> <strong>Quote:</strong> {{ p.quotes }}
            </div>

            <div class="info-row tech-pack-row" v-if="p.tech_pack_link">
              <span class="info-icon">📁</span> 
              <a :href="p.tech_pack_link" target="_blank" class="tp-link">View Tech Pack</a>
            </div>

            <p class="description-text" v-if="p.description">{{ p.description }}</p>
          </div>
        </div>

        <div class="card-footer">
          <div class="actions-grid">
            <button @click="goToSourcing(p.id)" class="btn-footer btn-f-sourcing">📦 SOURCING</button>
            <button @click="openTimeline(p)" class="btn-footer btn-f-timeline">⏱️ TIMELINE</button>
            <button @click="editProject(p)" class="btn-footer btn-f-edit">✏️ EDIT</button>
          </div>
          <button @click="deleteProject(p.id)" class="btn-f-delete">🗑️ DELETE</button>
        </div>
      </div>
    </div>

    <div v-if="timelineModal.show" class="modal-overlay" @click.self="timelineModal.show = false">
      <div class="modal modal-large">
        <div class="modal-header">
          <h2>⏱️ Timeline: {{ timelineModal.projectName }}</h2>
          <button @click="timelineModal.show = false" class="modal-close">✕</button>
        </div>
        
        <div v-if="timelineModal.loading" class="loading">Loading stages...</div>
        <div v-else class="timeline-container">
          
          <div class="timeline-header-row">
            <div class="th-name">Stage</div>
            <div class="th-date">Due Date</div>
            <div class="th-date">Completed Date</div>
            <div class="th-status">Status</div>
          </div>

          <div v-for="stage in timelineModal.stages" :key="stage.id" class="timeline-row">
            <div class="stage-name">
              <span class="stage-number">{{ stage.step_order }}</span>
              <strong>{{ stage.stage_name }}</strong>
            </div>
            <div class="stage-date">
              <input type="date" v-model="stage.due_date" class="date-input" />
            </div>
            <div class="stage-date">
              <input type="date" v-model="stage.completed_date" class="date-input" />
            </div>
            <div class="stage-status">
              <select v-model="stage.status" :class="'status-select ' + stage.status.toLowerCase().replace(' ', '-')">
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

        </div>

        <div class="modal-actions mt-4">
          <button @click="timelineModal.show = false" class="btn-secondary">CANCEL</button>
          <button @click="saveTimeline" class="btn-primary" :disabled="timelineModal.saving">
            {{ timelineModal.saving ? 'SAVING...' : 'SAVE TIMELINE' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const projects = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(false)
const editId = ref(null)

const form = ref({
  name: '', client_name: '', tech_pack_link: '', status: 'Development', description: '', quotes: ''
})

// Variables para el nuevo Timeline
const DEFAULT_STAGES = [
  'CONCEPT & DESIGN', 'QUOTE', 'MATERIAL & TRIM SOURCING', 
  'SAMPLE DEVELOPMENT', 'FINAL TECH PACK & BULK PREPARATION', 
  'QUALITY INSPECTION', 'SHIPPING & LOGISTICS', 'PROJECT COMPLETION'
]

const timelineModal = ref({
  show: false, loading: false, saving: false, projectId: null, projectName: '', stages: []
})

async function fetchProjects() {
  loading.value = true
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
  if (!error) projects.value = data
  loading.value = false
}

async function saveProject() {
  if (!form.value.name) return alert('Project name is required')
  if (editing.value) await supabase.from('projects').update(form.value).eq('id', editId.value)
  else await supabase.from('projects').insert([form.value])
  resetForm(); fetchProjects()
}

function editProject(p) {
  form.value = { ...p }; editId.value = p.id; editing.value = true; showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetForm() {
  form.value = { name: '', client_name: '', tech_pack_link: '', status: 'Development', description: '', quotes: '' }
  editing.value = false; editId.value = null; showForm.value = false
}

function goToSourcing(id) { router.push(`/projects/${id}/sourcing`) }

async function deleteProject(id) {
  if (confirm('Delete project and all associated data?')) {
    await supabase.from('projects').delete().eq('id', id)
    fetchProjects()
  }
}

// ---- LOGICA DEL TIMELINE (CLICKUP REPLACEMENT) ----
async function openTimeline(p) {
  timelineModal.value.show = true
  timelineModal.value.projectName = p.name
  timelineModal.value.projectId = p.id
  timelineModal.value.loading = true

  const { data } = await supabase.from('project_stages').select('*').eq('project_id', p.id).order('step_order', { ascending: true })

  if (!data || data.length === 0) {
    // Si no existen etapas, las creamos automáticamente
    const newStages = DEFAULT_STAGES.map((name, index) => ({
      project_id: p.id, stage_name: name, step_order: index + 1, status: 'Pending'
    }))
    await supabase.from('project_stages').insert(newStages)
    const { data: refreshed } = await supabase.from('project_stages').select('*').eq('project_id', p.id).order('step_order', { ascending: true })
    timelineModal.value.stages = refreshed || []
  } else {
    timelineModal.value.stages = data
  }
  timelineModal.value.loading = false
}

async function saveTimeline() {
  timelineModal.value.saving = true
  for (const stage of timelineModal.value.stages) {
    await supabase.from('project_stages').update({
      due_date: stage.due_date || null,
      completed_date: stage.completed_date || null,
      status: stage.status
    }).eq('id', stage.id)
  }
  timelineModal.value.saving = false
  timelineModal.value.show = false
  alert('Timeline updated successfully!')
}

onMounted(fetchProjects)
</script>

<style scoped>
.container { max-width: 1100px; margin: 0 auto; padding: 1.5rem; font-family: 'Inter', sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
h1 { font-size: 1.8rem; font-weight: 800; color: #111827; margin: 0; }

.form-card { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.form-card h2 { margin-top: 0; margin-bottom: 1rem; font-size: 1.1rem; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem; }
.full-row-input { grid-column: 1 / -1; }

input, textarea, select { width: 100%; padding: 0.6rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; box-sizing: border-box;}
input:focus, textarea:focus, select:focus { border-color: #4f46e5; outline: none; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.25rem; }
.card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 2px 4px -1px rgba(0,0,0,0.05); }
.card-content { padding: 1.25rem; flex-grow: 1; }

.card-top { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 0.75rem; }
.card-avatar { width: 40px; height: 40px; background: #4f46e5; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; }
.card-title h3 { font-size: 1.05rem; margin: 0 0 0.2rem 0; font-weight: 700; }

.status-badge { font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: 6px; font-weight: 700; text-transform: uppercase; }
.status-badge.development { background: #fef3c7; color: #92400e; }
.status-badge.production { background: #dcfce7; color: #166534; }
.status-badge.completed { background: #e0e7ff; color: #3730a3; }

.card-body { font-size: 0.85rem; color: #4b5563; }
.info-row { margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.4rem; }
.quote-highlight { color: #16a34a; font-weight: 600; background: #f0fdf4; padding: 0.25rem 0.5rem; border-radius: 6px; display: inline-flex; margin: 0.5rem 0; }
.tech-pack-row { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed #f3f4f6; }
.tp-link { color: #4f46e5; font-weight: 700; text-decoration: none; }

.description-text { font-size: 0.8rem; margin-top: 0.75rem; color: #6b7280; line-height: 1.4; }

.card-footer { background: #f9fafb; padding: 0.75rem; border-top: 1px solid #e5e7eb; }
.actions-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.4rem; margin-bottom: 0.4rem; }

.btn-footer { border: none; padding: 0.5rem; border-radius: 6px; font-size: 0.68rem; font-weight: 800; cursor: pointer; text-transform: uppercase; }
.btn-f-sourcing { background: #e0f2fe; color: #0369a1; }
.btn-f-timeline { background: #f3e8ff; color: #6b21a8; }
.btn-f-edit { background: #f1f5f9; color: #475569; }
.btn-f-delete { width: 100%; background: #fee2e2; color: #b91c1c; border: none; padding: 0.4rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; cursor: pointer; }

/* TIMELINE MODAL STYLES */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: white; padding: 1.5rem; border-radius: 16px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal-large { max-width: 800px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 1rem; }
.modal-header h2 { margin: 0; font-size: 1.25rem; color: #111827; }
.modal-close { background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #6b7280; display: flex; align-items: center; justify-content: center; }

.timeline-container { display: flex; flex-direction: column; gap: 0.5rem; }
.timeline-header-row { display: flex; padding: 0.5rem; background: #f9fafb; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; }
.th-name { flex: 2; }
.th-date { flex: 1; text-align: center; }
.th-status { flex: 1; text-align: right; }

.timeline-row { display: flex; align-items: center; padding: 0.75rem 0.5rem; border-bottom: 1px solid #f3f4f6; gap: 1rem; }
.stage-name { flex: 2; display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; color: #1f2937; }
.stage-number { background: #e0e7ff; color: #4338ca; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 800; font-size: 0.7rem; }
.stage-date { flex: 1; display: flex; justify-content: center; }
.date-input { width: 100%; max-width: 140px; padding: 0.4rem; font-size: 0.8rem; color: #4b5563; }
.stage-status { flex: 1; display: flex; justify-content: flex-end; }

.status-select { padding: 0.3rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; border: none; outline: none; cursor: pointer; }
.status-select.pending { background: #f3f4f6; color: #4b5563; }
.status-select.in-progress { background: #dbeafe; color: #1d4ed8; }
.status-select.completed { background: #dcfce7; color: #15803d; }

.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }

.btn-primary { background: #111827; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.8rem; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #f3f4f6; color: #4b5563; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.8rem; }
.loading { text-align: center; padding: 3rem; color: #6b7280; }
</style>