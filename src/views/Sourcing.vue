<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>Sourcing</h1>
        <p class="subtitle">Raw material & input providers</p>
      </div>
      <div class="header-actions">
        <button @click="openFolderForm" class="btn-secondary">
          <Folder :size="13" :stroke-width="1.5" /> {{ showFolderForm ? 'Cancel Folder' : '+ New Folder' }}
        </button>
        <button @click="openAddForm" class="btn-primary">+ Add Provider</button>
      </div>
    </div>

    <!-- Folder create/edit modal -->
    <div v-if="showFolderForm" class="modal-overlay" @click.self="resetFolderForm">
      <div class="modal-box" style="max-width:420px;">
        <div class="modal-box-header">
          <h2>{{ editingFolder ? 'Edit Folder' : 'Create New Folder' }}</h2>
          <button @click="resetFolderForm" class="modal-close-btn">✕</button>
        </div>
        <div class="modal-box-body">
          <input v-model="folderForm.name" placeholder="Folder Name *" class="modal-input" />
        </div>
        <div class="modal-box-actions">
          <button @click="resetFolderForm" class="btn-secondary">Cancel</button>
          <button @click="saveFolder" class="btn-primary">{{ editingFolder ? 'Update Folder' : 'Create Folder' }}</button>
        </div>
      </div>
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
      <select v-model="filterFolder" class="filter-select">
        <option value="">All Folders</option>
        <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
      </select>
      <button v-if="filterType || filterCountry || filterFolder" @click="clearFilters" class="btn-clear">✕ Clear</button>
      <span class="results-count">{{ filteredProviders.length }} provider{{ filteredProviders.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="showForm" class="form-card">
      <h2 class="title">{{ editingId ? 'Edit Provider' : 'New Provider' }}</h2>
      <div class="form-grid">
        <input v-model="form.provider" placeholder="Provider Name *" />
        <select v-model="form.folder_id">
          <option :value="null">No Folder</option>
          <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
        </select>
        <input v-model="form.country" placeholder="Country" />
        <input v-model="form.city" placeholder="City" />
        <div class="contact-name-field">
          <button type="button" @click="primarySelection = 'default'" :class="['btn-primary-star', primarySelection === 'default' ? 'is-primary' : '']" :title="primarySelection === 'default' ? 'Primary contact' : 'Set as primary'">★</button>
          <input v-model="form.contact_name" placeholder="Contact Name" style="flex:1;" />
        </div>
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

      <div class="contacts-section">
        <label class="types-label">Additional Contacts</label>
        <div v-for="c in contacts.filter(c => !c._deleted)" :key="c._localKey" class="contact-row">
          <button @click="primarySelection = c._localKey" :class="['btn-primary-star', primarySelection === c._localKey ? 'is-primary' : '']" :title="primarySelection === c._localKey ? 'Primary contact' : 'Set as primary'">★</button>
          <input v-model="c.name" placeholder="Name" class="contact-input" />
          <input v-model="c.title" placeholder="Title" class="contact-input" />
          <input v-model="c.email" placeholder="Email" class="contact-input" />
          <input v-model="c.phone" placeholder="Phone" class="contact-input" />
          <button @click="removeContact(c)" class="btn-delete-contact" title="Remove">✕</button>
        </div>
        <button @click="addContact" class="btn-add-contact">+ Add Contact</button>
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
    <div v-else-if="filteredFolders.length === 0" class="empty">No providers or folders found.</div>
    <div v-else class="folders-list">
      <div v-for="folder in filteredFolders" :key="folder.id" class="folder-section">
        <div class="folder-header" @click="toggleFolder(folder.id)">
          <div class="folder-info-wrapper">
            <span class="expand-icon">{{ isExpanded(folder.id) ? '▼' : '▶' }}</span>
            <h2 class="folder-title"><Folder :size="15" :stroke-width="1.5" /> {{ folder.name }}
              <span class="empty-badge">{{ folder.providers.length === 0 ? '(Empty)' : `(${folder.providers.length})` }}</span>
            </h2>
          </div>
          <div class="folder-actions" @click.stop v-if="folder.id !== 'no-folder'">
            <button @click="editFolder(folder)" class="btn-edit" title="Edit Folder"><Pencil :size="13" :stroke-width="1.5" /></button>
            <button @click="deleteFolder(folder.id)" class="btn-delete" title="Delete Folder"><Trash2 :size="13" :stroke-width="1.5" /></button>
          </div>
        </div>

        <transition name="slide-fade">
          <div v-show="isExpanded(folder.id)" class="folder-content">
            <div v-if="folder.providers.length > 0" class="cards-grid">
              <div v-for="p in folder.providers" :key="p.id" class="provider-card">
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
                  <div v-if="p.contact_name"><User :size="12" :stroke-width="1.5" /> {{ p.contact_name }}<button @click.stop="quickSetPrimary(p, null)" class="btn-primary-star" :class="{ 'is-primary': !p.primary_contact_id }" :title="!p.primary_contact_id ? 'Primary contact' : 'Set as primary'">★</button></div>
                  <div v-if="p.phone"><Phone :size="12" :stroke-width="1.5" /> {{ p.phone }}</div>
                  <div v-if="p.email">{{ p.email }}</div>
                  <div v-if="p.address"><MapPin :size="12" :stroke-width="1.5" /> {{ p.address }}</div>
                  <div v-if="p.website"><a :href="p.website" target="_blank"><Globe :size="12" :stroke-width="1.5" /> {{ p.website }}</a></div>
                  <template v-if="p.sourcing_contacts?.length">
                    <div class="more-contacts-label"><User :size="12" :stroke-width="1.5" /> More contacts</div>
                    <div v-for="c in p.sourcing_contacts" :key="c.id" class="more-contact-row">
                      <span><strong>{{ c.name }}</strong><button @click.stop="quickSetPrimary(p, c.id)" class="btn-primary-star" :class="{ 'is-primary': p.primary_contact_id === c.id }" :title="p.primary_contact_id === c.id ? 'Primary contact' : 'Set as primary'" style="margin-left:3px;">★</button><span v-if="c.title"> · {{ c.title }}</span></span>
                      <a v-if="c.email" :href="'mailto:'+c.email">{{ c.email }}</a>
                    </div>
                  </template>
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
            <div v-else class="empty-folder-message">No providers in this folder yet.</div>
          </div>
        </transition>
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
import { User, Phone, MapPin, Globe, Pencil, BookOpen, Folder, Trash2 } from 'lucide-vue-next'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const providers = ref([])
const loading = ref(true)
const showForm = ref(false)
const editingId = ref(null)
const emailLogs = ref({})
const contacts = ref([]) // extra contacts during add/edit
const primarySelection = ref('default') // 'default' | sourcing_contacts id | a new contact's _localKey

const folders = ref([])
const showFolderForm = ref(false)
const folderForm = ref({ name: '' })
const editingFolder = ref(false)
const editFolderId = ref(null)
const filterFolder = ref('')
const expandedFolders = ref(new Set(['no-folder']))

const emailModal = ref({ show: false, providerId: null, providerName: '', subject: '', body: '', cc: '', sending: false, error: '' })
const logModal   = ref({ show: false, providerId: null, providerName: '', note: '', date: new Date().toISOString().split('T')[0] })
const historyPopup = ref({ show: false, providerName: '', list: [] })

const filterType = ref('')
const filterCountry = ref('')

const typeOptions = ['Yarns', 'Fabrics', 'Tags', 'Packaging', 'Stickers', 'Trims', 'Leather', 'Printing', 'Dyeing', 'Accessories']

const emptyForm = () => ({
  provider: '', types: [], country: '', city: '',
  contact_name: '', phone: '', email: '',
  address: '', website: '', catalogue_url: '', reliability: 0, notes: '',
  folder_id: null
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
    const matchFolder = !filterFolder.value || p.folder_id === filterFolder.value
    return matchType && matchCountry && matchFolder
  })
})

const filteredFolders = computed(() => {
  const folderMap = {}

  folders.value.forEach(f => {
    folderMap[f.id] = { id: f.id, name: f.name, providers: [] }
  })

  folderMap['no-folder'] = { id: 'no-folder', name: 'No Folder', providers: [] }

  filteredProviders.value.forEach(p => {
    const folderId = p.folder_id || 'no-folder'
    if (folderMap[folderId]) {
      folderMap[folderId].providers.push(p)
    } else {
      folderMap['no-folder'].providers.push(p)
    }
  })

  return Object.values(folderMap)
    .filter(f => f.providers.length > 0 || (!filterType.value && !filterCountry.value))
    .sort((a, b) => {
      if (a.id === 'no-folder') return 1
      if (b.id === 'no-folder') return -1
      return a.name.localeCompare(b.name)
    })
})

function toggleFolder(id) {
  if (expandedFolders.value.has(id)) {
    expandedFolders.value.delete(id)
  } else {
    expandedFolders.value.add(id)
  }
}
function isExpanded(id) {
  return expandedFolders.value.has(id)
}

function clearFilters() {
  filterType.value = ''
  filterCountry.value = ''
  filterFolder.value = ''
}

function openAddForm() {
  editingId.value = null
  form.value = emptyForm()
  contacts.value = []
  primarySelection.value = 'default'
  showForm.value = true
}

function addContact() {
  contacts.value.push({ _localKey: crypto.randomUUID(), name: '', title: '', email: '', phone: '' })
}

function removeContact(c) {
  c._deleted = true
  if (primarySelection.value === c._localKey) primarySelection.value = 'default'
}

async function editProvider(p) {
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
    notes: p.notes || '',
    folder_id: p.folder_id || null
  }
  showForm.value = true
  const { data } = await supabase.from('sourcing_contacts').select('*').eq('sourcing_id', p.id).order('created_at')
  contacts.value = (data || []).map(c => ({ ...c, _localKey: c.id }))
  primarySelection.value = p.primary_contact_id || 'default'
}

function cancelForm() {
  showForm.value = false
  editingId.value = null
  form.value = emptyForm()
  contacts.value = []
  primarySelection.value = 'default'
}

async function fetchProviders() {
  loading.value = true
  // sourcing_contacts!sourcing_id disambiguates the embed: primary_contact_id is a
  // second FK between these two tables, so PostgREST needs to be told which one to follow.
  const { data, error } = await supabase
    .from('sourcing')
    .select('*, sourcing_contacts!sourcing_id(id, name, email, phone, title)')
    .order('provider')
  if (error) {
    console.error('Error fetching sourcing providers:', error)
    alert('Error loading providers: ' + error.message)
  }
  providers.value = data || []
  loading.value = false
  fetchAllLogs()
}

async function fetchFolders() {
  const { data } = await supabase.from('folders').select('*').order('name')
  folders.value = data || []
}

function openFolderForm() {
  if (showFolderForm.value) {
    resetFolderForm()
    return
  }
  resetFolderForm()
  showFolderForm.value = true
}

function resetFolderForm() {
  folderForm.value = { name: '' }
  editingFolder.value = false
  editFolderId.value = null
  showFolderForm.value = false
}

function editFolder(f) {
  folderForm.value.name = f.name
  editFolderId.value = f.id
  editingFolder.value = true
  showFolderForm.value = true
}

async function saveFolder() {
  if (!folderForm.value.name.trim()) return alert('Folder name required')

  if (editingFolder.value) {
    const { error } = await supabase.from('folders').update({ name: folderForm.value.name }).eq('id', editFolderId.value)
    if (error) return alert('Error updating folder: ' + error.message)
  } else {
    const { error } = await supabase.from('folders').insert([{ name: folderForm.value.name }])
    if (error) return alert('Error creating folder: ' + error.message)
  }

  resetFolderForm()
  fetchFolders()
}

async function deleteFolder(folderId) {
  if (!confirm('Are you sure? This will not delete providers, but they will be moved to "No Folder".')) return

  await supabase.from('sourcing').update({ folder_id: null }).eq('folder_id', folderId)
  await supabase.from('folders').delete().eq('id', folderId)

  fetchFolders()
  fetchProviders()
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

  let err = null
  let sourcingId = editingId.value
  if (editingId.value) {
    const { error } = await supabase.from('sourcing').update(payload).eq('id', editingId.value)
    err = error
  } else {
    const { data, error } = await supabase.from('sourcing').insert([payload]).select().single()
    err = error
    sourcingId = data?.id
  }

  if (err) {
    console.error('Error saving provider:', err)
    return alert('Error saving provider: ' + err.message)
  }

  // Sync extra contacts (runs for both create and edit)
  const toDelete = contacts.value.filter(c => c._deleted && c.id)
  const toUpsert = contacts.value.filter(c => !c._deleted)
  if (toDelete.length) await supabase.from('sourcing_contacts').delete().in('id', toDelete.map(c => c.id))
  const resolvedIds = {} // _localKey -> real DB id, only populated for brand-new rows
  for (const c of toUpsert) {
    const contactPayload = { sourcing_id: sourcingId, name: c.name, email: c.email, phone: c.phone, title: c.title }
    if (c.id) {
      await supabase.from('sourcing_contacts').update(contactPayload).eq('id', c.id)
    } else {
      const { data } = await supabase.from('sourcing_contacts').insert([contactPayload]).select().single()
      resolvedIds[c._localKey] = data?.id
    }
  }

  const finalPrimaryId = primarySelection.value === 'default'
    ? null
    : (resolvedIds[primarySelection.value] ?? primarySelection.value)
  await supabase.from('sourcing').update({ primary_contact_id: finalPrimaryId }).eq('id', sourcingId)

  cancelForm()
  fetchProviders()
}

async function quickSetPrimary(p, id) {
  const { error } = await supabase.from('sourcing').update({ primary_contact_id: id }).eq('id', p.id)
  if (error) return alert('Error: ' + error.message)
  p.primary_contact_id = id
}

async function deleteProvider(id) {
  if (!confirm('Delete this provider?')) return
  await supabase.from('sourcing').delete().eq('id', id)
  fetchProviders()
}

onMounted(() => {
  fetchProviders()
  fetchFolders()
})
</script>

<style scoped>
.container { max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.header-actions { display: flex; gap: 0.75rem; }
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
input, textarea, select { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid var(--border-main); border-radius: 10px; font-size: 0.92rem; color: var(--text-main); background: var(--bg-card); font-family: 'Poppins', sans-serif; transition: border-color 0.15s; box-sizing: border-box; }
input:focus, textarea:focus, select:focus { outline: none; border-color: var(--primary); }
textarea { resize: vertical; margin-top: 0.75rem; }
.form-actions { margin-top: 1rem; display: flex; gap: 0.75rem; }
.full-row { grid-column: 1 / -1; }
.contact-name-field { display: flex; align-items: center; gap: 4px; }

.types-section, .reliability-section, .contacts-section { margin-bottom: 1.25rem; }
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

.contact-row { display: grid; grid-template-columns: auto 1fr 1fr 1fr 1fr auto; gap: 0.4rem; margin-bottom: 0.4rem; align-items: center; }
.contact-input { padding: 0.5rem 0.7rem; font-size: 0.85rem; }
.btn-primary-star { background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--border-main); padding: 0; line-height: 1; }
.btn-primary-star.is-primary { color: #f59e0b; }
.btn-primary-star:hover { color: #f59e0b; }
.btn-add-contact { background: rgba(79, 70, 229, 0.1); color: var(--primary); border: none; padding: 0.4rem 0.9rem; border-radius: 8px; cursor: pointer; font-size: 0.82rem; font-weight: 600; }
.btn-add-contact:hover { background: rgba(79, 70, 229, 0.15); }
.btn-delete-contact { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 0.9rem; padding: 0 0.3rem; }
.btn-delete-contact:hover { color: #fb7185; }

.folders-list { display: flex; flex-direction: column; }
.folder-section { margin-bottom: 1.5rem; border-radius: 16px; overflow: hidden; background: var(--bg-card); border: 1px solid var(--border-main); box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
.folder-header { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem 1.5rem; background: var(--bg-app); cursor: pointer; transition: background 0.2s; user-select: none; }
.folder-header:hover { background: var(--border-light); }
.folder-info-wrapper { display: flex; align-items: center; gap: 12px; }
.expand-icon { font-size: 0.8rem; color: var(--text-muted); width: 20px; text-align: center; transition: transform 0.3s; }
.folder-title { font-size: 1.1rem; font-weight: 700; margin: 0; color: var(--text-main); display: flex; align-items: center; }
.empty-badge { font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 0.5rem; }
.folder-actions { display: flex; gap: 0.4rem; }
.folder-content { padding: 1.5rem; border-top: 1px solid var(--border-main); background: var(--bg-card); }
.empty-folder-message { padding: 1rem 0; color: var(--text-muted); font-style: italic; font-size: 0.85rem; }

.slide-fade-enter-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateY(-10px); opacity: 0; }

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
.more-contacts-label { margin-top: 4px; font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; display: flex; align-items: center; gap: 0.3rem; }
.more-contact-row { padding-left: 16px; display: flex; flex-direction: column; gap: 1px; font-size: 0.78rem; }
.more-contact-row a { font-size: 0.75rem; }

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
