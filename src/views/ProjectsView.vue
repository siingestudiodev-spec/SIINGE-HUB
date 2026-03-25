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
        <input v-model="form.tech_pack_url" placeholder="Tech Pack URL (Google Drive, Dropbox, etc.)" />
        <input v-model="form.quotes" placeholder="Quote / Budget Info (e.g. $2,500)" style="grid-column: 1 / -1;" />
      </div>
      <textarea v-model="form.description" placeholder="Description" rows="3" style="margin-top: 0.75rem;"></textarea>
      <div class="form-actions">
        <button @click="saveProject" class="btn-primary">{{ editing ? 'Update' : 'Save' }}</button>
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
          <div class="info-row" v-if="p.quotes"><span class="info-icon">🧾</span><strong>Quote:</strong> {{ p.quotes }}</div>
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
            <div class="stage-date"><input type="date" v-model="stage.due_date" class="date-input" /></div>
            <div class="stage-date"><input type="date" v-model="stage.completed_date" class="date-input" /></div>
            <div class="stage-status">
              <select v-model="stage.status" :class="'status-select status-' + stage.status.toLowerCase().replace(' ', '-')">
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="timelineModal.show = false" class="btn-clear">Cancel</button>
          <button @click="saveTimeline" class="btn-primary" :disabled="timelineModal.saving">
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

const form = ref({ project_name: '', client_name: '', description: '', status: 'active', tech_pack_url: '', quotes: '' })

// Variables Timeline
const DEFAULT_STAGES = [
  'CONCEPT & DESIGN', 'QUOTE', 'MATERIAL & TRIM SOURCING', 
  'SAMPLE DEVELOPMENT', 'FINAL TECH PACK & BULK PREPARATION', 
  'QUALITY INSPECTION', 'SHIPPING & LOGISTICS', 'PROJECT COMPLETION'
]
const timelineModal = ref({ show: false, loading: false, saving: false, projectId: null, projectName: '', stages: [] })

const filteredProjects = computed(() => {
  return projects.value.filter(p => {
    const s = search.value.toLowerCase()
    const matchSearch = !s || p.project_name?.toLowerCase().includes(s) || p.client_name?.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s)
    const matchStatus = !filterStatus.value || p.status === filterStatus.value
    return matchSearch && matchStatus
  })
})

function clearFilters() { search.value = ''; filterStatus.value = '' }

async function fetchProjects() {
  loading.value = true
  const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
  projects.value = data || []
  loading.value = false
}

async function saveProject() {
  if (!form.value.project_name) return alert('Project name is required')
  if (editing.value) {
    await supabase.from('projects').update(form.value).eq('id', editId.value)
  } else {
    await supabase.from('projects').insert([form.value])
  }
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
  form.value = { project_name: '', client_name: '', description: '', status: 'active', tech_pack_url: '', quotes: '' }
  editing.value = false; editId.value = null; showForm.value = false
}

// LOGICA TIMELINE
async function openTimeline(p) {
  timelineModal.value.show = true
  timelineModal.value.projectName = p.project_name
  timelineModal.value.projectId = p.id
  timelineModal.value.loading = true

  const { data } = await supabase.from('project_stages').select('*').eq('project_id', p.id).order('step_order', { ascending: true })

  if (!data || data.length === 0) {
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
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; }

.form-card {
  background: white; padding: 2rem; border-radius: 16px;
  margin-bottom: 2rem; border: 1.5px solid #e5e7eb;
  box-shadow: 0 4px 24px rgba(79,70,229,0.07);
}
.form-card h2 { font-size: 1.1rem; margin-bottom: 1.25rem; color: #1a1a2e; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select {
  width: 100%; padding: 0.7rem 1rem;
  border: 1.5px solid #e5e7eb; border-radius: 10px;
  font-size: 0.92rem; color: #1a1a2e; background: white;
  font-family: 'Inter', sans-serif; transition: border-color 0.15s;
  box-sizing: border-box;
}
input:focus, textarea:focus, select:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; }
.form-actions { margin-top: 1rem; }

.filters { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.75rem; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 220px; }
.btn-clear { background: white; color: #666; border: 1.5px solid #e5e7eb; padding: 0.6rem 0.9rem; border-radius: 10px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; }
.results-count { color: #9ca3af; font-size: 0.85rem; white-space: nowrap; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }

.card {
  background: white; border-radius: 16px; padding: 1.5rem;
  border: 1.5px solid #e5e7eb;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  transition: transform 0.18s, box-shadow 0.18s;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(79,70,229,0.12);
  border-color: #c7d2fe;
}

.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.card-avatar {
  width: 48px; height: 48px;
  background: linear-gradient(135deg, #f093fb, #f5576c);
  color: white; font-weight: 700; font-size: 1.3rem;
  border-radius: 12px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
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
.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white; border: none; padding: 0.65rem 1.3rem;
  border-radius: 10px; cursor: pointer; font-size: 0.92rem;
  font-weight: 600; font-family: 'Inter', sans-serif;
  transition: opacity 0.15s, transform 0.15s;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-techpack { background: #faf5ff; color: #7c3aed; padding: 0.5rem 0.9rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; }
.btn-quotes { background: #f0fdf4; color: #16a34a; padding: 0.5rem 0.9rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; }
.btn-sourcing { background: #fffbeb; color: #d97706; padding: 0.5rem 0.9rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; }
/* NUEVO ESTILO: Botón de Timeline */
.btn-timeline { background: #f3e8ff; color: #6b21a8; border: none; padding: 0.5rem 0.9rem; border-radius: 8px; font-size: 0.85rem; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif;}
.btn-secondary { background: #eef2ff; color: #4f46e5; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }

/* TIMELINE MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.modal { background: white; padding: 2rem; border-radius: 16px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.modal-large { max-width: 850px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem; margin-bottom: 1.5rem; }
.modal-header h2 { margin: 0; font-size: 1.25rem; color: #1a1a2e; }
.modal-close { background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #6b7280; display: flex; align-items: center; justify-content: center; font-weight: bold;}

.timeline-container { display: flex; flex-direction: column; gap: 0.5rem; }
.timeline-header-row { display: flex; padding: 0.75rem 0.5rem; background: #f9fafb; border-radius: 8px; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; }
.th-name { flex: 2; }
.th-date { flex: 1; text-align: center; }
.th-status { flex: 1; text-align: right; }

.timeline-row { display: flex; align-items: center; padding: 0.75rem 0.5rem; border-bottom: 1px solid #f3f4f6; gap: 1rem; }
.stage-name { flex: 2; display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; color: #1f2937; }
.stage-number { background: linear-gradient(135deg, #667eea, #764ba2); color: white; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 700; font-size: 0.7rem; flex-shrink:0; }
.stage-date { flex: 1; display: flex; justify-content: center; }
.date-input { width: 100%; max-width: 140px; padding: 0.4rem; font-size: 0.8rem; color: #4b5563; }
.stage-status { flex: 1; display: flex; justify-content: flex-end; }

.status-select { padding: 0.4rem 0.6rem; border-radius: 8px; font-size: 0.75rem; font-weight: 600; border: 1px solid #e5e7eb; outline: none; cursor: pointer; width: 120px; }
.status-pending { background: #fef9c3; color: #ca8a04; border-color: #fef08a;}
.status-in-progress { background: #e0f2fe; color: #0284c7; border-color: #bae6fd;}
.status-completed { background: #dcfce7; color: #16a34a; border-color: #bbf7d0;}

.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; border-top: 1px solid #e5e7eb; padding-top: 1.5rem;}
</style>