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

      <div class="categories-section mt-4">
        <label class="section-label">Product Categories</label>
        <div class="categories-grid">
          <label v-for="cat in categoryOptions" :key="cat" class="category-checkbox">
            <input type="checkbox" :value="cat" v-model="selectedCategories" />
            <span>{{ cat }}</span>
          </label>
        </div>
      </div>

      <div class="categories-section mt-4">
        <label class="section-label">Certifications</label>
        <select v-model="selectedCertifications" multiple class="multi-select-custom">
          <option v-for="cert in certOptions" :key="cert" :value="cert">{{ cert }}</option>
        </select>
        <p class="text-xs text-gray-400 mt-1">Hold Ctrl (Cmd) to select multiple.</p>
      </div>

      <textarea v-model="form.notes" placeholder="Notes" rows="3" class="mt-4"></textarea>
      <div class="form-actions">
        <button @click="saveManufacturer" class="btn-primary">{{ editing ? 'Update' : 'Save' }}</button>
      </div>
    </div>

    <div class="filters">
      <input v-model="search" placeholder="🔍 Search..." class="search-input" />
      <select v-model="filterCountry">
        <option value="">All Countries</option>
        <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filterCategory">
        <option value="">All Categories</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <button v-if="search || filterCountry || filterCategory" @click="clearFilters" class="btn-clear">✕ Clear</button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
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
          <div class="info-row" v-if="m.product_categories">
            <span class="info-icon">🏷️</span>
            <div class="tags-container">
              <span v-for="tag in m.product_categories.split(',')" :key="tag" class="category-tag">{{ tag.trim() }}</span>
            </div>
          </div>

          <div class="info-row" v-if="m.certifications">
            <span class="info-icon">📜</span>
            <button @click="showCertsPopup(m)" class="btn-view-certs">
              View Certifications ({{ m.certifications.split(',').length }})
            </button>
          </div>

          <div class="info-row" v-if="m.email">✉️ {{ m.email }}</div>
          <div class="info-row notes-row" v-if="m.notes">📝 {{ m.notes }}</div>
        </div>

        <div class="card-actions">
          <button @click="editManufacturer(m)" class="btn-secondary">Edit</button>
          <button @click="logExternalContact(m)" class="btn-log">Log Contact</button>
          <button v-if="m.email" @click="openEmailModal(m)" class="btn-email">Email</button>
          <button @click="deleteManufacturer(m.id)" class="btn-danger">Delete</button>
        </div>
      </div>
    </div>

    <div v-if="certPopup.show" class="modal-overlay" @click.self="certPopup.show = false">
      <div class="modal max-w-400">
        <div class="modal-header">
          <h2>Verified Certifications</h2>
          <button @click="certPopup.show = false" class="modal-close">✕</button>
        </div>
        <div class="cert-list-popup">
          <div v-for="c in certPopup.list" :key="c" class="cert-item">
            ✅ {{ c.trim() }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="emailModal.show" class="modal-overlay" @click.self="emailModal.show = false">
      <div class="modal">
        <div class="modal-header">
          <h2>✉️ Send Email to {{ emailModal.companyName }}</h2>
          <button @click="emailModal.show = false" class="modal-close">✕</button>
        </div>
        <div class="modal-field"><label>To</label><input v-model="emailModal.to" /></div>
        <div class="modal-field">
          <label>Select Template</label>
          <select v-model="emailModal.selectedTemplate" @change="applyTemplate">
            <option value="">-- Choose a template --</option>
            <option v-for="t in templatesList" :key="t.id" :value="t">{{ t.name }}</option>
          </select>
        </div>
        <div class="modal-field"><label>Subject</label><input v-model="emailModal.subject" /></div>
        <div class="modal-field"><label>Message</label><textarea v-model="emailModal.body" rows="12"></textarea></div>
        <div class="modal-actions">
          <button @click="emailModal.show = false" class="btn-secondary">Cancel</button>
          <button @click="sendEmail" class="btn-email-send" :disabled="emailModal.sending || (!emailModal.subject || !emailModal.body)">
            {{ emailModal.sending ? 'Sending...' : '🚀 Send Email' }}
          </button>
        </div>
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

const categoryOptions = ['Activewear', "Children's wear", 'Swimwear', 'Evening wear', 'Streetwear', 'Launchwear', 'Intimate Apparel', 'Leather Good', 'Accessories']
const certOptions = ['OEKO-TEX STANDARD 100', 'ISO 45001', 'OCS100', 'UN Global Compact', 'GRS', 'ISO9001', 'amfori BSCI', 'SMETA', 'WRAP', 'SA8000', 'ISO 14001', 'OEKO-TEX STeP', 'bluesign®', 'GOTS']

const selectedCategories = ref([])
const selectedCertifications = ref([])
const certPopup = ref({ show: false, list: [] })

const form = ref({ company_name: '', country: '', contact_name: '', phone: '', email: '', website: '', product_categories: '', certifications: '', notes: '' })
const emailModal = ref({ show: false, to: '', subject: '', body: '', sending: false, success: false, error: '', manufacturerId: null, companyName: '', selectedTemplate: '' })

const countries = computed(() => [...new Set(manufacturers.value.map(m => m.country).filter(Boolean))].sort())
const categories = computed(() => {
  const all = manufacturers.value.flatMap(m => m.product_categories ? m.product_categories.split(',').map(c => c.trim()) : [])
  return [...new Set(all)].filter(Boolean).sort()
})

const filteredManufacturers = computed(() => {
  return manufacturers.value.filter(m => {
    const s = search.value.toLowerCase()
    const matchSearch = !s || m.company_name?.toLowerCase().includes(s) || m.country?.toLowerCase().includes(s) || m.product_categories?.toLowerCase().includes(s)
    const matchCountry = !filterCountry.value || m.country === filterCountry.value
    const matchCategory = !filterCategory.value || m.product_categories?.toLowerCase().includes(filterCategory.value.toLowerCase())
    return matchSearch && matchCountry && matchCategory
  })
})

function showCertsPopup(m) {
  certPopup.value.list = m.certifications.split(',')
  certPopup.value.show = true
}

async function saveManufacturer() {
  if (!form.value.company_name) return alert('Name required')
  form.value.product_categories = selectedCategories.value.join(', ')
  form.value.certifications = selectedCertifications.value.join(', ')
  
  if (editing.value) await supabase.from('manufacturers').update(form.value).eq('id', editId.value)
  else await supabase.from('manufacturers').insert([form.value])
  resetForm(); fetchManufacturers()
}

function editManufacturer(m) {
  form.value = { ...m }
  selectedCategories.value = m.product_categories ? m.product_categories.split(',').map(s => s.trim()) : []
  selectedCertifications.value = m.certifications ? m.certifications.split(',').map(s => s.trim()) : []
  editId.value = m.id; editing.value = true; showForm.value = true
}

function resetForm() {
  form.value = { company_name: '', country: '', contact_name: '', phone: '', email: '', website: '', product_categories: '', certifications: '', notes: '' }
  selectedCategories.value = []; selectedCertifications.value = []; editing.value = false; editId.value = null; showForm.value = false
}

// ... Mantener fetchManufacturers, deleteManufacturer, logExternalContact, sendEmail, etc. igual que antes ...
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

function openAddForm() { resetForm(); showForm.value = !showForm.value }
function clearFilters() { search.value = ''; filterCountry.value = ''; filterCategory.value = '' }

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
  const note = prompt(`Log manual contact for ${m.company_name}:`, '')
  if (!note) return
  const sentAt = new Date().toISOString()
  const updatedLogs = [...(m.email_logs || []), { templateName: note.trim(), sentAt }]
  await supabase.from('manufacturers').update({ email_logs: updatedLogs, last_email_sent_at: sentAt }).eq('id', m.id)
  fetchManufacturers()
}

async function sendEmail() {
  emailModal.value.sending = true
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, { to_email: emailModal.value.to, subject: emailModal.value.subject, message: emailModal.value.body }, EMAILJS_PUBLIC_KEY)
    const sentAt = new Date().toISOString()
    const m = manufacturers.value.find(man => man.id === emailModal.value.manufacturerId)
    const updatedLogs = [...(m.email_logs || []), { templateName: emailModal.value.selectedTemplate?.name || 'Custom Email', sentAt }]
    await supabase.from('manufacturers').update({ initial_reach_sent: true, initial_reach_sent_at: sentAt, email_logs: updatedLogs, last_email_sent_at: sentAt }).eq('id', m.id)
    fetchManufacturers()
    emailModal.value.success = true
    setTimeout(() => { emailModal.value.show = false }, 1500)
  } catch (err) { emailModal.value.error = 'Error.' } finally { emailModal.value.sending = false }
}

async function deleteManufacturer(id) {
  if (confirm('Delete?')) { await supabase.from('manufacturers').delete().eq('id', id); fetchManufacturers() }
}

function isOverdue(dateString) {
  if (!dateString) return false
  return Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24)) >= 7
}

onMounted(() => { fetchManufacturers(); fetchTemplates() })
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.form-card { background: white; padding: 2rem; border-radius: 16px; border: 1.5px solid #e5e7eb; margin-bottom: 2rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

.section-label { display: block; font-size: 0.8rem; font-weight: 800; color: #6b7280; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
.categories-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.category-checkbox { display: flex; align-items: center; gap: 0.5rem; background: #f3f4f6; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.category-checkbox:has(input:checked) { background: #eef2ff; border-color: #4f46e5; color: #4f46e5; }

/* SELECTOR MÚLTIPLE PERSONALIZADO */
.multi-select-custom { height: 120px; border-radius: 12px; padding: 0.5rem; }

.btn-view-certs { background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5; padding: 0.3rem 0.7rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
.cert-list-popup { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.5rem 0; }
.cert-item { font-size: 0.95rem; color: #1f2937; font-weight: 500; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
.card { background: white; border-radius: 16px; padding: 1.5rem; border: 1.5px solid #e5e7eb; display: flex; flex-direction: column; }
.card-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.category-tag { background: #f0fdf4; color: #16a34a; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; margin-right: 0.3rem; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; }
.modal { background: white; border-radius: 20px; width: 90%; max-width: 600px; padding: 2rem; max-height: 90vh; overflow-y: auto; }
.max-w-400 { max-width: 400px; }

input, textarea, select { width: 100%; padding: 0.7rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.9rem; }
.btn-primary { background: #4f46e5; color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-weight: 600; }
.btn-secondary { background: #f3f4f6; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
</style>