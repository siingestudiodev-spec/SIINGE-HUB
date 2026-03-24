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
        <button @click="saveManufacturer" class="btn-primary">{{ editing ? 'Update Manufacturer' : 'Save Manufacturer' }}</button>
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
      <button v-if="search || filterCountry || filterCategory" @click="clearFilters" class="btn-clear">✕ Clear</button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else class="cards-grid">
      <div v-for="m in filteredManufacturers" :key="m.id" class="card">
        
        <div class="card-content">
          <div class="card-top">
            <div class="card-avatar">{{ m.company_name?.charAt(0) }}</div>
            <div class="card-title">
              <h3>{{ m.company_name }}</h3>
              <span class="country-badge">🌍 {{ m.country || 'Unknown' }}</span>
            </div>
          </div>
          
          <div class="card-body">
            <div class="info-group">
              <div class="info-row" v-if="m.contact_name"><span class="info-icon">👤</span><strong>{{ m.contact_name }}</strong></div>
              <div class="info-row" v-if="m.phone"><span class="info-icon">📞</span><a :href="'tel:'+m.phone">{{ m.phone }}</a></div>
              <div class="info-row" v-if="m.email"><span class="info-icon">✉️</span><a :href="'mailto:'+m.email">{{ m.email }}</a></div>
              <div class="info-row" v-if="m.website"><span class="info-icon">🌐</span><a :href="m.website" target="_blank">Website</a></div>
            </div>

            <div class="tags-section">
              <div class="info-row align-start" v-if="m.product_categories">
                <span class="info-icon mt-1">🏷️</span>
                <div class="tags-container">
                  <span v-for="tag in m.product_categories.split(',')" :key="tag" class="category-tag">{{ tag.trim() }}</span>
                </div>
              </div>

              <div class="info-row" v-if="m.certifications">
                <span class="info-icon">📜</span>
                <button @click="showCertsPopup(m)" class="btn-view-certs">
                  View {{ m.certifications.split(',').length }} Certification{{ m.certifications.split(',').length !== 1 ? 's' : '' }}
                </button>
              </div>
            </div>

            <div class="info-row notes-row" v-if="m.notes"><span class="info-icon">📝</span>{{ m.notes }}</div>
            
            <div v-if="m.email_logs && m.email_logs.length > 0" class="email-history">
              <div v-for="(log, index) in m.email_logs" :key="index" 
                   class="reach-date"
                   :class="{ 'overdue': index === m.email_logs.length - 1 && isOverdue(log.sentAt) }">
                <span class="log-icon">🕒</span> {{ log.templateName }}: {{ new Date(log.sentAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) }}
                <span v-if="index === m.email_logs.length - 1 && isOverdue(log.sentAt)" class="warning-icon" title="More than 7 days ago">⚠️</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button @click="editManufacturer(m)" class="btn-action btn-edit">✏️ EDIT</button>
          <button @click="logExternalContact(m)" class="btn-action btn-log">📝 LOG</button>
          
          <button v-if="m.email" @click="openInitialReachModal(m)" class="btn-action btn-initial-reach">🚀 INITIAL REACH</button>
          <button v-if="m.email" @click="openEmailModal(m)" class="btn-action btn-email">✉️ EMAIL</button>
          
          <div class="spacer"></div>
          <button @click="deleteManufacturer(m.id)" class="btn-action btn-delete">🗑️ DELETE</button>
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

    <div v-if="emailModal.show" class="modal-overlay" @click.self="emailModal.show = false">
      <div class="modal">
        <div class="modal-header">
          <h2>{{ emailModal.isInitialReach ? '🚀 Send Initial Reach' : '✉️ Send Email' }} to {{ emailModal.companyName }}</h2>
          <button @click="emailModal.show = false" class="modal-close">✕</button>
        </div>
        <div class="modal-field"><label>To</label><input v-model="emailModal.to" /></div>
        
        <div class="modal-field" v-if="!emailModal.isInitialReach">
          <label>Select Template</label>
          <select v-model="emailModal.selectedTemplate" @change="applyTemplate">
            <option value="">-- Choose a template --</option>
            <option v-for="t in templatesList" :key="t.id" :value="t">{{ t.name }}</option>
          </select>
        </div>

        <div class="modal-field"><label>Subject</label><input v-model="emailModal.subject" /></div>
        
        <div class="modal-field">
          <label>Message</label>
          <textarea v-model="emailModal.body" rows="12"></textarea>
          <div class="signature-notice mt-2">
            ✨ Your SIINGE STUDIO signature will be automatically attached at the bottom.
          </div>
        </div>
        
        <div class="modal-actions mt-4">
          <button @click="emailModal.show = false" class="btn-secondary">Cancel</button>
          <button @click="sendEmail" class="btn-primary" :disabled="emailModal.sending || (!emailModal.subject || !emailModal.body)">
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

// ---- CÓDIGO HTML DE TU FIRMA ----
const htmlSignature = `<br><br><table cellpadding="0" cellspacing="0" style="border-collapse: collapse; line-height: 1.15; width: 100%;" id="isPasted" width="100%">
	<tbody valign="middle">
		<tr valign="inherit">
			<td style="vertical-align:middle;padding:.01px 12px 0.01px 1px;width:92px;text-align:center;" valign="middle" align="center"><img border="0" src="https://permanent-assets-download.flockmail.com/signature/2408373/2024-06-03_36c3cd811224bc3a55b5_55761" width="92" alt="photo" style="width: 78px; vertical-align: middle; border-radius: 0px; height: 83px; border: 0px; display: block;"></td>
			<td valign="top" style="padding:.01px 0.01px 0.01px 12px;vertical-align:top;border-left:solid 1px #BDBDBD;"><strong><strong><br></strong></strong>
				<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;" width="100%">
					<tbody valign="middle">
						<tr valign="inherit">
							<td style="padding:.01px;" valign="inherit">
								<p style="margin:.1px;line-height:108.0%;font-size:16px;"><span style="font-size: 12pt;"><strong><strong>Luis Domínguez</strong><br style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400;"></strong></span><span style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 11pt; font-weight: 400; display: inline !important;"><strong>Product Operations Manager</strong></span></p>
								<p style="margin:.1px;line-height:108.0%;font-size:16px;"><span style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 11pt; font-weight: 400; display: inline !important;"><strong>​</strong></span>
									<br style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400;"><span style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400; display: inline !important;">+57 350 201 4528 &nbsp; | &nbsp;&nbsp;</span><a href="https://www.siinge.studio/" style="color: rgb(76, 140, 246); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400;" target="_blank">www.siinge.studio</a>
									<br style="color: rgb(51, 51, 51); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400;"><a href="mailto:production@siinge.studio" style="color: rgb(76, 140, 246); font-family: Arial, sans-serif; font-size: 14px; font-weight: 400;" target="_blank">production@siinge.studio</a></p>
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

const categoryOptions = ['Activewear', "Children's wear", 'Swimwear', 'Evening wear', 'Streetwear', 'Launchwear', 'Intimate Apparel', 'Leather Good', 'Accessories']
const certOptions = ['OEKO-TEX STANDARD 100', 'ISO 45001', 'OCS100', 'UN Global Compact', 'GRS', 'ISO9001', 'amfori BSCI', 'SMETA', 'WRAP', 'SA8000', 'ISO 14001', 'OEKO-TEX STeP', 'bluesign®', 'GOTS']

const selectedCategories = ref([])
const selectedCertifications = ref([])
const certPopup = ref({ show: false, list: [] })

const form = ref({ company_name: '', country: '', contact_name: '', phone: '', email: '', website: '', product_categories: '', certifications: '', notes: '' })
const emailModal = ref({ show: false, to: '', subject: '', body: '', sending: false, success: false, error: '', manufacturerId: null, companyName: '', selectedTemplate: '', isInitialReach: false })

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

function showCertsPopup(m) { certPopup.value.list = m.certifications.split(','); certPopup.value.show = true }

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
  editId.value = m.id; editing.value = true; showForm.value = true; window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetForm() {
  form.value = { company_name: '', country: '', contact_name: '', phone: '', email: '', website: '', product_categories: '', certifications: '', notes: '' }
  selectedCategories.value = []; selectedCertifications.value = []; editing.value = false; editId.value = null; showForm.value = false
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

function openAddForm() { resetForm(); showForm.value = !showForm.value }
function clearFilters() { search.value = ''; filterCountry.value = ''; filterCategory.value = '' }

function openEmailModal(m) { 
  emailModal.value = { show: true, to: m.email, subject: '', body: '', sending: false, success: false, error: '', manufacturerId: m.id, companyName: m.company_name, selectedTemplate: '', isInitialReach: false } 
}

function openInitialReachModal(m) {
  const categoryText = m.product_categories ? m.product_categories : 'various apparel categories'
  const subject = 'Manufacturing Partnership Inquiry | SIINGE STUDIO'
  
  // Nota: Ya no incluimos "Best regards, Luis" aquí porque la firma HTML ya lo trae.
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

If there appears to be mutual fit, we would be glad to continue over email or schedule a short introductory call to learn more about your current capabilities and production focus.

Best regards, Luis.`

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
    // ENVIAMOS EL MENSAJE + LA FIRMA COMO UNA VARIABLE SEPARADA
    await emailjs.send(
      EMAILJS_SERVICE_ID, 
      EMAILJS_TEMPLATE_ID, 
      { 
        to_email: emailModal.value.to, 
        subject: emailModal.value.subject, 
        message: emailModal.value.body,
        signature: htmlSignature // <--- Aquí inyectamos tu firma
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
  if (confirm('Are you sure you want to delete this manufacturer?')) { await supabase.from('manufacturers').delete().eq('id', id); fetchManufacturers() }
}

function isOverdue(dateString) {
  if (!dateString) return false
  return Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24)) >= 7
}

onMounted(() => { fetchManufacturers(); fetchTemplates() })
</script>

<style scoped>
/* GENERAL LAYOUT */
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; font-family: 'Inter', sans-serif; color: #1f2937; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { font-size: 2rem; font-weight: 800; color: #111827; }

/* FORM & INPUTS */
.form-card { background: white; padding: 2rem; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: 2.5rem; }
.form-card h2 { margin-top: 0; margin-bottom: 1.5rem; font-size: 1.25rem; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
input, textarea, select { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid #d1d5db; border-radius: 10px; font-size: 0.95rem; background: #f9fafb; transition: all 0.2s; box-sizing: border-box; }
input:focus, textarea:focus, select:focus { border-color: #6366f1; background: white; outline: none; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }

/* SECTIONS (Categories & Certs) */
.mt-4 { margin-top: 1.5rem; }
.section-label { display: block; font-size: 0.8rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 0.75rem; letter-spacing: 0.05em; }
.categories-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.category-checkbox { display: flex; align-items: center; gap: 0.5rem; background: #f3f4f6; padding: 0.5rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; border: 1px solid transparent; user-select: none; transition: all 0.2s; }
.category-checkbox:hover { background: #e5e7eb; }
.category-checkbox:has(input:checked) { background: #e0e7ff; border-color: #6366f1; color: #4338ca; font-weight: 600; }
.category-checkbox input { margin: 0; cursor: pointer; }
.multi-select-custom { height: 140px; padding: 0.5rem; }
.multi-select-custom option { padding: 0.4rem; border-radius: 4px; margin-bottom: 2px; }

/* FILTERS */
.filters { display: flex; gap: 1rem; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; background: white; padding: 1rem; border-radius: 12px; border: 1px solid #e5e7eb; }
.search-input { flex: 1; min-width: 200px; margin: 0; background: white; }
.filter-select { width: auto; min-width: 150px; margin: 0; background: white; }

/* CARDS GRID & LAYOUT */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
.card { background: white; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); display: flex; flex-direction: column; height: 100%; transition: transform 0.2s, box-shadow 0.2s; }
.card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08); border-color: #cbd5e1; }
.card-content { padding: 1.5rem; flex-grow: 1; display: flex; flex-direction: column; }

/* CARD HEADER */
.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #f3f4f6; }
.card-avatar { width: 50px; height: 50px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 800; flex-shrink: 0; }
.card-title h3 { margin: 0 0 0.3rem 0; font-size: 1.1rem; font-weight: 700; color: #111827; line-height: 1.2; }
.country-badge { background: #f3f4f6; color: #4b5563; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; display: inline-block; }

/* CARD BODY (INFO) */
.card-body { display: flex; flex-direction: column; gap: 1.2rem; }
.info-group { display: flex; flex-direction: column; gap: 0.5rem; }
.info-row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; color: #4b5563; }
.info-row.align-start { align-items: flex-start; }
.info-icon { font-size: 1rem; flex-shrink: 0; opacity: 0.8; }
.info-row a { color: #6366f1; text-decoration: none; font-weight: 500; }
.info-row a:hover { text-decoration: underline; }

/* TAGS & CERTS IN CARD */
.tags-section { display: flex; flex-direction: column; gap: 0.8rem; background: #f8fafc; padding: 0.8rem; border-radius: 10px; border: 1px dashed #cbd5e1; }
.tags-container { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.category-tag { background: #e0e7ff; color: #4338ca; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
.btn-view-certs { background: white; color: #0ea5e9; border: 1px solid #bae6fd; padding: 0.3rem 0.8rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-view-certs:hover { background: #f0f9ff; border-color: #7dd3fc; }

/* NOTES & LOGS */
.notes-row { font-style: italic; color: #6b7280; background: #f9fafb; padding: 0.8rem; border-radius: 8px; border-left: 3px solid #d1d5db; align-items: flex-start; }
.email-history { margin-top: 0.5rem; padding-top: 1rem; border-top: 1px dashed #e5e7eb; display: flex; flex-direction: column; gap: 0.5rem; }
.reach-date { font-size: 0.82rem; color: #6b7280; display: flex; align-items: center; gap: 0.4rem; background: #f3f4f6; padding: 0.4rem 0.6rem; border-radius: 6px; }
.log-icon { font-size: 0.9rem; }
.overdue { background-color: #fef2f2; color: #b91c1c; font-weight: 600; border: 1px solid #fecaca; }

/* REDESIGNED CARD ACTIONS (BOTTOM) */
.card-actions { 
  margin-top: auto; 
  padding: 1.2rem 1.5rem; 
  background: #f8fafc; 
  border-top: 1px solid #e5e7eb; 
  border-radius: 0 0 16px 16px; 
  display: flex; 
  gap: 0.5rem; 
  align-items: center;
  flex-wrap: wrap;
}
.spacer { flex-grow: 1; }

.btn-action { display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.7rem; border-radius: 8px; font-size: 0.75rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.03em; }
.btn-edit { background: #e0e7ff; color: #4338ca; }
.btn-edit:hover { background: #c7d2fe; }
.btn-log { background: #e2e8f0; color: #475569; }
.btn-log:hover { background: #cbd5e1; }
.btn-email { background: #dcfce7; color: #16a34a; }
.btn-email:hover { background: #bbf7d0; }
.btn-delete { background: #fee2e2; color: #dc2626; } 
.btn-delete:hover { background: #fecaca; }

.btn-initial-reach { background: #e0f2fe; color: #0284c7; }
.btn-initial-reach:hover:not(:disabled) { background: #bae6fd; }

/* MODALS */
.modal-overlay { position: fixed; inset: 0; background: rgba(17, 24, 39, 0.6); z-index: 100; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); padding: 1rem; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 600px; padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); max-height: 90vh; overflow-y: auto; }
.max-w-400 { max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #f3f4f6; padding-bottom: 1rem; }
.modal-header h2 { margin: 0; font-size: 1.25rem; color: #111827; }
.modal-close { background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #6b7280; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
.modal-close:hover { background: #e5e7eb; color: #111827; }

.signature-notice { background: #fefce8; color: #ca8a04; padding: 0.5rem 0.8rem; border-radius: 8px; font-size: 0.85rem; font-weight: 500; border: 1px dashed #fde047; }

/* POPUP CERT LIST */
.cert-list-popup { display: flex; flex-direction: column; gap: 0.8rem; }
.cert-item { background: #f8fafc; padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 0.95rem; font-weight: 500; color: #334155; display: flex; gap: 0.6rem; align-items: center; }

/* GLOBAL BUTTONS */
.btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: opacity 0.2s; }
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #f3f4f6; color: #4b5563; border: none; padding: 0.7rem 1.5rem; border-radius: 10px; cursor: pointer; font-weight: 600; }
.btn-clear { background: #f3f4f6; color: #6b7280; border: none; padding: 0.7rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; margin: 0; }
.loading, .empty { text-align: center; padding: 3rem; color: #6b7280; font-size: 1.1rem; }
</style>