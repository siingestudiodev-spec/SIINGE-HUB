<template>
  <div class="container">
    <div class="header">
      <div>
        <router-link to="/projects" class="back">← Back to Projects</router-link>
        <h1>{{ projectName }}</h1>
        <p class="subtitle" v-if="clientName">👤 {{ clientName }}</p>
        <a v-if="techPackUrl" :href="techPackUrl" target="_blank" class="tech-pack-link">📎 Tech Pack</a>
      </div>
      <button @click="showForm = !showForm" class="btn-primary">
        {{ showForm ? 'Cancel' : '+ Add Quote' }}
      </button>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>New Quote</h2>
      <div class="form-grid">
        <select v-model="form.manufacturer_id">
          <option value="" disabled>Select Factory *</option>
          <option v-for="m in manufacturers" :key="m.id" :value="m.id">{{ m.company_name }}</option>
        </select>
        <input v-model="form.item_description" placeholder="Item Description" />
        <input v-model="form.price_range" placeholder="Price Range (e.g. $4.50 - $6.00)" />
        <input v-model.number="form.sample_cost" placeholder="Sample Cost (USD)" type="number" step="0.01" />
        <input v-model.number="form.moq_per_color" placeholder="MOQ Per Color (units)" type="number" />
        <input v-model.number="form.lead_time_days" placeholder="Lead Time (days)" type="number" />
        <input v-model="form.specialty" placeholder="Specialty (e.g. Knitwear, Woven)" />
      </div>
      <textarea v-model="form.notes" placeholder="Notes" rows="2"></textarea>
      <div class="form-actions">
        <button @click="saveQuote" class="btn-primary">Save Quote</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="quotes.length === 0" class="empty">No quotes yet. Add the first one!</div>
    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Factory</th>
            <th>Country</th>
            <th>Contact</th>
            <th>MOQ / Color</th>
            <th>Price Range</th>
            <th>Sample Cost</th>
            <th>Lead Time</th>
            <th>Specialty</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in quotes" :key="q.id">
            <td>
              <div class="factory-cell">
                <div class="factory-avatar">{{ q.manufacturers?.company_name?.charAt(0) }}</div>
                <strong>{{ q.manufacturers?.company_name }}</strong>
              </div>
            </td>
            <td><span class="country-tag">{{ q.manufacturers?.country || '—' }}</span></td>
            <td class="contact-cell">
              <div v-if="q.manufacturers?.contact_name">👤 {{ q.manufacturers.contact_name }}</div>
              <div v-if="q.manufacturers?.phone">📞 {{ q.manufacturers.phone }}</div>
              <div v-if="q.manufacturers?.email">✉️ {{ q.manufacturers.email }}</div>
            </td>
            <td>{{ q.moq_per_color ? q.moq_per_color.toLocaleString() + ' u' : '—' }}</td>
            <td><span class="price-tag">{{ q.price_range || '—' }}</span></td>
            <td>{{ q.sample_cost ? '$' + q.sample_cost.toFixed(2) : '—' }}</td>
            <td>{{ q.lead_time_days ? q.lead_time_days + ' days' : '—' }}</td>
            <td><span v-if="q.specialty" class="specialty-tag">{{ q.specialty }}</span><span v-else>—</span></td>
            <td class="notes-cell">{{ q.notes || '—' }}</td>
            <td><button @click="deleteQuote(q.id)" class="btn-delete">✕</button></td>
          </tr>
        </tbody>
      </table>
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
const showForm = ref(false)
const projectName = ref('')
const clientName = ref('')
const techPackUrl = ref('')

const form = ref({
  manufacturer_id: '', item_description: '', price_range: '',
  sample_cost: '', moq_per_color: '', lead_time_days: '', specialty: '', notes: ''
})

async function fetchData() {
  loading.value = true
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (project) { projectName.value = project.project_name; clientName.value = project.client_name; techPackUrl.value = project.tech_pack_url }
  const { data: q } = await supabase.from('quotes').select('*, manufacturers(company_name, country, contact_name, phone, email)').eq('project_id', projectId)
  quotes.value = q || []
  const { data: m } = await supabase.from('manufacturers').select('id, company_name').order('company_name')
  manufacturers.value = m || []
  loading.value = false
}

async function saveQuote() {
  if (!form.value.manufacturer_id) return alert('Select a factory')
  await supabase.from('quotes').insert([{ ...form.value, project_id: projectId }])
  form.value = { manufacturer_id: '', item_description: '', price_range: '', sample_cost: '', moq_per_color: '', lead_time_days: '', specialty: '', notes: '' }
  showForm.value = false; fetchData()
}

async function deleteQuote(id) {
  if (!confirm('Delete this quote?')) return
  await supabase.from('quotes').delete().eq('id', id); fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.container { max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.back { color: #4f46e5; text-decoration: none; font-size: 0.88rem; font-weight: 500; display: block; margin-bottom: 0.5rem; }
.back:hover { text-decoration: underline; }
h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; }
.subtitle { color: #6b7280; margin-top: 0.25rem; font-size: 0.92rem; }
.tech-pack-link { display: inline-block; margin-top: 0.6rem; background: #faf5ff; color: #7c3aed; padding: 0.3rem 0.8rem; border-radius: 8px; text-decoration: none; font-size: 0.85rem; font-weight: 500; }

.form-card { background: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1.5px solid #e5e7eb; box-shadow: 0 4px 24px rgba(79,70,229,0.07); }
.form-card h2 { font-size: 1.1rem; margin-bottom: 1.25rem; color: #1a1a2e; }
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.92rem; color: #1a1a2e; background: white; font-family: 'Inter', sans-serif; transition: border-color 0.15s; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; }
.form-actions { margin-top: 1rem; }

.table-wrapper { background: white; border-radius: 16px; border: 1.5px solid #e5e7eb; box-shadow: 0 4px 24px rgba(79,70,229,0.07); overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 1000px; }
thead { background: linear-gradient(135deg, #667eea, #764ba2); }
th { color: white; padding: 1rem 1.1rem; text-align: left; font-size: 0.82rem; font-weight: 600; letter-spacing: 0.03em; white-space: nowrap; }
td { padding: 1rem 1.1rem; border-bottom: 1px solid #f3f4f6; font-size: 0.88rem; color: #374151; vertical-align: top; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #fafbff; }

.factory-cell { display: flex; align-items: center; gap: 0.6rem; }
.factory-avatar { width: 32px; height: 32px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-weight: 700; font-size: 0.85rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.country-tag { background: #eef2ff; color: #4f46e5; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; white-space: nowrap; }
.contact-cell { font-size: 0.82rem; color: #6b7280; line-height: 1.6; }
.price-tag { font-weight: 700; color: #1a1a2e; }
.specialty-tag { background: #f0fdf4; color: #16a34a; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; }
.notes-cell { color: #9ca3af; font-style: italic; max-width: 180px; font-size: 0.82rem; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; font-family: 'Inter', sans-serif; transition: opacity 0.15s, transform 0.15s; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-delete { background: #fff1f2; color: #e11d48; border: none; padding: 0.35rem 0.7rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-delete:hover { background: #ffe4e6; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }
</style>
