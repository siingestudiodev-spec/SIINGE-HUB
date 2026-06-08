<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>Sourcing</h1>
        <p class="subtitle">Raw material & input providers</p>
      </div>
      <button @click="openAddForm" class="btn-primary">+ Add Provider</button>
    </div>

    <div class="filters-bar">
      <select v-model="filterType" class="filter-select">
        <option value="">All Types</option>
        <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="filterCountry" class="filter-select">
        <option value="">All Countries</option>
        <option v-for="c in availableCountries" :key="c" :value="c">{{ c }}</option>
      </select>
      <button v-if="filterType || filterCountry" @click="clearFilters" class="btn-clear">✕ Clear</button>
      <span class="results-count">{{ filteredProviders.length }} provider{{ filteredProviders.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="showForm" class="form-card">
      <h2 class="title">{{ editingId ? 'Edit Provider' : 'New Provider' }}</h2>
      <div class="form-grid">
        <input v-model="form.provider" placeholder="Provider Name *" />
        <input v-model="form.country" placeholder="Country" />
        <input v-model="form.city" placeholder="City" />
        <input v-model="form.contact_name" placeholder="Contact Name" />
        <input v-model="form.phone" placeholder="Phone" />
        <input v-model="form.email" placeholder="Email" />
        <input v-model="form.address" placeholder="Address" />
        <input v-model="form.website" placeholder="Website" />
        <input v-model="form.catalogue_url" placeholder="Catalogue URL" class="full-row" />
      </div>

      <div class="types-section">
        <label class="types-label">Type</label>
        <div class="types-grid">
          <label v-for="t in typeOptions" :key="t" class="type-checkbox">
            <input type="checkbox" :value="t" v-model="form.types" />
            <span>{{ t }}</span>
          </label>
        </div>
      </div>

      <div class="reliability-section">
        <label class="types-label">Reliability</label>
        <div class="stars">
          <span
            v-for="n in 5" :key="n"
            class="star"
            :class="{ active: n <= form.reliability }"
            @click="form.reliability = n"
          >★</span>
        </div>
      </div>

      <textarea v-model="form.notes" placeholder="Notes" rows="2"></textarea>
      <div class="form-actions">
        <button @click="saveProvider" class="btn-primary">
          {{ editingId ? 'Update Provider' : 'Save Provider' }}
        </button>
        <button @click="cancelForm" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="filteredProviders.length === 0" class="empty">No providers match your filters.</div>
    <div v-else class="cards-grid">
      <div v-for="p in filteredProviders" :key="p.id" class="provider-card">
        <div class="card-header">
          <div class="provider-avatar">{{ p.provider?.charAt(0) }}</div>
          <div>
            <strong>{{ p.provider }}</strong>
            <div class="card-location">{{ [p.city, p.country].filter(Boolean).join(', ') || '—' }}</div>
          </div>
          <div class="card-actions">
            <button @click="editProvider(p)" class="btn-edit"><Pencil :size="13" :stroke-width="1.5" /></button>
            <button @click="deleteProvider(p.id)" class="btn-delete">✕</button>
          </div>
        </div>

        <div class="types-tags">
          <span v-for="t in parseTypes(p.types)" :key="t" class="type-tag">{{ t }}</span>
        </div>

        <div class="card-info">
          <div v-if="p.contact_name"><User :size="12" :stroke-width="1.5" /> {{ p.contact_name }}</div>
          <div v-if="p.phone"><Phone :size="12" :stroke-width="1.5" /> {{ p.phone }}</div>
          <div v-if="p.email">{{ p.email }}</div>
          <div v-if="p.address"><MapPin :size="12" :stroke-width="1.5" /> {{ p.address }}</div>
          <div v-if="p.website"><a :href="p.website" target="_blank"><Globe :size="12" :stroke-width="1.5" /> {{ p.website }}</a></div>
        </div>

        <div class="card-footer">
          <div class="stars-display">
            <span v-for="n in 5" :key="n" class="star" :class="{ active: n <= p.reliability }">★</span>
          </div>
          <div v-if="p.notes" class="card-notes">{{ p.notes }}</div>
          <a v-if="p.catalogue_url" :href="p.catalogue_url" target="_blank" class="btn-catalogue">
            <BookOpen :size="13" :stroke-width="1.5" /> Catalogue
          </a>
          <div class="card-email-actions">
            <button @click="openEmailModal(p)" class="btn-email-action" :disabled="!p.email">
              ✉ Send Email
            </button>
            <button @click="openLogModal(p)" class="btn-log-action">📋 Log Contact</button>
            <button v-if="emailLogs[p.id]?.length" @click="openHistoryPopup(p)" class="btn-history">
              {{ emailLogs[p.id].length }} log{{ emailLogs[p.id].length !== 1 ? 's' : '' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Email modal -->
    <div v-if="emailModal.show" class="modal-overlay" @click.self="emailModal.show = false">
      <div class="modal-box">
        <div class="modal-box-header">
          <h2>Email: {{ emailModal.providerName }}</h2>
          <button @click="emailModal.show = false" class="modal-close-btn">✕</button>
        </div>
        <div class="modal-box-body">
          <input v-model="emailModal.subject" placeholder="Subject *" class="modal-input" />
          <input v-model="emailModal.cc" placeholder="CC (optional)" class="modal-input" style="margin-bottom:0.5rem;" />
          <textarea v-model="emailModal.body" placeholder="Message body *" rows="8" class="modal-textarea"></textarea>
          <p v-if="emailModal.error" style="color:#ef4444;font-size:0.82rem;">{{ emailModal.error }}</p>
        </div>
        <div class="modal-box-actions">
          <button @click="emailModal.show = false" class="btn-secondary">Cancel</button>
          <button @click="sendEmail" :disabled="!emailModal.subject || !emailModal.body || emailModal.sending" class="btn-primary">
            {{ emailModal.sending ? 'Sending...' : 'Send Email' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Log contact modal -->
    <div v-if="logModal.show" class="modal-overlay" @click.self="logModal.show = false">
      <div class="modal-box" style="max-width:420px;">
        <div class="modal-box-header">
          <h2>Log Contact: {{ logModal.providerName }}</h2>
          <button @click="logModal.show = false" class="modal-close-btn">✕</button>
        </div>
        <div class="modal-box-body">
          <input type="date" v-model="logModal.date" class="modal-input" />
          <input v-model="logModal.note" placeholder="Note / Action (e.g. Sent samples, Called to discuss MOQ...)" class="modal-input" style="margin-top:0.75rem;" />
        </div>
        <div class="modal-box-actions">
          <button @click="logModal.show = false" class="btn-secondary">Cancel</button>
          <button @click="saveLog" :disabled="!logModal.note.trim() || !logModal.date" class="btn-primary">Save Log</button>
        </div>
      </div>
    </div>

    <!-- History popup -->
    <div v-if="historyPopup.show" class="modal-overlay" @click.self="historyPopup.show = false">
      <div class="modal-box" style="max-width:500px;">
        <div class="modal-box-header">
          <h2>Contact History: {{ historyPopup.providerName }}</h2>
          <button @click="historyPopup.show = false" class="modal-close-btn">✕</button>
        </div>
        <div class="modal-box-body" style="max-height:400px;overflow-y:auto;">
          <div v-if="!historyPopup.list.length" style="color:var(--text-muted);font-size:0.88rem;">No logs yet.</div>
          <div v-for="log in historyPopup.list" :key="log.id" class="history-item">
            <div class="history-note">{{ log.template_name }}</div>
            <div class="history-meta">
              {{ log.sent_at ? new Date(log.sent_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—' }}
              <span v-if="log.read_at" class="read-badge">✓ Read</span>
            </div>
          </div>
        </div>
        <div class="modal-box-actions">
          <button @click="historyPopup.show = false" class="btn-primary">Close</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { User, Phone, MapPin, Globe, Pencil, BookOpen } from 'lucide-vue-next'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const providers = ref([])
const loading = ref(true)
const showForm = ref(false)
const editingId = ref(null)
const emailLogs = ref({})

const emailModal = ref({ show: false, providerId: null, providerName: '', subject: '', body: '', cc: '', sending: false, error: '' })
const logModal   = ref({ show: false, providerId: null, providerName: '', note: '', date: new Date().toISOString().split('T')[0] })
const historyPopup = ref({ show: false, providerName: '', list: [] })

const filterType = ref('')
const filterCountry = ref('')

const typeOptions = ['Yarns', 'Fabrics', 'Tags', 'Packaging', 'Stickers', 'Trims', 'Leather', 'Printing', 'Dyeing', 'Accessories']

const emptyForm = () => ({
  provider: '', types: [], country: '', city: '',
  contact_name: '', phone: '', email: '',
  address: '', website: '', catalogue_url: '', reliability: 0, notes: ''
})

const form = ref(emptyForm())

const availableCountries = computed(() => {
  const countries = providers.value.map(p => p.country).filter(Boolean)
  return [...new Set(countries)].sort()
})

const parseTypes = (types) => {
  if (Array.isArray(types)) return types
  if (typeof types === 'string') {
    try {
      const parsed = JSON.parse(types)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return types.split(',').map(t => t.trim())
    }
  }
  return []
}

const filteredProviders = computed(() => {
  return providers.value.filter(p => {
    const types = parseTypes(p.types)
    const matchType = !filterType.value || types.includes(filterType.value)
    const matchCountry = !filterCountry.value || p.country === filterCountry.value
    return matchType && matchCountry
  })
})

function clearFilters() {
  filterType.value = ''
  filterCountry.value = ''
}

function openAddForm() {
  editingId.value = null
  form.value = emptyForm()
  showForm.value = true
}

function editProvider(p) {
  editingId.value = p.id
  form.value = {
    provider: p.provider || '',
    types: parseTypes(p.types),
    country: p.country || '',
    city: p.city || '',
    contact_name: p.contact_name || '',
    phone: p.phone || '',
    email: p.email || '',
    address: p.address || '',
    website: p.website || '',
    catalogue_url: p.catalogue_url || '',
    reliability: p.reliability || 0,
    notes: p.notes || ''
  }
  showForm.value = true
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
  form.value = emptyForm()
}

async function fetchProviders() {
  loading.value = true
  const { data } = await supabase.from('sourcing').select('*').order('provider')
  providers.value = data || []
  loading.value = false
  fetchAllLogs()
}

async function fetchAllLogs() {
  const { data } = await supabase.from('sourcing_email_logs').select('id, sourcing_id, template_name, sent_at, read_at').order('sent_at', { ascending: false })
  const map = {}
  if (data) data.forEach(l => { if (!map[l.sourcing_id]) map[l.sourcing_id] = []; map[l.sourcing_id].push(l) })
  emailLogs.value = map
}

function openEmailModal(p) {
  emailModal.value = { show: true, providerId: p.id, providerName: p.provider, subject: '', body: '', cc: '', sending: false, error: '' }
}

function openLogModal(p) {
  logModal.value = { show: true, providerId: p.id, providerName: p.provider, note: '', date: new Date().toISOString().split('T')[0] }
}

function openHistoryPopup(p) {
  historyPopup.value = { show: true, providerName: p.provider, list: emailLogs.value[p.id] || [] }
}

async function sendEmail() {
  if (!emailModal.value.subject || !emailModal.value.body) return
  emailModal.value.sending = true
  emailModal.value.error = ''
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-sourcing-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ sourcing_id: emailModal.value.providerId, subject: emailModal.value.subject, body: emailModal.value.body, template_name: emailModal.value.subject, cc: emailModal.value.cc?.trim() || null })
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error ?? 'Send failed')
    emailModal.value.show = false
    fetchAllLogs()
  } catch (err) {
    emailModal.value.error = err.message
  } finally {
    emailModal.value.sending = false
  }
}

async function saveLog() {
  if (!logModal.value.note.trim()) return
  const sentAt = new Date(logModal.value.date + 'T12:00:00').toISOString()
  await supabase.from('sourcing_email_logs').insert([{ sourcing_id: logModal.value.providerId, template_name: logModal.value.note.trim(), sent_at: sentAt }])
  logModal.value.show = false
  fetchAllLogs()
}

async function saveProvider() {
  if (!form.value.provider) return alert('Provider name is required')

  const payload = {
    ...form.value,
    types: form.value.types
  }

  if (editingId.value) {
    await supabase.from('sourcing').update(payload).eq('id', editingId.value)
  } else {
    await supabase.from('sourcing').insert([payload])
  }

  cancelForm()
  fetchProviders()
}

async function deleteProvider(id) {
  if (!confirm('Delete this provider?')) return
  await supabase.from('sourcing').delete().eq('id', id)
  fetchProviders()
}

onMounted(fetchProviders)
</script>

<style scoped>
.container { max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
h1 { font-size: 2rem; font-weight: 700; color: var(--text-main); }
.subtitle { color: var(--text-body); margin-top: 0.25rem; font-size: 0.92rem; }

.filters-bar { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.filter-select { padding: 0.6rem 1rem; border: 1.5px solid var(--border-main); border-radius: 10px; font-size: 0.9rem; color: var(--text-main); background: var(--bg-card); cursor: pointer; font-family: 'Poppins', sans-serif; }
.filter-select:focus { outline: none; border-color: var(--primary); }
.btn-clear { background: var(--border-light); color: var(--text-body); border: none; padding: 0.6rem 1rem; border-radius: 10px; cursor: pointer; font-size: 0.85rem; }
.btn-clear:hover { background: var(--border-main); }
.results-count { margin-left: auto; font-size: 0.85rem; color: var(--text-muted); }

.form-card { background: var(--bg-card); padding: 2rem; border-radius: 16px; margin-bottom: 2rem; border: 1.5px solid var(--border-main); box-shadow: 0 4px 24px rgba(79,70,229,0.07); }
.form-card h2 { font-size: 1.1rem; margin-bottom: 1.25rem; color: var(--text-main); }
.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
input, textarea { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid var(--border-main); border-radius: 10px; font-size: 0.92rem; color: var(--text-main); background: var(--bg-card); font-family: 'Poppins', sans-serif; transition: border-color 0.15s; box-sizing: border-box; }
input:focus, textarea:focus { outline: none; border-color: var(--primary); }
textarea { resize: vertical; margin-top: 0.75rem; }
.form-actions { margin-top: 1rem; display: flex; gap: 0.75rem; }

.types-section, .reliability-section { margin-bottom: 1.25rem; }
.types-label { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-body); margin-bottom: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; }
.types-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.type-checkbox { display: flex; align-items: center; gap: 0.4rem; background: var(--border-light); border: 1.5px solid var(--border-main); padding: 0.35rem 0.75rem; border-radius: 20px; cursor: pointer; font-size: 0.85rem; transition: all 0.15s; color: var(--text-body); }
.type-checkbox:hover { border-color: var(--primary); background: rgba(79, 70, 229, 0.1); }
.type-checkbox input { width: auto; margin: 0; }

.stars { display: flex; gap: 0.25rem; }
.star { font-size: 1.8rem; color: var(--text-muted); cursor: pointer; transition: color 0.15s; }
.star.active { color: var(--warning-text); }
.stars-display { display: flex; gap: 0.15rem; }
.stars-display .star { font-size: 1rem; cursor: default; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
.provider-card { background: var(--bg-card); border-radius: 16px; border: 1.5px solid var(--border-main); padding: 1.5rem; box-shadow: 0 4px 24px rgba(79,70,229,0.07); display: flex; flex-direction: column; gap: 1rem; }
.card-header { display: flex; align-items: flex-start; gap: 0.75rem; }
.provider-avatar { width: 40px; height: 40px; background: var(--primary); color: white; font-weight: 700; font-size: 1rem; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-header strong { font-size: 1rem; color: var(--text-main); }
.card-location { font-size: 0.82rem; color: var(--text-muted); margin-top: 0.15rem; }

.card-actions { margin-left: auto; display: flex; gap: 0.4rem; }
.btn-edit { background: rgba(79, 70, 229, 0.1); color: var(--primary); border: none; padding: 0.35rem 0.7rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-edit:hover { background: rgba(79, 70, 229, 0.15); }

.types-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.types-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.type-tag {
  background: var(--primary);
  color: white;
  padding: 0.35rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  display: inline-block;
}

.card-info { font-size: 0.85rem; color: var(--text-body); line-height: 1.8; }
.card-info a { color: var(--primary); text-decoration: none; }
.card-info a:hover { text-decoration: underline; }

.card-footer { display: flex; flex-direction: column; gap: 0.5rem; }
.card-notes { font-size: 0.82rem; color: var(--text-muted); font-style: italic; }
.btn-catalogue { display: inline-flex; align-items: center; gap: 5px; background: #eff6ff; color: #0284c7; border: none; padding: 0.35rem 0.75rem; border-radius: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 600; text-decoration: none; width: fit-content; }
.btn-catalogue:hover { background: #dbeafe; }

.card-email-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-light); }
.btn-email-action { background: #eef2ff; color: #4f46e5; border: none; padding: 0.3rem 0.65rem; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 600; }
.btn-email-action:hover { background: #e0e7ff; }
.btn-email-action:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-log-action { background: var(--border-light); color: var(--text-body); border: none; padding: 0.3rem 0.65rem; border-radius: 6px; cursor: pointer; font-size: 0.78rem; font-weight: 600; }
.btn-log-action:hover { background: var(--border-main); }
.btn-history { background: transparent; color: var(--text-muted); border: 1px solid var(--border-main); padding: 0.3rem 0.65rem; border-radius: 6px; cursor: pointer; font-size: 0.78rem; margin-left: auto; }
.btn-history:hover { color: var(--text-main); border-color: var(--text-main); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal-box { background: var(--bg-card); border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-main); }
.modal-box-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-main); }
.modal-box-header h2 { font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin: 0; }
.modal-close-btn { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--text-muted); padding: 4px 8px; border-radius: 6px; }
.modal-close-btn:hover { background: var(--border-light); color: var(--text-main); }
.modal-box-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; overflow-y: auto; flex: 1; }
.modal-input { width: 100%; padding: 0.65rem 1rem; border: 1.5px solid var(--border-main); border-radius: 10px; font-size: 0.92rem; color: var(--text-main); background: var(--bg-card); font-family: inherit; box-sizing: border-box; }
.modal-input:focus { outline: none; border-color: var(--primary); }
.modal-textarea { width: 100%; padding: 0.65rem 1rem; border: 1.5px solid var(--border-main); border-radius: 10px; font-size: 0.92rem; color: var(--text-main); background: var(--bg-card); font-family: inherit; resize: vertical; box-sizing: border-box; }
.modal-textarea:focus { outline: none; border-color: var(--primary); }
.modal-box-actions { display: flex; gap: 0.75rem; justify-content: flex-end; padding: 1rem 1.5rem; border-top: 1px solid var(--border-main); }

.history-item { padding: 0.6rem 0; border-bottom: 1px solid var(--border-light); }
.history-note { font-size: 0.88rem; color: var(--text-main); font-weight: 500; }
.history-meta { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; gap: 0.5rem; }
.read-badge { background: #dcfce7; color: #16a34a; padding: 1px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600; }

.btn-primary { background: var(--primary); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; font-family: 'Poppins', sans-serif; transition: opacity 0.15s, transform 0.15s; }
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary { background: var(--border-light); color: var(--text-body); border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; font-family: 'Poppins', sans-serif; }
.btn-secondary:hover { background: var(--border-main); }
.btn-delete { background: var(--danger-bg); color: var(--danger-text); border: none; padding: 0.35rem 0.7rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.btn-delete:hover { background: rgba(225, 29, 72, 0.2); }
.loading, .empty { text-align: center; padding: 3rem; color: var(--text-muted); }
</style>