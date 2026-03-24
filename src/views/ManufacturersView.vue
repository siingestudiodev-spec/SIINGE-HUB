<template>
  <div class="container">
    <div class="header">
      <h1>Manufacturers</h1>
      <button @click="openAddForm" class="btn-primary">
        {{ showForm ? 'Cancel' : '+ Add Manufacturer' }}
      </button>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editing ? 'Edit Manufacturer' : 'New Manufacturer' }}</h2>
      <div class="form-grid">
        <input v-model="form.company_name" placeholder="Company Name *" />
        <input v-model="form.country" placeholder="Country" />
        <input v-model="form.contact_name" placeholder="Contact Name" />
        <input v-model="form.phone" placeholder="Phone" />
        <input v-model="form.email" placeholder="Email" />
        <input v-model="form.website" placeholder="Website" />
      </div>

      <div class="categories-section">
        <label class="section-label">Product Categories</label>
        <div class="categories-grid">
          <label v-for="cat in categoryOptions" :key="cat" class="category-checkbox">
            <input type="checkbox" :value="cat" v-model="selectedCategories" />
            <span>{{ cat }}</span>
          </label>
        </div>
      </div>

      <textarea v-model="form.notes" placeholder="Notes" rows="3" class="mt-4"></textarea>
      <div class="form-actions">
        <button @click="saveManufacturer" class="btn-primary">{{ editing ? 'Update' : 'Save' }}</button>
      </div>
    </div>

    <div class="filters">
      <input v-model="search" placeholder="🔍 Search by name, country, category..." class="search-input" />
      <select v-model="filterCountry">
        <option value="">All Countries</option>
        <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filterCategory">
        <option value="">All Categories</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <button v-if="search || filterCountry || filterCategory" @click="clearFilters" class="btn-clear">✕ Clear</button>
      <span class="results-count">{{ filteredManufacturers.length }} result{{ filteredManufacturers.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="filteredManufacturers.length === 0" class="empty">No manufacturers found.</div>
    <div v-else class="cards-grid">
      <div v-for="m in filteredManufacturers" :key="m.id" class="card">
        <div class="card-top">
          <div class="card-avatar">{{ m.company_name?.charAt(0) }}</div>
          <div class="card-title">
            <h3>{{ m.company_name }}</h3>
            <span class="country-badge">🌍 {{ m.country }}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="info-row" v-if="m.contact_name"><span class="info-icon">👤</span>{{ m.contact_name }}</div>
          <div class="info-row" v-if="m.phone"><span class="info-icon">📞</span>{{ m.phone }}</div>
          <div class="info-row" v-if="m.email"><span class="info-icon">✉️</span>{{ m.email }}</div>
          <div class="info-row" v-if="m.website"><span class="info-icon">🌐</span><a :href="m.website" target="_blank">{{ m.website }}</a></div>
          
          <div class="info-row" v-if="m.product_categories">
            <span class="info-icon">🏷️</span>
            <div class="tags-container">
              <span v-for="tag in m.product_categories.split(',')" :key="tag" class="category-tag">
                {{ tag.trim() }}
              </span>
            </div>
          </div>
          
          <div class="info-row notes-row" v-if="m.notes"><span class="info-icon">📝</span>{{ m.notes }}</div>
        </div>
        
        <div v-if="m.email_logs && m.email_logs.length > 0" class="email-history">
          <div v-for="(log, index) in m.email_logs" :key="index" 
               class="reach-date"
               :class="{ 'overdue': index === m.email_logs.length - 1 && isOverdue(log.sentAt) }">
            📧 {{ log.templateName }}: {{ new Date(log.sentAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) }}
            <span v-if="index === m.email_logs.length - 1 && isOverdue(log.sentAt)" class="warning-icon"> ⚠️ Follow up needed!</span>
          </div>
        </div>

        <div class="card-actions">
          <button @click="editManufacturer(m)" class="btn-secondary">Edit</button>
          <button @click="logExternalContact(m)" class="btn-log" title="Log external contact">Log Contact</button>
          <button v-if="m.email" @click="openEmailModal(m)" class="btn-email">Email</button>
          <button @click="deleteManufacturer(m.id)" class="btn-danger">Delete</button>
        </div>
      </div>
    </div>

    <div v-if="emailModal.show" class="modal-overlay" @click.self="emailModal.show = false">
      <div class="modal">
        <div class="modal-header">
          <h2>✉️ Send Email to {{ emailModal.companyName }}</h2>
          <button @click="emailModal.show = false" class="modal-close">✕</button>
        </div>
        <div class="modal-field">
          <label>To</label>
          <input v-model="emailModal.to" placeholder="Recipient email" />
        </div>
        <div class="modal-field">
          <label>Select Template</label>
          <select v-model="emailModal.selectedTemplate" @change="applyTemplate">
            <option value="">-- Choose a template --</option>
            <option v-for="t in templatesList" :key="t.id" :value="t">{{ t.name }}</option>
          </select>
        </div>
        <div class="modal-field">
          <label>Subject</label>
          <input v-model="emailModal.subject" />
        </div>
        <div class="modal-field">
          <label>Message</label>
          <textarea v-model="emailModal.body" rows="12"></textarea>
        </div>
        <div class="modal-actions">
          <button @click="emailModal.show = false" class="btn-secondary">Cancel</button>
          <button @click="sendEmail" class="btn-email-send" :disabled="emailModal.sending || (!emailModal.subject || !emailModal.body)">
            {{ emailModal.sending ? 'Sending...' : '🚀 Send Email' }}
          </button>
        </div>
        <div v-if="emailModal.success" class="modal-success">✅ Email sent successfully!</div>
        <div v-if="emailModal.error" class="modal-error">❌ {{ emailModal.error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE_ID  = 'service_vxy88pq'
const EMAILJS_TEMPLATE_ID = 'template_44apzvs'
const EMAILJS_PUBLIC_KEY  = 'CFmOQW7RjLSBDwIOV'

const manufacturers = ref([])
const templatesList = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(false)
const editId = ref(null)
const search = ref('')
const filterCountry = ref('')
const filterCategory = ref('')

// OPCIONES PARA CHECKBOXES
const categoryOptions = [
  'Activewear', "Children's wear", 'Swimwear', 'Evening wear', 
  'Streetwear', 'Launchwear', 'Intimate Apparel', 'Leather Good', 'Accessories'
]
const selectedCategories = ref([])

const form = ref({
  company_name: '', country: '', contact_name: '',
  phone: '', email: '', website: '', product_categories: '', notes: ''
})

const emailModal = ref({
  show: false, to: '', subject: '', body: '',
  sending: false, success: false, error: '',
  manufacturerId: null, companyName: '', selectedTemplate: ''
})

const countries = computed(() => [...new Set(manufacturers.value.map(m => m.country).filter(Boolean))].sort())
const categories = computed(() => {
  const all = manufacturers.value.flatMap(m =>
    m.product_categories ? m.product_categories.split(',').map(c => c.trim()) : []
  )
  return [...new Set(all)].filter(Boolean).sort()
})

const filteredManufacturers = computed(() => {
  return manufacturers.value.filter(m => {
    const s = search.value.toLowerCase()
    const matchSearch = !s || m.company_name?.toLowerCase().includes(s) || m.country?.toLowerCase().includes(s) || m.product_categories?.toLowerCase().includes(s) || m.contact_name?.toLowerCase().includes(s)
    const matchCountry = !filterCountry.value || m.country === filterCountry.value
    const matchCategory = !filterCategory.value || m.product_categories?.toLowerCase().includes(filterCategory.value.toLowerCase())
    return matchSearch && matchCountry && matchCategory
  })
})

function clearFilters() { search.value = ''; filterCountry.value = ''; filterCategory.value = '' }

function isOverdue(dateString) {
  if (!dateString) return false
  const diffDays = Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24))
  return diffDays >= 7
}

function openAddForm() {
  resetForm()
  showForm.value = !showForm.value
}

function openEmailModal(m) {
  emailModal.value = { show: true, to: m.email, subject: '', body: '', sending: false, success: false, error: '', manufacturerId: m.id, companyName: m.company_name, selectedTemplate: '' }
}

function applyTemplate() {
  const t = emailModal.value.selectedTemplate
  if (!t) return
  emailModal.value.subject = t.subject.replace(/{{company_name}}/g, emailModal.value.companyName)
  emailModal.value.body = t.body.replace(/{{company_name}}/g, emailModal.value.companyName)
}

async function logExternalContact(m) {
  const customNote = prompt(`Log manual contact for ${m.company_name}:`, '')
  if (!customNote) return
  const sentAt = new Date().toISOString()
  const newLog = { templateName: customNote.trim(), sentAt }
  const updatedLogs = [...(m.email_logs || []), newLog]
  await supabase.from('manufacturers').update({ email_logs: updatedLogs, last_email_sent_at: sentAt }).eq('id', m.id)
  fetchManufacturers()
}

async function sendEmail() {
  emailModal.value.sending = true
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { to_email: emailModal.value.to, subject: emailModal.value.subject, message: emailModal.value.body }, EMAILJS_PUBLIC_KEY)
    const sentAt = new Date().toISOString()
    const newLog = { templateName: emailModal.value.selectedTemplate?.name || 'Custom Email', sentAt }
    const m = manufacturers.value.find(man => man.id === emailModal.value.manufacturerId)
    await supabase.from('manufacturers').update({ initial_reach_sent: true, initial_reach_sent_at: sentAt, email_logs: [...(m.email_logs || []), newLog], last_email_sent_at: sentAt }).eq('id', m.id)
    fetchManufacturers()
    emailModal.value.success = true
    setTimeout(() => { emailModal.value.show = false }, 1500)
  } catch (err) {
    emailModal.value.error = 'Error sending email.'
  } finally {
    emailModal.value.sending = false
  }
}

async function fetchManufacturers() {
  loading.value = true
  const { data } = await supabase.from('manufacturers').select('*').order('company_name')
  manufacturers.value = data || []
  loading.value = false
}

async function fetchTemplates() {
  const { data } = await supabase.from('templates').select('*').order('name')
  templatesList.value = data || []
}

async function saveManufacturer() {
  if (!form.value.company_name) return alert('Name required')
  // Convertimos el array de los checkboxes a string para la DB
  form.value.product_categories = selectedCategories.value.join(', ')
  
  if (editing.value) {
    await supabase.from('manufacturers').update(form.value).eq('id', editId.value)
  } else {
    await supabase.from('manufacturers').insert([form.value])
  }
  resetForm(); fetchManufacturers()
}

function editManufacturer(m) {
  form.value = { ...m }
  selectedCategories.value = m.product_categories ? m.product_categories.split(',').map(s => s.trim()) : []
  editId.value = m.id; editing.value = true; showForm.value = true
}

async function deleteManufacturer(id) {
  if (confirm('Delete?')) { await supabase.from('manufacturers').delete().eq('id', id); fetchManufacturers() }
}

function resetForm() {
  form.value = { company_name: '', country: '', contact_name: '', phone: '', email: '', website: '', product_categories: '', notes: '' }
  selectedCategories.value = []
  editing.value = false; editId.value = null; showForm.value = false
}

onMounted(() => { fetchManufacturers(); fetchTemplates() })
</script>

<style scoped>
/* HEREDAMOS TUS ESTILOS Y AGREGAMOS LOS DE LOS CHECKBOXES */
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; }

.form-card { background: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1.5px solid #e5e7eb; box-shadow: 0 4px 24px rgba(79,70,229,0.07); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }

/* ESTILOS NUEVOS PARA CATEGORÍAS */
.categories-section { margin-top: 1rem; }
.section-label { display: block; font-size: 0.85rem; font-weight: 700; color: #4b5563; text-transform: uppercase; margin-bottom: 0.75rem; }
.categories-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.category-checkbox { display: flex; align-items: center; gap: 0.5rem; background: #f3f4f6; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; border: 1px solid transparent; }
.category-checkbox:hover { background: #e5e7eb; }
.category-checkbox input { width: auto; margin: 0; }
.category-checkbox:has(input:checked) { background: #eef2ff; border-color: #4f46e5; color: #4f46e5; }
.mt-4 { margin-top: 1rem; }

input, textarea, select { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.92rem; color: #1a1a2e; background: white; font-family: 'Inter', sans-serif; transition: border-color 0.15s; box-sizing: border-box; }
.filters { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.75rem; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 220px; }
.btn-clear { background: white; color: #666; border: 1.5px solid #e5e7eb; padding: 0.6rem 0.9rem; border-radius: 10px; cursor: pointer; font-size: 0.88rem; }
.results-count { color: #9ca3af; font-size: 0.85rem; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
.card { background: white; border-radius: 16px; padding: 1.5rem; border: 1.5px solid #e5e7eb; box-shadow: 0 2px 12px rgba(0,0,0,0.05); transition: transform 0.18s; display: flex; flex-direction: column; }
.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.card-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-weight: 700; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.country-badge { background: #eef2ff; color: #4f46e5; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.78rem; font-weight: 500; }
.tags-container { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.category-tag { background: #f0fdf4; color: #16a34a; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
.info-row { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.45rem; font-size: 0.88rem; color: #4b5563; }
.card-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; flex-wrap: wrap; margin-top: auto; }

.email-history { margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed #e5e7eb; display: flex; flex-direction: column; gap: 0.35rem; }
.reach-date { font-size: 0.82rem; color: #6b7280; }
.overdue { color: #e11d48; font-weight: 700; background-color: #fff1f2; padding: 0.25rem 0.5rem; border-radius: 6px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { background: white; border-radius: 20px; width: 90%; max-width: 640px; padding: 2rem; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-weight: 600; }
.btn-secondary { background: #eef2ff; color: #4f46e5; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.btn-log { background: #f3f4f6; color: #4b5563; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.btn-email { background: #f0fdf4; color: #16a34a; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
</style>