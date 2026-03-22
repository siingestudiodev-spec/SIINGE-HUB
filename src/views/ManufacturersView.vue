<template>
  <div class="container">
    <div class="header">
      <h1>Manufacturers</h1>
      <button @click="showForm = !showForm" class="btn-primary">
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
        <input v-model="form.product_categories" placeholder="Product Categories (e.g. Knitwear, Woven)" />
      </div>
      <textarea v-model="form.notes" placeholder="Notes" rows="3"></textarea>
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
          <div class="info-row" v-if="m.product_categories"><span class="info-icon">🏷️</span><span class="category-tag">{{ m.product_categories }}</span></div>
          <div class="info-row notes-row" v-if="m.notes"><span class="info-icon">📝</span>{{ m.notes }}</div>
        </div>
        <!-- ULTIMO EMAIL ENVIADO -->
        <div v-if="m.lastEmail" class="reach-date">
         📧 {{ m.lastEmail.name }}: {{ new Date(m.lastEmail.sentAt).toLocaleDateString('es-CO') }}
        </div>

        <div class="card-actions">
          <button @click="editManufacturer(m)" class="btn-secondary">Edit</button>
          <!-- EMAIL BUTTON - NEW -->
          <button v-if="m.email" @click="openEmailModal(m)" class="btn-email">
          Email
          </button>
          <button @click="deleteManufacturer(m.id)" class="btn-danger">Delete</button>
        </div>
      </div>
    </div>

    <!-- EMAIL MODAL - NEW -->
    <div v-if="emailModal.show" class="modal-overlay" @click.self="emailModal.show = false">
      <div class="modal">
        <div class="modal-header">
          <h2>✉️ Initial Reach Email</h2>
          <button @click="emailModal.show = false" class="modal-close">✕</button>
        </div>

        <div class="modal-field">
          <label>To</label>
          <input v-model="emailModal.to" placeholder="Recipient email" />
        </div>
        <div class="modal-field">
          <label>Subject</label>
          <input v-model="emailModal.subject" />
        </div>
        <div class="modal-field">
          <label>Message</label>
          <textarea v-model="emailModal.body" rows="16"></textarea>
        </div>

        <div class="modal-actions">
          <button @click="emailModal.show = false" class="btn-secondary">Cancel</button>
          <button @click="sendEmail" class="btn-email-send" :disabled="emailModal.sending">
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

// ─── EmailJS config ───────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'service_vxy88pq'
const EMAILJS_TEMPLATE_ID = 'template_44apzvs'
const EMAILJS_PUBLIC_KEY  = 'CFmOQW7RjLSBDwIOV'

const manufacturers = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(false)
const editId = ref(null)
const search = ref('')
const filterCountry = ref('')
const filterCategory = ref('')

const form = ref({
  company_name: '', country: '', contact_name: '',
  phone: '', email: '', website: '', product_categories: '', notes: ''
})

// EMAIL MODAL STATE - NEW
const emailModal = ref({
  show: false,
  to: '',
  subject: '',
  body: '',
  sending: false,
  success: false,
  error: ''
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

// OPEN MODAL WITH PREFILLED EMAIL - NEW
function openEmailModal(m) {
  emailModal.value = {
    show: true,
    to: m.email,
    subject: 'Manufacturing Partnership Inquiry | SIINGE STUDIO',
    body: `Hi ${m.company_name},

My name is Luis and I manage Product Operations at SIINGE STUDIO, a US-based apparel development and production partner supporting brands across lingerie, swimwear, loungewear, and technical apparel.

We currently oversee multiple development programs simultaneously and are selectively expanding our manufacturing network to support upcoming production cycles. Your facility came to our attention as a potential long-term partner.

Before moving into deeper alignment, could you share a brief overview of:

• Primary product categories and technical strengths
• Typical program size or MOQ range
• Whether you support material sourcing or operate CMT
• Approximate sample lead times

At SIINGE, we operate within a structured partnership framework designed to maintain clarity across development timelines, communication workflows, and ethical manufacturing standards, with an emphasis on responsible sourcing and sustainable design methods where applicable. Once alignment is confirmed, our onboarding process includes a mutual NDA and Manufacturing Master Agreement to standardize expectations across projects.

If there appears to be mutual fit, we would be glad to continue over email or schedule a short introductory call to learn more about your current capabilities and production focus.

Best regards,
Luis
SIINGE STUDIO`,
    sending: false,
    success: false,
    error: '',
    manufacturerId: m.id  // ← AGREGAR ESTA LÍNEA
  }
}

// SEND EMAIL VIA EMAILJS - NEW
async function sendEmail() {
  emailModal.value.sending = true
  emailModal.value.success = false
  emailModal.value.error = ''

  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: emailModal.value.to,
        subject:  emailModal.value.subject,
        message:  emailModal.value.body
      },
      EMAILJS_PUBLIC_KEY
    )

    // ← NUEVO: marcar como enviado en Supabase
    const sentAt = new Date().toISOString()
    await supabase
      .from('manufacturers')
      .update({
        initial_reach_sent: true,
        initial_reach_sent_at: sentAt
      })
      .eq('id', emailModal.value.manufacturerId)

    await fetchManufacturers()  // refrescar lista

    emailModal.value.success = true
    setTimeout(() => { emailModal.value.show = false }, 1500)
  } catch (err) {
    emailModal.value.error = 'Failed to send. Check your EmailJS credentials.'
    console.error(err)
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

async function saveManufacturer() {
  if (!form.value.company_name) return alert('Company name is required')
  if (editing.value) {
    await supabase.from('manufacturers').update(form.value).eq('id', editId.value)
  } else {
    await supabase.from('manufacturers').insert([form.value])
  }
  resetForm(); fetchManufacturers()
}

function editManufacturer(m) {
  form.value = { ...m }; editId.value = m.id; editing.value = true; showForm.value = true
}

async function deleteManufacturer(id) {
  if (!confirm('Delete this manufacturer?')) return
  await supabase.from('manufacturers').delete().eq('id', id)
  fetchManufacturers()
}

function resetForm() {
  form.value = { company_name: '', country: '', contact_name: '', phone: '', email: '', website: '', product_categories: '', notes: '' }
  editing.value = false; editId.value = null; showForm.value = false
}

onMounted(fetchManufacturers)
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; }

.form-card { background: white; padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1.5px solid #e5e7eb; box-shadow: 0 4px 24px rgba(79,70,229,0.07); }
.form-card h2 { font-size: 1.1rem; margin-bottom: 1.25rem; color: #1a1a2e; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.92rem; color: #1a1a2e; background: white; font-family: 'Inter', sans-serif; transition: border-color 0.15s; box-sizing: border-box; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; }
.form-actions { margin-top: 1rem; }

.filters { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.75rem; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 220px; }
.btn-clear { background: white; color: #666; border: 1.5px solid #e5e7eb; padding: 0.6rem 0.9rem; border-radius: 10px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; }
.results-count { color: #9ca3af; font-size: 0.85rem; white-space: nowrap; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
.card { background: white; border-radius: 16px; padding: 1.5rem; border: 1.5px solid #e5e7eb; box-shadow: 0 2px 12px rgba(0,0,0,0.05); transition: transform 0.18s, box-shadow 0.18s; }
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(79,70,229,0.12); border-color: #c7d2fe; }

.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.card-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-weight: 700; font-size: 1.3rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-title h3 { font-size: 1.05rem; font-weight: 700; color: #1a1a2e; margin-bottom: 0.25rem; }
.country-badge { background: #eef2ff; color: #4f46e5; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.78rem; font-weight: 500; }

.card-body { margin-bottom: 1.25rem; }
.info-row { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.45rem; font-size: 0.88rem; color: #4b5563; }
.info-icon { flex-shrink: 0; }
.info-row a { color: #4f46e5; text-decoration: none; }
.info-row a:hover { text-decoration: underline; }
.category-tag { background: #f0fdf4; color: #16a34a; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.82rem; font-weight: 500; }
.notes-row { color: #9ca3af !important; font-style: italic; }

.card-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; flex-wrap: wrap; }

/* MODAL - NEW */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; padding: 2rem; box-shadow: 0 24px 64px rgba(0,0,0,0.18); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h2 { font-size: 1.15rem; font-weight: 700; color: #1a1a2e; }
.modal-close { background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 1rem; color: #6b7280; }
.modal-close:hover { background: #e5e7eb; }
.modal-field { margin-bottom: 1rem; }
.modal-field label { display: block; font-size: 0.8rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
.modal-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; justify-content: flex-end; }
.modal-success { margin-top: 1rem; background: #f0fdf4; color: #16a34a; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.9rem; font-weight: 600; }
.modal-error { margin-top: 1rem; background: #fff1f2; color: #e11d48; padding: 0.75rem 1rem; border-radius: 10px; font-size: 0.9rem; }

.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; font-family: 'Inter', sans-serif; transition: opacity 0.15s, transform 0.15s; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary { background: #eef2ff; color: #4f46e5; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.btn-email { background: #f0fdf4; color: #16a34a; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 600; }
.btn-email:hover { background: #dcfce7; }
.btn-email-send { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.65rem 1.5rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; font-family: 'Inter', sans-serif; }
.reach-date { font-size: 0.82rem; color: #6b7280; }
.btn-email-send:disabled { opacity: 0.6; cursor: not-allowed; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }
</style>
