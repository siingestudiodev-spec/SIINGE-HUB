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
        <div class="input-group"><input v-model="form.company_name" placeholder="Company Name *" /></div>
        <div class="input-group"><input v-model="form.country" placeholder="Country" /></div>
        <div class="input-group"><input v-model="form.contact_name" placeholder="Contact Name" /></div>
        <div class="input-group"><input v-model="form.phone" placeholder="Phone" /></div>
        <div class="input-group"><input v-model="form.email" placeholder="Email" /></div>
        <div class="input-group"><input v-model="form.website" placeholder="Website" /></div>
      </div>

      <div class="categories-section mt-4">
        <label class="section-label">Legal Status</label>
        <div class="legal-grid">
          <label class="legal-checkbox-item">
            <input type="checkbox" v-model="form.nda_signed" />
            <span>NDA Signed</span>
          </label>
          <label class="legal-checkbox-item">
            <input type="checkbox" v-model="form.mma_signed" />
            <span>MMA Signed</span>
          </label>
        </div>
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
        <p class="text-xs text-gray-400 mt-1">Hold Ctrl (or Cmd on Mac) to select multiple.</p>
      </div>

      <textarea v-model="form.notes" placeholder="Notes (Optional)" rows="3" class="mt-4"></textarea>
      
      <div class="form-actions mt-4">
        <button @click="saveManufacturer" class="btn-primary">
          {{ editing ? 'UPDATE MANUFACTURER' : 'SAVE MANUFACTURER' }}
        </button>
        <button @click="resetForm" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <div class="filters">
      <input v-model="search" placeholder="🔍 Search..." class="search-input" />
      <select v-model="filterCountry" class="filter-select">
        <option value="">All Countries</option>
        <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filterCategory" class="filter-select">
        <option value="">All Categories</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <button v-if="search || filterCountry || filterCategory" @click="clearFilters" class="btn-clear">
        ✕ CLEAR
      </button>
      <span class="results-count">{{ filteredManufacturers.length }} result{{ filteredManufacturers.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="filteredManufacturers.length === 0" class="empty">No manufacturers found.</div>
    
    <div v-else class="list-container">
      
      <div v-for="m in filteredManufacturers" :key="m.id" class="horizontal-card">
        
        <div class="card-identity">
          <div class="card-avatar">{{ m.company_name?.charAt(0) }}</div>
          <div class="card-title-block">
            <h3>{{ m.company_name }}</h3>
            <div class="badges-row">
              <span class="country-badge">🌍 {{ m.country || 'Unknown' }}</span>
              <span v-if="m.nda_signed" class="legal-badge nda">NDA</span>
              <span v-if="m.mma_signed" class="legal-badge mma">MMA</span>
            </div>
          </div>
        </div>
          
        <div class="card-info-block">
          <div class="contact-info">
            <div class="info-row" v-if="m.contact_name">
              <span class="info-icon">👤</span><strong>{{ m.contact_name }}</strong>
            </div>
            <div class="info-row" v-if="m.phone">
              <span class="info-icon">📞</span><a :href="'tel:'+m.phone">{{ m.phone }}</a>
            </div>
            <div class="info-row" v-if="m.email">
              <span class="info-icon">✉️</span><a :href="'mailto:'+m.email">{{ m.email }}</a>
            </div>
            <div class="info-row" v-if="m.website">
              <span class="info-icon">🌐</span><a :href="m.website" target="_blank">Website</a>
            </div>
          </div>

          <div class="tags-section">
            <div class="info-row align-start" v-if="m.product_categories">
              <span class="info-icon mt-1">🏷️</span>
              <div class="tags-container">
                <span v-for="tag in m.product_categories.split(',')" :key="tag" class="category-tag">
                  {{ tag.trim() }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="card-details-block">
          <div class="info-row" v-if="m.certifications">
            <span class="info-icon">📜</span>
            <button @click="showCertsPopup(m)" class="btn-view-certs">
              View {{ m.certifications.split(',').length }} Certs
            </button>
          </div>
          
          <div class="info-row notes-row" v-if="m.notes" @click="showNotesPopup(m.notes)" style="cursor: pointer;">
            <span class="info-icon">📝</span>
            <span class="truncate-text" :title="m.notes">{{ m.notes }}</span>
          </div>
            
          <div v-if="m.email_logs && m.email_logs.length > 0" class="email-history">
            <div v-for="(log, index) in m.email_logs.slice(-1)" :key="index" 
                 class="reach-date"
                 :class="{ 'overdue': isOverdue(log.sentAt) }">
              <span class="log-icon">🕒</span> {{ log.templateName }}: {{ new Date(log.sentAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) }}
              <span v-if="isOverdue(log.sentAt)" class="warning-icon" title="More than 7 days ago">⚠️</span>
            </div>
          </div>
        </div>

        <div class="card-actions-vertical">
          <div class="action-top-row">
            <button @click="editManufacturer(m)" class="btn-action-icon btn-edit" title="Edit">✏️</button>
            <button @click="logExternalContact(m)" class="btn-action-icon btn-log" title="Log Contact">📝</button>
            <button @click="deleteManufacturer(m.id)" class="btn-action-icon btn-delete" title="Delete">🗑️</button>
          </div>
          <button v-if="m.email" @click="openInitialReachModal(m)" class="btn-action-full btn-initial-reach">🚀 REACH</button>
          <button v-if="m.email" @click="openEmailModal(m)" class="btn-action-full btn-email">✉️ EMAIL</button>
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
            <span class="check-icon">✅</span> {{ c.trim() }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="notesPopup.show" class="modal-overlay" @click.self="notesPopup.show = false">
      <div class="modal max-w-500">
        <div class="modal-header">
          <h2>📝 Notes</h2>
          <button @click="notesPopup.show = false" class="modal-close">✕</button>
        </div>
        <div class="modal-body" style="padding: 20px; max-height: 400px; overflow-y: auto;">
          <p style="white-space: pre-wrap; line-height: 1.6; color: var(--text-main);">{{ notesPopup.text }}</p>
        </div>
      </div>
    </div>

    <div v-if="emailModal.show" class="modal-overlay" @click.self="emailModal.show = false">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ emailModal.isInitialReach ? '🚀 Edit & Send Initial Reach' : '✉️ Send Custom Email' }} to {{ emailModal.companyName }}</h2>
          <button @click="emailModal.show = false" class="modal-close">✕</button>
        </div>
        <div class="modal-field">
          <label>To</label>
          <input v-model="emailModal.to" />
        </div>
        
        <div class="modal-field" v-if="!emailModal.isInitialReach">
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
          <div class="signature-notice mt-2">
            ✨ Your SIINGE STUDIO signature will be automatically attached at the bottom.
          </div>
        </div>
        
        <div class="modal-actions mt-4">
          <button @click="emailModal.show = false" class="btn-secondary">CANCEL</button>
          <button @click="sendEmail" class="btn-primary" :disabled="emailModal.sending || (!emailModal.subject || !emailModal.body)">
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

const EMAILJS_SERVICE_ID  = 'service_vxy88pq'
const EMAILJS_TEMPLATE_ID = 'template_44apzvs'
const EMAILJS_PUBLIC_KEY  = 'CFmOQW7RjLSBDwIOV'

// ---- CÓDIGO HTML DE TU FIRMA INTACTO Y FORMATEADO ----
const htmlSignature = `<br><br>
<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; line-height: 1.15; width: 100%;" id="isPasted" width="100%">
  <tbody valign="middle">
    <tr valign="inherit">
      <td style="vertical-align:middle;padding:.01px 12px 0.01px 1px;width:92px;text-align:center;" valign="middle" align="center">
        <img border="0" src="https://permanent-assets-download.flockmail.com/signature/2408373/2024-06-03_36c3cd811224bc3a55b5_55761" width="92" alt="photo" style="width: 78px; vertical-align: middle; border-radius: 0px; height: 83px; border: 0px; display: block;">
      </td>
      <td valign="top" style="padding:.01px 0.01px 0.01px 12px;vertical-align:top;border-left:solid 1px #BDBDBD;"><strong><strong><br></strong></strong>
        <table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;" width="100%">
          <tbody valign="middle">
            <tr valign="inherit">
              <td style="padding:.01px;" valign="inherit">
                <p style="margin:.1px;line-height:108.0%;font-size:16px;">
                  <span style="font-size: 12pt;"><strong><strong>Luis Domínguez</strong><br style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400;"></strong></span>
                  <span style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 11pt; font-weight: 400; display: inline !important;"><strong>Product Operations Manager</strong></span>
                </p>
                <p style="margin:.1px;line-height:108.0%;font-size:16px;">
                  <span style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 11pt; font-weight: 400; display: inline !important;"><strong>​</strong></span><br style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400;">
                  <span style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400; display: inline !important;">+57 350 201 4528 &nbsp; | &nbsp;&nbsp;</span>
                  <a href="https://www.siinge.studio/" style="color: rgb(76, 140, 246); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400;" target="_blank">www.siinge.studio</a><br style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400;">
                  <a href="mailto:production@siinge.studio" style="color: rgb(76, 140, 246); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400;" target="_blank">production@siinge.studio</a>
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
<table cellpadding="0" cellspacing="0" width="100%" style="width:100%;color:gray;border-top:1px solid gray;line-height:normal;margin-top:10px;">
  <tbody valign="middle">
    <tr valign="inherit">
      <td style="padding:9px 8px 0 0;" valign="inherit">
        <p style="color:#888888;text-align:left;font-size:10px;margin:1px;line-height:120%;font-family:Arial ;">IMPORTANT: The contents of this email and any attachments are confidential. They are intended for the named recipient(s) only. If you have received this email by mistake, please notify the sender immediately and do not disclose the contents to anyone or make copies thereof.</p>
      </td>
    </tr>
  </tbody>
</table>`

const manufacturers = ref([])
const templatesList = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(false)
const editId = ref(null)
const search = ref('')
const filterCountry = ref('')
const filterCategory = ref('')

const categoryOptions = [
  'Activewear', "Children's wear", 'Swimwear', 'Evening wear', 
  'Streetwear', 'Launchwear', 'Intimate Apparel', 'Leather Good', 'Accessories'
]
const certOptions = [
  'OEKO-TEX STANDARD 100', 'ISO 45001', 'OCS100', 'UN Global Compact', 
  'GRS', 'ISO9001', 'amfori BSCI', 'SMETA', 'WRAP', 'SA8000', 'ISO 14001', 
  'OEKO-TEX STeP', 'bluesign®', 'GOTS'
]

const selectedCategories = ref([])
const selectedCertifications = ref([])
const certPopup = ref({ show: false, list: [] })
const notesPopup = ref({ show: false, text: '' })

const form = ref({ 
  company_name: '', country: '', contact_name: '', phone: '', 
  email: '', website: '', product_categories: '', certifications: '', notes: '',
  nda_signed: false, mma_signed: false
})

const emailModal = ref({ 
  show: false, to: '', subject: '', body: '', sending: false, success: false, 
  error: '', manufacturerId: null, companyName: '', selectedTemplate: '', isInitialReach: false  
})

const countries = computed(() => {
  return [...new Set(manufacturers.value.map(m => m.country).filter(Boolean))].sort()
})

const categories = computed(() => {
  const all = manufacturers.value.flatMap(m => m.product_categories ? m.product_categories.split(',').map(c => c.trim()) : [])
  return [...new Set(all)].filter(Boolean).sort()
})

const filteredManufacturers = computed(() => {
  return manufacturers.value.filter(m => {
    const s = search.value.toLowerCase()
    const matchSearch = !s || 
      m.company_name?.toLowerCase().includes(s) || 
      m.country?.toLowerCase().includes(s) || 
      m.product_categories?.toLowerCase().includes(s)
    const matchCountry = !filterCountry.value || m.country === filterCountry.value
    const matchCategory = !filterCategory.value || m.product_categories?.toLowerCase().includes(filterCategory.value.toLowerCase())
    return matchSearch && matchCountry && matchCategory
  })
})

function showCertsPopup(m) { 
  certPopup.value.list = m.certifications.split(',')
  certPopup.value.show = true 
}

function showNotesPopup(notes) {
  notesPopup.value.text = notes
  notesPopup.value.show = true
}

async function saveManufacturer() {
  if (!form.value.company_name) return alert('Name required')
  form.value.product_categories = selectedCategories.value.join(', ')
  form.value.certifications = selectedCertifications.value.join(', ')
  
  if (editing.value) {
    await supabase.from('manufacturers').update(form.value).eq('id', editId.value)
  } else {
    await supabase.from('manufacturers').insert([form.value])
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

function resetForm() {
  form.value = { 
    company_name: '', country: '', contact_name: '', phone: '', 
    email: '', website: '', product_categories: '', certifications: '', notes: '',
    nda_signed: false, mma_signed: false
  }
  selectedCategories.value = []
  selectedCertifications.value = []
  editing.value = false
  editId.value = null
  showForm.value = false
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

function openAddForm() {
  if (showForm.value) {
    resetForm()
    return
  }
  resetForm()
  showForm.value = true
}

function clearFilters() { 
  search.value = ''
  filterCountry.value = ''
  filterCategory.value = '' 
}

function openEmailModal(m) { 
  emailModal.value = { 
    show: true, to: m.email, subject: '', body: '', sending: false, 
    success: false, error: '', manufacturerId: m.id, companyName: m.company_name, 
    selectedTemplate: '', isInitialReach: false 
  } 
}

function openInitialReachModal(m) {
  const categoryText = m.product_categories ? m.product_categories : 'various apparel categories'
  const subject = 'Manufacturing Partnership Inquiry | SIINGE STUDIO'
  
  const body = `Hi ${m.company_name},

My name is Luis and I manage Product Operations at SIINGE STUDIO, a US-based apparel development and production partner supporting brands across ${categoryText}.

We currently oversee multiple development programs simultaneously and are selectively expanding our manufacturing network to support upcoming production cycles. Your facility came to our attention as a potential long-term partner.

Before moving into deeper alignment, could you share a brief overview of:

• Primary product categories and technical strengths
• Typical program size or MOQ range
• Whether you support material sourcing or operate CMT
• Approximate sample lead times

At SIINGE, we operate within a structured partnership framework designed to maintain clarity across development timelines, communication workflows, and ethical manufacturing standards, with an emphasis on responsible sourcing and sustainable design methods where applicable. 

Once alignment is confirmed, our onboarding process includes a mutual NDA and Manufacturing Master Agreement to standardize expectations across projects.

If there appears to be mutual fit, we would be glad to continue over email or schedule a short introductory call to learn more about your current capabilities and production focus.`

  emailModal.value = { 
    show: true, 
    to: m.email, 
    subject: subject, 
    body: body, 
    sending: false, 
    success: false, 
    error: '', 
    manufacturerId: m.id, 
    companyName: m.company_name, 
    selectedTemplate: '',
    isInitialReach: true 
  }
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
    await emailjs.send(
      EMAILJS_SERVICE_ID, 
      EMAILJS_TEMPLATE_ID, 
      { 
        to_email: emailModal.value.to, 
        subject: emailModal.value.subject, 
        message: emailModal.value.body,
        signature: htmlSignature
      }, 
      EMAILJS_PUBLIC_KEY
    )
    
    const sentAt = new Date().toISOString()
    const templateName = emailModal.value.isInitialReach ? 'Initial Reach' : (emailModal.value.selectedTemplate?.name || 'Custom Email')
    
    const m = manufacturers.value.find(man => man.id === emailModal.value.manufacturerId)
    const updatedLogs = [...(m.email_logs || []), { templateName: templateName, sentAt }]
    
    await supabase.from('manufacturers').update({ 
      initial_reach_sent: true, 
      initial_reach_sent_at: sentAt, 
      email_logs: updatedLogs, 
      last_email_sent_at: sentAt 
    }).eq('id', m.id)
    
    fetchManufacturers()
    emailModal.value.show = false
  } catch (err) { 
    alert('Error sending email. Check console.') 
    console.error(err)
  } finally { 
    emailModal.value.sending = false 
  }
}

async function deleteManufacturer(id) {
  if (confirm('Are you sure you want to delete this manufacturer?')) { 
    await supabase.from('manufacturers').delete().eq('id', id)
    fetchManufacturers() 
  }
}

function isOverdue(dateString) {
  if (!dateString) return false
  return Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24)) >= 7
}

onMounted(() => { 
  fetchManufacturers()
  fetchTemplates() 
})
</script>

<style scoped>
/* GENERAL LAYOUT */
.container { 
  max-width: 1400px; /* Aumentado un poco para dar espacio a la lista horizontal */
  margin: 0 auto; 
  padding: 2rem 1.5rem; 
  font-family: 'Inter', sans-serif; 
  color: var(--text-body); 
}
.header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 2rem; 
}
h1 { 
  font-size: 2rem; 
  font-weight: 800; 
  color: var(--text-main); 
}

/* FORM & INPUTS */
.form-card { 
  background: var(--bg-card); 
  padding: 2rem; 
  border-radius: 16px; 
  border: 1px solid var(--border-main); 
  box-shadow: 0 10px 25px rgba(0,0,0,0.2); 
  margin-bottom: 2.5rem; 
}
.form-card h2 { 
  margin-top: 0; 
  margin-bottom: 1.5rem; 
  font-size: 1.25rem; 
  color: var(--text-main);
}
.form-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
  gap: 1rem; 
}
input, textarea, select { 
  width: 100%; 
  padding: 0.7rem 1rem; 
  border: 1px solid var(--border-main); 
  border-radius: 10px; 
  font-size: 0.95rem; 
  background: var(--bg-app); 
  color: var(--text-main);
  transition: all 0.2s; 
  box-sizing: border-box; 
}
input:focus, textarea:focus, select:focus { 
  border-color: var(--primary); 
  outline: none; 
}

/* LEGAL STATUS BADGES & CHECKBOXES */
.legal-grid { 
  display: flex; 
  gap: 1.5rem; 
  margin-top: 0.5rem; 
}
.legal-checkbox-item { 
  display: flex; 
  align-items: center; 
  gap: 0.5rem; 
  font-weight: 600; 
  font-size: 0.85rem; 
  cursor: pointer; 
  color: var(--text-body); 
}
.badges-row { 
  display: flex; 
  gap: 0.4rem; 
  align-items: center; 
  margin-top: 0.4rem; 
  flex-wrap: wrap;
}
.legal-badge { 
  font-size: 0.65rem; 
  padding: 0.15rem 0.4rem; 
  border-radius: 4px; 
  font-weight: 800; 
  color: white; 
  letter-spacing: 0.05em; 
}
.legal-badge.nda { background: #8b5cf6; }
.legal-badge.mma { background: #ec4899; }

/* SECTIONS (Categories & Certs) */
.mt-4 { margin-top: 1.5rem; }
.section-label { 
  display: block; 
  font-size: 0.8rem; 
  font-weight: 700; 
  color: var(--text-muted); 
  text-transform: uppercase; 
  margin-bottom: 0.75rem; 
  letter-spacing: 0.05em; 
}
.categories-grid { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 0.5rem; 
}
.category-checkbox { 
  display: flex; 
  align-items: center; 
  gap: 0.5rem; 
  background: var(--bg-app); 
  padding: 0.5rem 0.8rem; 
  border-radius: 8px; 
  cursor: pointer; 
  font-size: 0.85rem; 
  border: 1px solid var(--border-main); 
  user-select: none; 
  transition: all 0.2s; 
  color: var(--text-body);
}
.category-checkbox:hover { background: var(--border-light); }
.category-checkbox:has(input:checked) { 
  background: rgba(99, 102, 241, 0.1); 
  border-color: var(--primary); 
  color: var(--primary); 
  font-weight: 600; 
}
.multi-select-custom { 
  height: 140px; 
  padding: 0.5rem; 
}

/* FILTERS */
.filters { 
  display: flex; 
  gap: 1rem; 
  align-items: center; 
  margin-bottom: 2rem; 
  flex-wrap: wrap; 
  background: var(--bg-card); 
  padding: 1rem; 
  border-radius: 12px; 
  border: 1px solid var(--border-main); 
}
.search-input, .filter-select { 
  background: var(--bg-app); 
  color: var(--text-main);
  border-color: var(--border-main);
}
.results-count { font-size: 0.85rem; color: var(--text-muted); margin-left: auto; }

/* LISTA HORIZONTAL (NUEVA ESTRUCTURA) */
.list-container { 
  display: flex; 
  flex-direction: column; 
  gap: 1.2rem; 
}

.horizontal-card { 
  background: var(--bg-card); 
  border-radius: 16px; 
  border: 1px solid var(--border-main); 
  display: flex; 
  align-items: stretch; /* Para que todas las columnas midan lo mismo */
  transition: transform 0.2s, box-shadow 0.2s; 
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  overflow: hidden; /* Asegura bordes redondeados limpios */
}

.horizontal-card:hover { 
  transform: translateX(4px); 
  border-color: var(--primary); 
  box-shadow: 0 8px 15px rgba(0,0,0,0.15);
}

/* Bloque 1: Identidad */
.card-identity { 
  display: flex; 
  align-items: flex-start; 
  gap: 1rem; 
  min-width: 260px;
  max-width: 300px;
  padding: 1.5rem;
  border-right: 1px solid var(--border-light);
  background: rgba(255,255,255,0.01);
}
.card-avatar { 
  width: 48px; height: 48px; 
  background: linear-gradient(135deg, var(--primary), #8b5cf6); 
  color: white; border-radius: 12px; 
  display: flex; align-items: center; justify-content: center; 
  font-size: 1.3rem; font-weight: 800; 
  flex-shrink: 0;
}
.card-title-block h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-main); line-height: 1.2;}
.country-badge { background: var(--bg-app); color: var(--text-muted); padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; border: 1px solid var(--border-main);}

/* Bloque 2: Info Main */
.card-info-block { 
  flex: 2; 
  padding: 1.5rem;
  display: flex; 
  flex-direction: column; 
  gap: 1rem; 
}
.contact-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
}
.info-row { 
  display: flex; 
  align-items: center; 
  gap: 0.6rem; 
  font-size: 0.9rem; 
  color: var(--text-body); 
}
.info-row a { color: var(--primary); text-decoration: none; font-weight: 500; }

.tags-section { 
  background: rgba(0,0,0,0.1); 
  padding: 0.6rem 0.8rem; 
  border-radius: 10px; 
  border: 1px dashed var(--border-main); 
}
.tags-container { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 0.4rem; 
  flex: 1; 
}
.category-tag { 
  background: rgba(99, 102, 241, 0.15); 
  color: var(--primary); 
  padding: 0.2rem 0.6rem; 
  border-radius: 6px; 
  font-size: 0.75rem; 
  font-weight: 600; 
  white-space: nowrap; 
}

/* Bloque 3: Detalles Extras */
.card-details-block {
  flex: 1.5;
  padding: 1.5rem;
  border-left: 1px dashed var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 250px;
}
.btn-view-certs { 
  background: var(--bg-app); 
  color: #0ea5e9; 
  border: 1px solid rgba(14, 165, 233, 0.3); 
  padding: 0.3rem 0.8rem; 
  border-radius: 6px; 
  font-size: 0.8rem; 
  cursor: pointer; 
}
.notes-row { 
  background: rgba(0,0,0,0.15); 
  padding: 0.6rem; 
  border-radius: 8px; 
  border-left: 3px solid var(--border-main); 
  color: var(--text-muted); 
  font-style: italic; 
  align-items: flex-start;
}
.truncate-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.8rem;
}
.reach-date { 
  font-size: 0.8rem; 
  color: var(--text-muted); 
  background: var(--bg-app); 
  padding: 0.3rem 0.6rem; 
  border-radius: 6px; 
  display: flex; 
  align-items: center; 
  gap: 0.4rem; 
  width: max-content;
}
.overdue { 
  background-color: var(--danger-bg); 
  color: var(--danger-text); 
  border: 1px solid rgba(251, 113, 133, 0.3); 
  font-weight: 700;
}

/* Bloque 4: Acciones */
.card-actions-vertical { 
  background: rgba(0,0,0,0.15); 
  border-left: 1px solid var(--border-main); 
  padding: 1.5rem 1rem; 
  display: flex; 
  flex-direction: column; 
  gap: 0.6rem; 
  min-width: 140px;
  justify-content: center;
}
.action-top-row {
  display: flex;
  justify-content: space-between;
  gap: 0.3rem;
}
.btn-action-icon {
  background: var(--bg-app);
  border: 1px solid var(--border-main);
  border-radius: 6px;
  padding: 0.4rem;
  cursor: pointer;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: 0.2s;
}
.btn-action-icon.btn-edit:hover { background: var(--border-light); }
.btn-action-icon.btn-delete:hover { background: var(--danger-bg); border-color: rgba(251, 113, 133, 0.3);}
.btn-action-full {
  width: 100%;
  padding: 0.6rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 800;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
  transition: filter 0.2s;
}
.btn-action-full:hover { filter: brightness(1.1); }
.btn-initial-reach { background: var(--primary); color: white; }
.btn-email { background: var(--success-bg); color: var(--success-text); }


/* MODALS */
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.modal { background: var(--bg-card); border-radius: 20px; width: 90%; max-width: 600px; padding: 2rem; border: 1px solid var(--border-main); }
.modal-header h2 { color: var(--text-main); margin: 0; }
.modal-close { background: var(--bg-app); border: none; color: var(--text-muted); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; }
.signature-notice { background: rgba(234, 179, 8, 0.1); color: var(--warning-text); padding: 0.5rem 0.8rem; border-radius: 8px; font-size: 0.85rem; border: 1px dashed var(--warning-text); }
.cert-item { background: var(--bg-app); padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 0.5rem; color: var(--text-main); display: flex; gap: 0.6rem; }

/* GLOBAL BUTTONS */
.btn-primary { background: var(--primary); color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 10px; cursor: pointer; font-weight: 700; }
.btn-secondary { background: var(--border-light); color: var(--text-main); border: none; padding: 0.7rem 1.5rem; border-radius: 10px; cursor: pointer; font-weight: 600; }
.btn-clear { background: var(--border-light); color: var(--text-muted); border: none; padding: 0.7rem 1rem; border-radius: 8px; cursor: pointer; }
.loading, .empty { text-align: center; padding: 3rem; color: var(--text-muted); }

/* RESPONSIVE: En pantallas más pequeñas, que se vuelva tarjeta normal */
@media (max-width: 1000px) {
  .horizontal-card {
    flex-direction: column;
    align-items: stretch;
  }
  .card-identity { border-right: none; border-bottom: 1px solid var(--border-light); padding-bottom: 1rem;}
  .card-details-block { border-left: none; border-top: 1px dashed var(--border-light); padding-top: 1rem;}
  .card-actions-vertical { border-left: none; border-top: 1px solid var(--border-main); flex-direction: row; flex-wrap: wrap; }
  .card-actions-vertical > * { flex: 1; min-width: 100px;}
}
</style>