<template>
  <div class="container">
    <div class="header">
      <div>
        <router-link to="/projects" class="back">← Back to Projects</router-link>
        <h1>{{ projectName }}</h1>
        <p class="subtitle" v-if="clientName">👤 {{ clientName }}</p>
      </div>
      <div class="header-actions">
        <button @click="exportExcel" class="btn-export" v-if="quotes.length > 0">⬇ EXPORT EXCEL</button>
        <button @click="openCreateForm" class="btn-primary">
          {{ showForm ? 'CANCEL' : '+ ADD QUOTE' }}
        </button>
      </div>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editingId ? 'Edit Quote' : 'New Quote' }}</h2>
      <div class="form-grid">
        <div class="input-field">
          <label>Factory *</label>
          <select v-model="form.manufacturer_id">
            <option value="" disabled>Select Factory</option>
            <option v-for="m in manufacturers" :key="m.id" :value="m.id">{{ m.company_name }}</option>
          </select>
        </div>
        <div class="input-field">
          <label>Item Description</label>
          <input v-model="form.item_description" placeholder="e.g. Cotton T-Shirt" />
        </div>
        <div class="input-field">
          <label>Price Range</label>
          <input v-model="form.price_range" placeholder="e.g. $4.50 - $6.00" />
        </div>
        <div class="input-field">
          <label>Sample Cost (USD)</label>
          <input v-model.number="form.sample_cost" type="number" step="0.01" />
        </div>
        <div class="input-field">
          <label>MOQ / Color</label>
          <input v-model.number="form.moq_per_color" type="number" />
        </div>
        <div class="input-field">
          <label>Lead Time (days)</label>
          <input v-model.number="form.lead_time_days" type="number" />
        </div>
      </div>
      <div class="input-field full-row mt-3">
        <label>Specialty</label>
        <input v-model="form.specialty" placeholder="e.g. Knitwear, Woven" />
      </div>
      <div class="input-field full-row mt-3">
        <label>Notes</label>
        <textarea v-model="form.notes" placeholder="Additional details..." rows="2"></textarea>
      </div>
      <div class="form-actions">
        <button @click="saveQuote" class="btn-primary" :disabled="saving">
          {{ saving ? 'SAVING...' : (editingId ? 'UPDATE QUOTE' : 'SAVE QUOTE') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="quotes.length === 0" class="empty">No quotes yet. Add the first one!</div>
    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Factory</th>
            <th>MOQ / Color</th>
            <th>Price Range</th>
            <th>Sample Cost</th>
            <th>Lead Time</th>
            <th>Notes</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in quotes" :key="q.id">
            <td>
              <div class="factory-cell">
                <div class="factory-avatar">{{ q.manufacturers?.company_name?.charAt(0) }}</div>
                <div>
                  <strong>{{ q.manufacturers?.company_name }}</strong>
                  <div class="text-xs text-gray-400">{{ q.manufacturers?.country }}</div>
                </div>
              </div>
            </td>
            <td>{{ q.moq_per_color ? q.moq_per_color.toLocaleString() + ' u' : '—' }}</td>
            <td><span class="price-tag">{{ q.price_range || '—' }}</span></td>
            <td>{{ q.sample_cost ? '$' + q.sample_cost.toFixed(2) : '—' }}</td>
            <td>{{ q.lead_time_days ? q.lead_time_days + ' days' : '—' }}</td>
            <td class="notes-cell">{{ q.notes || '—' }}</td>
            <td class="text-right">
              <div class="table-actions">
                <button @click="editQuote(q)" class="btn-icon btn-edit-icon" title="Edit">✏️</button>
                <button @click="confirmDelete(q.id)" class="btn-icon btn-delete-icon" title="Delete">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="notification.show" class="notification-overlay">
      <div class="notification-card" :class="notification.type">
        <div class="notif-icon">{{ notification.type === 'success' ? '✅' : '⚠️' }}</div>
        <div class="notif-content">
          <p>{{ notification.message }}</p>
        </div>
        <button @click="notification.show = false" class="btn-notif-close">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
const projectId = route.params.id
const quotes = ref([])
const manufacturers = ref([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const editingId = ref(null)
const projectName = ref('')
const clientName = ref('')

const notification = ref({ show: false, message: '', type: 'success' })

const form = ref({
  manufacturer_id: '', item_description: '', price_range: '',
  sample_cost: null, moq_per_color: null, lead_time_days: null, specialty: '', notes: ''
})

function showMsg(msg, type = 'success') {
  notification.value = { show: true, message: msg, type: type }
  if (type === 'success') setTimeout(() => notification.value.show = false, 3000)
}

async function fetchData() {
  loading.value = true
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (project) {
    projectName.value = project.name || project.project_name
    clientName.value = project.client_name
  }
  
  const { data: q } = await supabase
    .from('quotes')
    .select('*, manufacturers(company_name, country, contact_name, phone, email)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  
  quotes.value = q || []
  const { data: m } = await supabase.from('manufacturers').select('id, company_name').order('company_name')
  manufacturers.value = m || []
  loading.value = false
}

function openCreateForm() {
  editingId.value = null
  resetForm()
  showForm.value = !showForm.value
}

function resetForm() {
  form.value = { manufacturer_id: '', item_description: '', price_range: '', sample_cost: null, moq_per_color: null, lead_time_days: null, specialty: '', notes: '' }
}

function editQuote(q) {
  editingId.value = q.id
  form.value = { ...q }
  delete form.value.manufacturers // Limpiar objeto relacionado
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function saveQuote() {
  if (!form.value.manufacturer_id) return showMsg('Select a factory', 'error')
  saving.value = true
  
  try {
    if (editingId.value) {
      const { error } = await supabase.from('quotes').update(form.value).eq('id', editingId.value)
      if (error) throw error
      showMsg('Quote updated correctly')
    } else {
      const { error } = await supabase.from('quotes').insert([{ ...form.value, project_id: projectId }])
      if (error) throw error
      showMsg('New quote saved')
    }
    showForm.value = false
    fetchData()
  } catch (err) {
    showMsg(err.message, 'error')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(id) {
  if (confirm('Are you sure you want to delete this quote?')) {
    await supabase.from('quotes').delete().eq('id', id)
    fetchData()
    showMsg('Quote deleted')
  }
}

onMounted(fetchData)
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; font-family: 'Inter', sans-serif; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.back { color: #6366f1; text-decoration: none; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; display: block; }
h1 { font-size: 1.8rem; font-weight: 800; color: #111827; margin: 0; }
.subtitle { color: #6b7280; font-size: 0.95rem; margin-top: 0.2rem; }

/* FORM */
.form-card { background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
.form-card h2 { font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.25rem; color: #4b5563; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.input-field label { display: block; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 0.4rem; }
input, select, textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.9rem; transition: border-color 0.2s; }
input:focus { border-color: #6366f1; outline: none; }

/* TABLE */
.table-wrapper { background: white; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th { background: #f9fafb; padding: 0.75rem 1rem; text-align: left; font-size: 0.7rem; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
td { padding: 1rem; border-bottom: 1px solid #f3f4f6; font-size: 0.88rem; vertical-align: middle; }
.factory-cell { display: flex; align-items: center; gap: 0.75rem; }
.factory-avatar { width: 32px; height: 32px; background: #e0e7ff; color: #4338ca; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.8rem; }
.price-tag { font-weight: 700; color: #111827; background: #f0fdf4; padding: 0.2rem 0.5rem; border-radius: 6px; }

/* ACTIONS */
.table-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
.btn-icon { background: none; border: none; cursor: pointer; padding: 0.4rem; border-radius: 6px; transition: background 0.2s; }
.btn-edit-icon:hover { background: #eef2ff; }
.btn-delete-icon:hover { background: #fef2f2; }

/* NOTIFICATION MODAL */
.notification-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.notification-card { background: white; padding: 2rem; border-radius: 16px; width: 300px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
.notif-icon { font-size: 2.5rem; margin-bottom: 1rem; }
.notif-content p { font-weight: 600; color: #1f2937; margin-bottom: 1.5rem; }
.btn-notif-close { background: #111827; color: white; border: none; padding: 0.6rem 2rem; border-radius: 8px; font-weight: 700; cursor: pointer; width: 100%; }

.btn-primary { background: #111827; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.75rem; }
.btn-export { background: white; color: #111827; border: 1.5px solid #e5e7eb; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.75rem; }
.loading, .empty { text-align: center; padding: 4rem; color: #9ca3af; }
.text-right { text-align: right; }
</style>