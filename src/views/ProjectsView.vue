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
      </div>
      <textarea v-model="form.description" placeholder="Description" rows="3"></textarea>
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
          <div class="info-row date-row"><span class="info-icon">📅</span>{{ new Date(p.created_at).toLocaleDateString() }}</div>
        </div>
        <div class="card-actions">
          <a v-if="p.tech_pack_url" :href="p.tech_pack_url" target="_blank" class="btn-techpack">📎 Tech Pack</a>
          <router-link :to="'/projects/' + p.id + '/quotes'" class="btn-quotes">📊 Quotes</router-link>
          <button @click="editProject(p)" class="btn-secondary">Edit</button>
          <button @click="deleteProject(p.id)" class="btn-danger">Delete</button>
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

const form = ref({ project_name: '', client_name: '', description: '', status: 'active', tech_pack_url: '' })

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
  form.value = { project_name: '', client_name: '', description: '', status: 'active', tech_pack_url: '' }
  editing.value = false; editId.value = null; showForm.value = false
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
.status-badge { padding: 0.2rem 0.65rem; border-radius: 20px; font-size: 0.78rem; font-weight: 600; }
.status-active { background: #dcfce7; color: #16a34a; }
.status-pending { background: #fef9c3; color: #ca8a04; }
.status-closed { background: #ffe4e6; color: #e11d48; }

.card-body { margin-bottom: 1.25rem; }
.info-row { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.45rem; font-size: 0.88rem; color: #4b5563; }
.info-icon { flex-shrink: 0; }
.date-row { color: #9ca3af !important; font-size: 0.82rem !important; }

.card-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; flex-wrap: wrap; }
.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white; border: none; padding: 0.65rem 1.3rem;
  border-radius: 10px; cursor: pointer; font-size: 0.92rem;
  font-weight: 600; font-family: 'Inter', sans-serif;
  transition: opacity 0.15s, transform 0.15s;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-techpack { background: #faf5ff; color: #7c3aed; padding: 0.5rem 0.9rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; }
.btn-quotes { background: #f0fdf4; color: #16a34a; padding: 0.5rem 0.9rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; }
.btn-secondary { background: #eef2ff; color: #4f46e5; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }
</style>
