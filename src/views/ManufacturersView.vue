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

      <div class="sections-grid">
        <div class="mt-4">
          <label class="section-label">Legal Status</label>
          <div class="legal-flex">
            <label class="check-item"><input type="checkbox" v-model="form.nda_signed" /> NDA Signed</label>
            <label class="check-item"><input type="checkbox" v-model="form.mma_signed" /> MMA Signed</label>
          </div>
        </div>

        <div class="mt-4">
          <label class="section-label">Product Categories</label>
          <div class="categories-grid">
            <label v-for="cat in categoryOptions" :key="cat" class="cat-pill" :class="{active: selectedCategories.includes(cat)}">
              <input type="checkbox" :value="cat" v-model="selectedCategories" /> {{ cat }}
            </label>
          </div>
        </div>
      </div>

      <div class="mt-4">
        <label class="section-label">Certifications</label>
        <select v-model="selectedCertifications" multiple class="multi-select">
          <option v-for="cert in certOptions" :key="cert" :value="cert">{{ cert }}</option>
        </select>
        <p class="help-text">Hold Ctrl/Cmd to select multiple.</p>
      </div>

      <textarea v-model="form.notes" placeholder="Notes (Optional)" rows="3" class="mt-4"></textarea>
      
      <div class="form-actions mt-4">
        <button @click="saveManufacturer" class="btn-primary">
          {{ editing ? 'UPDATE MANUFACTURER' : 'SAVE MANUFACTURER' }}
        </button>
      </div>
    </div>

    <div class="filters">
      <input v-model="search" placeholder="🔍 Search manufacturers..." class="search-input" />
      <select v-model="filterCountry" class="filter-select">
        <option value="">All Countries</option>
        <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filterCategory" class="filter-select">
        <option value="">All Categories</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <button v-if="search || filterCountry || filterCategory" @click="clearFilters" class="btn-clear">✕ CLEAR</button>
      <span class="results-count">{{ filteredManufacturers.length }} results</span>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="filteredManufacturers.length === 0" class="empty">No manufacturers found.</div>
    <div v-else class="cards-grid">
      <div v-for="m in filteredManufacturers" :key="m.id" class="card">
        <div class="card-content">
          <div class="card-top">
            <div class="card-avatar">{{ m.company_name?.charAt(0) }}</div>
            <div class="card-title">
              <h3>{{ m.company_name }}</h3>
              <div class="badges-row">
                <span class="country-badge">🌍 {{ m.country || 'Unknown' }}</span>
                <span v-if="m.nda_signed" class="legal-badge nda">NDA</span>
                <span v-if="m.mma_signed" class="legal-badge mma">MMA</span>
              </div>
            </div>
          </div>
          
          <div class="card-body">
            <div class="info-group">
              <div class="info-row" v-if="m.contact_name"><span>👤</span><strong>{{ m.contact_name }}</strong></div>
              <div class="info-row" v-if="m.phone"><span>📞</span><a :href="'tel:'+m.phone">{{ m.phone }}</a></div>
              <div class="info-row" v-if="m.email"><span>✉️</span><a :href="'mailto:'+m.email">{{ m.email }}</a></div>
              <div class="info-row" v-if="m.website"><span>🌐</span><a :href="m.website" target="_blank">Website</a></div>
            </div>

            <div class="tags-container" v-if="m.product_categories">
              <span v-for="tag in m.product_categories.split(',')" :key="tag" class="category-tag">{{ tag.trim() }}</span>
            </div>

            <button v-if="m.certifications" @click="showCertsPopup(m)" class="btn-view-certs">
              📜 View {{ m.certifications.split(',').length }} Certifications
            </button>

            <div class="notes-box" v-if="m.notes"><span>📝</span> {{ m.notes }}</div>
            
            <div v-if="m.email_logs?.length" class="email-history">
              <div v-for="(log, i) in m.email_logs" :key="i" class="log-pill" :class="{ 'overdue': i === m.email_logs.length-1 && isOverdue(log.sentAt) }">
                <span>🕒</span> {{ log.templateName }}: {{ new Date(log.sentAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) }}
                <span v-if="i === m.email_logs.length - 1 && isOverdue(log.sentAt)" class="warn-icon">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card-footer">
          <button @click="editManufacturer(m)" class="btn-footer edit">✏️ EDIT</button>
          <button @click="logExternalContact(m)" class="btn-footer">📝 LOG</button>
          <button v-if="m.email" @click="openInitialReachModal(m)" class="btn-footer reach">🚀 REACH</button>
          <button v-if="m.email" @click="openEmailModal(m)" class="btn-footer email">✉️ EMAIL</button>
          <button @click="deleteManufacturer(m.id)" class="btn-footer del">🗑️ DELETE</button>
        </div>
      </div>
    </div>

    <div v-if="certPopup.show" class="modal-overlay" @click.self="certPopup.show = false">
      <div class="modal mini-modal">
        <div class="modal-header">
          <h2>Verified Certifications</h2>
          <button @click="certPopup.show = false" class="modal-close">✕</button>
        </div>
        <div class="cert-list">
          <div v-for="c in certPopup.list" :key="c" class="cert-item">✅ {{ c.trim() }}</div>
        </div>
      </div>
    </div>

    <div v-if="emailModal.show" class="modal-overlay" @click.self="emailModal.show = false">
      <div class="modal email-modal">
        <div class="modal-header">
          <h2>{{ emailModal.isInitialReach ? '🚀 Edit & Send Initial Reach' : '✉️ Send Custom Email' }}</h2>
          <button @click="emailModal.show = false" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-field">
            <label>To</label>
            <input v-model="emailModal.to" readonly />
          </div>
          <div class="modal-field" v-if="!emailModal.isInitialReach">
            <label>Template</label>
            <select v-model="emailModal.selectedTemplate" @change="applyTemplate">
              <option value="">-- Custom Email --</option>
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
          <div class="signature-notice">✨ Your official signature will be attached automatically.</div>
        </div>
        <div class="modal-actions">
          <button @click="emailModal.show = false" class="btn-secondary">CANCEL</button>
          <button @click="sendEmail" class="btn-primary" :disabled="emailModal.sending || !emailModal.subject">
            {{ emailModal.sending ? 'SENDING...' : '🚀 SEND EMAIL' }}
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

const EMAILJS_SERVICE_ID = 'service_vxy88pq'
const EMAILJS_TEMPLATE_ID = 'template_44apzvs'
const EMAILJS_PUBLIC_KEY = 'CFmOQW7RjLSBDwIOV'

const htmlSignature = `<br><br><table cellpadding="0" cellspacing="0" style="border-collapse: collapse; line-height: 1.15; width: 100%; border-top: 1px solid #BDBDBD; padding-top: 10px;"><tbody><tr><td style="padding: 10px;"><img src="https://permanent-assets-download.flockmail.com/signature/2408373/2024-06-03_36c3cd811224bc3a55b5_55761" width="80"></td><td><p style="margin:0;"><strong>Luis Domínguez</strong></p><p style="margin:0;color:#666;">Product Operations Manager</p><p style="margin:0;color:#666;">+57 350 201 4528 | <a href="https://www.siinge.studio/">www.siinge.studio</a></p></td></tr></tbody></table>`

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

const form = ref({ company_name: '', country: '', contact_name: '', phone: '', email: '', website: '', notes: '', nda_signed: false, mma_signed: false })

const emailModal = ref({ show: false, to: '', subject: '', body: '', sending: false, manufacturerId: null, companyName: '', selectedTemplate: '', isInitialReach: false })

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

function openAddForm() {
  resetForm()
  showForm.value = !showForm.value
}

function clearFilters() {
  search.value = ''
  filterCountry.value = ''
  filterCategory.value = ''
}

function resetForm() {
  form.value = { company_name: '', country: '', contact_name: '', phone: '', email: '', website: '', notes: '', nda_signed: false, mma_signed: false }
  selectedCategories.value = []
  selectedCertifications.value = []
  editing.value = false
  editId.value = null
  showForm.value = false
}

async function saveManufacturer() {
  if (!form.value.company_name) return alert('Company Name is required')
  const payload = { 
    ...form.value, 
    product_categories: selectedCategories.value.join(', '), 
    certifications: selectedCertifications.value.join(', ') 
  }
  
  if (editing.value) {
    await supabase.from('manufacturers').update(payload).eq('id', editId.value)
  } else {
    await supabase.from('manufacturers').insert([payload])
  }
  resetForm()
  fetchManufacturers()
}

function editManufacturer(m) {
  form.value = { ...m }
  selectedCategories.value = m.product_categories ? m.product_categories.split(',').map(s => s.trim()) : []
  selectedCertifications.value = m.certifications ? m.certifications.split(',').map(s => s.trim()) : []
  editId.value = m.id
  editing.value = true
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openInitialReachModal(m) {
  const categoryText = m.product_categories || 'various apparel categories'
  const subject = 'Manufacturing Partnership Inquiry | SIINGE STUDIO'
  const body = `Hi ${m.company_name},\n\nMy name is Luis and I manage Product Operations at SIINGE STUDIO...\n\nBefore moving into deeper alignment, could you share MOQs and lead times for ${categoryText}?`
  
  emailModal.value = { show: true, to: m.email, subject, body, manufacturerId: m.id, companyName: m.company_name, isInitialReach: true }
}

function openEmailModal(m) {
  emailModal.value = { show: true, to: m.email, subject: '', body: '', manufacturerId: m.id, companyName: m.company_name, isInitialReach: false }
}

function applyTemplate() {
  const t = emailModal.value.selectedTemplate
  if (t) {
    emailModal.value.subject = t.subject.replace(/{{company_name}}/g, emailModal.value.companyName)
    emailModal.value.body = t.body.replace(/{{company_name}}/g, emailModal.value.companyName)
  }
}

async function sendEmail() {
  emailModal.value.sending = true
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: emailModal.value.to,
      subject: emailModal.value.subject,
      message: emailModal.value.body,
      signature: htmlSignature
    }, EMAILJS_PUBLIC_KEY)
    
    const log = { 
      templateName: emailModal.value.isInitialReach ? 'Initial Reach' : 'Custom Email', 
      sentAt: new Date().toISOString() 
    }
    const m = manufacturers.value.find(man => man.id === emailModal.value.manufacturerId)
    await supabase.from('manufacturers').update({ 
      initial_reach_sent: true, 
      email_logs: [...(m.email_logs || []), log],
      last_email_sent_at: log.sentAt
    }).eq('id', m.id)
    
    fetchManufacturers()
    emailModal.value.show = false
  } catch (e) {
    alert('Error sending email')
    console.error(e)
  } finally {
    emailModal.value.sending = false
  }
}

async function logExternalContact(m) {
  const note = prompt('Enter a log note:');
  if (!note) return
  const log = { templateName: note, sentAt: new Date().toISOString() }
  await supabase.from('manufacturers').update({ email_logs: [...(m.email_logs || []), log] }).eq('id', m.id)
  fetchManufacturers()
}

async function deleteManufacturer(id) {
  if (confirm('Delete this manufacturer?')) {
    await supabase.from('manufacturers').delete().eq('id', id)
    fetchManufacturers()
  }
}

function showCertsPopup(m) {
  certPopup.value = { show: true, list: m.certifications.split(',') }
}

const isOverdue = (d) => Math.floor((new Date() - new Date(d)) / 86400000) >= 7

onMounted(() => { fetchManufacturers(); fetchTemplates() })
</script>

<style scoped>
.container { max-width: 1300px; margin: 0 auto; padding: 2rem; color: var(--text-body); }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { color: var(--text-main); font-size: 2rem; font-weight: 800; margin: 0; }

.form-card, .card, .modal { background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 16px; padding: 2rem; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
input, textarea, select { background: var(--bg-app); border: 1px solid var(--border-main); color: var(--text-main); padding: 0.75rem 1rem; border-radius: 10px; width: 100%; font-family: inherit; }
input:focus, textarea:focus { outline: none; border-color: var(--primary); }

.section-label { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 0.75rem; }
.legal-flex { display: flex; gap: 2rem; }
.check-item { font-size: 0.9rem; font-weight: 600; cursor: pointer; color: var(--text-main); }

.categories-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.cat-pill { padding: 0.5rem 1rem; background: var(--bg-app); border-radius: 30px; font-size: 0.85rem; cursor: pointer; border: 1px solid var(--border-main); transition: 0.2s; }
.cat-pill.active { border-color: var(--primary); background: rgba(79, 70, 229, 0.1); color: var(--primary); font-weight: 700; }
.cat-pill input { display: none; }

.multi-select { height: 120px; }
.help-text { font-size: 0.7rem; color: var(--text-muted); margin-top: 0.3rem; }

.filters { display: flex; gap: 1rem; margin-bottom: 2rem; background: var(--bg-card); padding: 1.2rem; border-radius: 16px; border: 1px solid var(--border-main); align-items: center; flex-wrap: wrap; }
.search-input { flex: 2; min-width: 250px; }
.results-count { color: var(--text-muted); font-size: 0.85rem; margin-left: auto; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem; }
.card { display: flex; flex-direction: column; padding: 0; overflow: hidden; transition: 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.card:hover { border-color: var(--primary); transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.2); }
.card-content { padding: 1.5rem; flex: 1; }

.card-top { display: flex; gap: 1.2rem; border-bottom: 1px solid var(--border-light); padding-bottom: 1.2rem; margin-bottom: 1.2rem; }
.card-avatar { width: 55px; height: 55px; background: linear-gradient(135deg, var(--primary), #ec4899); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: white; font-size: 1.5rem; }
.card-title h3 { color: var(--text-main); font-size: 1.2rem; margin: 0; }
.badges-row { display: flex; gap: 0.4rem; margin-top: 0.4rem; }
.country-badge { font-size: 0.75rem; font-weight: 600; background: var(--bg-app); padding: 0.2rem 0.6rem; border-radius: 10px; color: var(--text-body); }
.legal-badge { font-size: 0.65rem; padding: 0.15rem 0.5rem; border-radius: 5px; color: white; font-weight: 800; }
.nda { background: #8b5cf6; } .mma { background: #ec4899; }

.info-group { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.2rem; }
.info-row { font-size: 0.9rem; display: flex; gap: 0.7rem; align-items: center; }
.info-row a { color: var(--primary); text-decoration: none; font-weight: 600; }

.tags-container { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 1rem 0; }
.category-tag { background: rgba(79, 70, 229, 0.1); color: var(--primary); font-size: 0.75rem; padding: 0.3rem 0.7rem; border-radius: 6px; font-weight: 700; border: 1px solid rgba(79, 70, 229, 0.2); }

.btn-view-certs { background: var(--bg-app); color: #0ea5e9; border: 1px solid #0ea5e9; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; width: 100%; margin-bottom: 1rem; }

.notes-box { background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 10px; font-size: 0.85rem; font-style: italic; color: var(--text-body); border-left: 4px solid var(--border-main); }

.email-history { margin-top: 1.2rem; border-top: 1px dashed var(--border-main); padding-top: 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; }
.log-pill { font-size: 0.8rem; background: var(--bg-app); padding: 0.5rem 0.8rem; border-radius: 8px; color: var(--text-muted); display: flex; align-items: center; justify-content: space-between; }
.overdue { background: var(--danger-bg); color: var(--danger-text); border: 1px solid rgba(225,29,72,0.3); font-weight: 700; }

.card-footer { background: var(--bg-app); padding: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; border-top: 1px solid var(--border-main); }
.btn-footer { padding: 0.6rem 0.8rem; border-radius: 8px; font-size: 0.7rem; font-weight: 800; cursor: pointer; background: var(--bg-card); color: var(--text-body); border: 1px solid var(--border-main); flex: 1; min-width: 80px; }
.btn-footer.edit { color: var(--primary); border-color: var(--primary); }
.btn-footer.reach { background: var(--primary); color: white; border: none; }
.btn-footer.email { color: var(--success-text); border-color: var(--success-text); }
.btn-footer.del { color: var(--danger-text); border-color: var(--danger-text); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(5px); }
.modal { width: 90%; max-width: 650px; position: relative; }
.mini-modal { max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-light); }
.modal-close { background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer; }
.modal-field { margin-bottom: 1rem; }
.modal-field label { display: block; font-size: 0.8rem; font-weight: 700; margin-bottom: 0.4rem; color: var(--text-muted); }
.signature-notice { background: rgba(234, 179, 8, 0.1); color: var(--warning-text); padding: 0.8rem; border-radius: 8px; font-size: 0.8rem; margin-top: 1rem; border: 1px dashed var(--warning-text); }

.cert-item { padding: 0.7rem; background: var(--bg-app); border-radius: 8px; margin-bottom: 0.5rem; color: var(--text-main); font-weight: 600; }
</style>