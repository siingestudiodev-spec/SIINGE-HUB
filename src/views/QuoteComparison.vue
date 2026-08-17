<template>
  <div class="container">
    <div class="header">
      <div>
        <router-link to="/projects" class="back">← Back to Projects</router-link>
        <h1>{{ projectName }}</h1>
        <p class="subtitle" v-if="clientName"><User :size="13" :stroke-width="1.5" /> {{ clientName }}</p>
      </div>
      <div class="header-actions">
        <button v-if="quotes.length > 0" @click="openTemplateModal" class="btn-export">📋 BUILD TEMPLATE</button>
        <button @click="exportExcel" class="btn-export" v-if="quotes.length > 0">⬇ EXPORT EXCEL</button>
        <button @click="showPicker = true" class="btn-primary">+ ADD MANUFACTURER</button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading quotes...</div>
    <div v-else-if="groupedQuotes.length === 0" class="empty">No manufacturers added yet. Click "+ ADD MANUFACTURER" to start building your quote comparison.</div>

    <div v-else class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>MATERIAL / OPTION</th>
            <th>PRICING TIERS (MOQ ➔ Price)</th>
            <th>Sample Cost</th>
            <th>Sample Time</th>
            <th>Bulk Time</th>
            <th>Notes</th>
            <th>Requested / Received</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>

        <tbody v-for="group in groupedQuotes" :key="group.manufacturer.id" class="factory-group" :class="{ 'is-discarded': group.discarded }">
          <!-- Manufacturer header -->
          <tr class="factory-group-header">
            <td colspan="8">
              <div class="factory-header-cell">
                <button @click="toggleQuotes(group.manufacturer.id)" class="btn-collapse" :title="isQuotesOpen(group.manufacturer.id) ? 'Collapse quotes' : 'Expand quotes'">
                  <span class="collapse-arrow" :class="{ open: isQuotesOpen(group.manufacturer.id) }">▶</span>
                </button>
                <div class="factory-avatar">{{ group.manufacturer.company_name?.charAt(0) }}</div>
                <div>
                  <span @click="toggleInfo(group.manufacturer.id)" class="factory-name factory-name-toggle" title="Show manufacturer info">{{ group.manufacturer.company_name }}</span>
                  <a :href="`/manufacturers?focus=${group.manufacturer.id}`" target="_blank" rel="noopener" class="factory-open-link" title="Open in Manufacturers (new tab)">↗</a>
                  <span v-if="group.manufacturer.nickname" class="nickname-chip" title="Nickname used with clients">{{ group.manufacturer.nickname }}</span>
                  <span class="factory-country"><Globe :size="12" :stroke-width="1.5" /> {{ group.manufacturer.country || 'Unknown' }}</span>
                  <span v-if="!isQuotesOpen(group.manufacturer.id) && group.items.length > 0" class="quote-count-chip">{{ group.items.length }} option{{ group.items.length !== 1 ? 's' : '' }}</span>
                  <span v-if="group.discarded" class="discarded-badge">Discarded</span>
                  <div v-if="group.discarded && group.discardedReason" class="discarded-reason">{{ group.discardedReason }}</div>
                </div>
                <div class="factory-header-right">
                  <span v-if="group.manufacturer.nda_signed" class="legal-chip nda">NDA ✓</span>
                  <span v-if="group.manufacturer.mma_signed" class="legal-chip mma">MMA ✓</span>
                  <button @click="openInlineForm(group.manufacturer.id)" class="btn-add-variant">+ Add Option</button>
                  <button v-if="group.items.length > 0" @click="toggleDiscard(group.manufacturer.id, group.discarded)" class="btn-discard" :title="group.discarded ? 'Bring back into consideration' : 'Not moving forward with this manufacturer'">
                    {{ group.discarded ? '↺ Restore' : '✕ Discard' }}
                  </button>
                  <button v-if="group.items.length === 0" @click="removeManufacturer(group.manufacturer.id)" class="btn-remove-mfg" title="Remove">✕</button>
                </div>
              </div>
            </td>
          </tr>

          <!-- Manufacturer info (collapsed by default, opens on the name) -->
          <tr v-if="isInfoOpen(group.manufacturer.id)" class="factory-info-row">
            <td colspan="8">
              <div class="factory-info-grid">
                <div v-if="group.manufacturer.city || group.manufacturer.country"><span class="fi-label">Location</span>{{ [group.manufacturer.city, group.manufacturer.country].filter(Boolean).join(', ') }}</div>
                <div v-if="group.manufacturer.contact_name"><span class="fi-label">Contact</span>{{ group.manufacturer.contact_name }}</div>
                <div v-if="group.manufacturer.email"><span class="fi-label">Email</span><a :href="`mailto:${group.manufacturer.email}`">{{ group.manufacturer.email }}</a></div>
                <div v-if="group.manufacturer.phone"><span class="fi-label">Phone</span>{{ group.manufacturer.phone }}</div>
                <div v-if="group.manufacturer.website"><span class="fi-label">Website</span><a :href="group.manufacturer.website" target="_blank" rel="noopener">{{ group.manufacturer.website }} ↗</a></div>
                <div v-if="group.manufacturer.catalog_url"><span class="fi-label">Catalogue</span><a :href="group.manufacturer.catalog_url" target="_blank" rel="noopener">Open ↗</a></div>
                <div v-if="group.manufacturer.product_categories" class="fi-wide"><span class="fi-label">Categories</span>{{ group.manufacturer.product_categories }}</div>
                <div v-if="group.manufacturer.certifications" class="fi-wide"><span class="fi-label">Certifications</span>{{ group.manufacturer.certifications }}</div>
                <div v-if="group.manufacturer.notes" class="fi-wide"><span class="fi-label">Notes</span><span class="fi-notes">{{ group.manufacturer.notes }}</span></div>
              </div>
            </td>
          </tr>

          <!-- Inline NEW quote form (appears right after header) -->
          <tr v-if="activeForm?.manufacturerId === group.manufacturer.id && !activeForm.editingId" class="inline-form-row">
            <td colspan="8">
              <div class="inline-form">
                <div class="inline-form-grid">
                  <div class="input-field">
                    <label>Material / Option *</label>
                    <input v-model="activeForm.data.material_comp" placeholder="e.g. 100% Cotton, Recycled Poly..." />
                  </div>
                  <div class="input-field">
                    <label>Specialty / Process</label>
                    <input v-model="activeForm.data.specialty" placeholder="e.g. Screen print, Embroidery..." />
                  </div>
                  <div class="input-field">
                    <label>Sample Cost (USD)</label>
                    <input v-model.number="activeForm.data.sample_cost" type="number" step="0.01" />
                  </div>
                  <div class="input-field">
                    <label>Sample Lead Time</label>
                    <input v-model="activeForm.data.sample_lead_time" placeholder="e.g. 3-5 weeks" />
                  </div>
                  <div class="input-field">
                    <label>Bulk Lead Time</label>
                    <input v-model="activeForm.data.bulk_lead_time" placeholder="e.g. 6-8 weeks" />
                  </div>
                  <div class="input-field">
                    <label>Notes</label>
                    <input v-model="activeForm.data.notes" placeholder="Additional details..." />
                  </div>
                  <div class="input-field">
                    <label>Date Requested</label>
                    <input type="date" v-model="activeForm.data.requested_at" />
                  </div>
                  <div class="input-field">
                    <label>Date Received</label>
                    <input type="date" v-model="activeForm.data.received_at" />
                  </div>
                </div>
                <div class="tiers-section mt-3">
                  <label class="section-label">Pricing Tiers (MOQ & Price)</label>
                  <div class="tiers-list">
                    <div v-for="(tier, i) in activeForm.data.pricing_tiers" :key="i" class="tier-row">
                      <div class="tier-input-group">
                        <span class="tier-prefix">MOQ:</span>
                        <input v-model="tier.moq" placeholder="e.g. 100" />
                      </div>
                      <div class="tier-icon">➔</div>
                      <div class="tier-input-group">
                        <span class="tier-prefix">Price:</span>
                        <input v-model="tier.price" placeholder="e.g. $5.00" />
                      </div>
                      <button @click="removeTier(i)" class="btn-remove-tier" v-if="activeForm.data.pricing_tiers.length > 1">✕</button>
                    </div>
                  </div>
                  <button @click="addTier" class="btn-add-tier">+ Add Tier</button>
                </div>
                <div class="inline-form-actions mt-3">
                  <button @click="activeForm = null" class="btn-export">Cancel</button>
                  <button @click="saveInlineForm" class="btn-primary" :disabled="saving">{{ saving ? 'Saving...' : 'Save Option' }}</button>
                </div>
              </div>
            </td>
          </tr>

          <!-- Empty group hint -->
          <tr v-if="group.items.length === 0 && activeForm?.manufacturerId !== group.manufacturer.id" class="empty-group-row">
            <td colspan="8" class="empty-group-cell">No options yet — click "+ Add Option" to start</td>
          </tr>

          <!-- Quote rows + inline edit form -->
          <template v-if="isQuotesOpen(group.manufacturer.id)">
          <template v-for="q in group.items" :key="q.id">
            <tr class="variant-row">
              <td class="indent-cell">
                <span class="variant-icon">↳</span>
                <strong>{{ q.material_comp || q.item_description || 'Standard Option' }}</strong>
                <div v-if="q.specialty" class="text-xs text-gray-400 mt-1 ml-4">{{ q.specialty }}</div>
              </td>
              <td>
                <div class="tiers-display">
                  <template v-if="q.pricing_tiers && q.pricing_tiers.length > 0">
                    <div v-for="(t, i) in q.pricing_tiers" :key="i" class="tier-pill">
                      <span class="t-moq">{{ t.moq }} u</span>
                      <span class="t-price">{{ t.price }}</span>
                    </div>
                  </template>
                  <template v-else>
                    <div class="tier-pill">
                      <span class="t-moq">{{ q.moq_per_color || '?' }} u</span>
                      <span class="t-price">{{ q.price_range || '?' }}</span>
                    </div>
                  </template>
                </div>
              </td>
              <td>{{ q.sample_cost ? '$' + q.sample_cost.toFixed(2) : '—' }}</td>
              <td>{{ formatWeeks(q.sample_lead_time_display) }}</td>
              <td>{{ formatWeeks(q.bulk_lead_time_display) }}</td>
              <td class="notes-cell">{{ q.notes || '—' }}</td>
              <td class="date-cell">
                <div>Req: {{ formatQuoteDate(q.requested_at) }}</div>
                <div>Recv: {{ formatQuoteDate(q.received_at) }}</div>
              </td>
              <td class="text-right">
                <div class="table-actions">
                  <button @click="openInlineForm(group.manufacturer.id, q)" class="btn-icon btn-edit-icon" title="Edit"><Pencil :size="13" :stroke-width="1.5" /></button>
                  <button @click="confirmDelete(q.id)" class="btn-icon btn-delete-icon" title="Delete"><Trash2 :size="13" :stroke-width="1.5" /></button>
                </div>
              </td>
            </tr>

            <!-- Inline EDIT form (appears right after the quote being edited) -->
            <tr v-if="activeForm?.manufacturerId === group.manufacturer.id && activeForm.editingId === q.id" class="inline-form-row">
              <td colspan="8">
                <div class="inline-form">
                  <div class="inline-form-grid">
                    <div class="input-field">
                      <label>Material / Option *</label>
                      <input v-model="activeForm.data.material_comp" placeholder="e.g. 100% Cotton, Recycled Poly..." />
                    </div>
                    <div class="input-field">
                      <label>Specialty / Process</label>
                      <input v-model="activeForm.data.specialty" placeholder="e.g. Screen print, Embroidery..." />
                    </div>
                    <div class="input-field">
                      <label>Sample Cost (USD)</label>
                      <input v-model.number="activeForm.data.sample_cost" type="number" step="0.01" />
                    </div>
                    <div class="input-field">
                      <label>Sample Lead Time</label>
                      <input v-model="activeForm.data.sample_lead_time" placeholder="e.g. 3-5 weeks" />
                    </div>
                    <div class="input-field">
                      <label>Bulk Lead Time</label>
                      <input v-model="activeForm.data.bulk_lead_time" placeholder="e.g. 6-8 weeks" />
                    </div>
                    <div class="input-field">
                      <label>Notes</label>
                      <input v-model="activeForm.data.notes" placeholder="Additional details..." />
                    </div>
                  </div>
                  <div class="tiers-section mt-3">
                    <label class="section-label">Pricing Tiers</label>
                    <div class="tiers-list">
                      <div v-for="(tier, i) in activeForm.data.pricing_tiers" :key="i" class="tier-row">
                        <div class="tier-input-group">
                          <span class="tier-prefix">MOQ:</span>
                          <input v-model="tier.moq" placeholder="e.g. 100" />
                        </div>
                        <div class="tier-icon">➔</div>
                        <div class="tier-input-group">
                          <span class="tier-prefix">Price:</span>
                          <input v-model="tier.price" placeholder="e.g. $5.00" />
                        </div>
                        <button @click="removeTier(i)" class="btn-remove-tier" v-if="activeForm.data.pricing_tiers.length > 1">✕</button>
                      </div>
                    </div>
                    <button @click="addTier" class="btn-add-tier">+ Add Tier</button>
                  </div>
                  <div class="inline-form-actions mt-3">
                    <button @click="activeForm = null" class="btn-export">Cancel</button>
                    <button @click="saveInlineForm" class="btn-primary" :disabled="saving">{{ saving ? 'Saving...' : 'Update Option' }}</button>
                  </div>
                </div>
              </td>
            </tr>
          </template>
          </template>
        </tbody>
      </table>
    </div>

    <!-- MANUFACTURER PICKER MODAL -->
    <div v-if="showPicker" class="modal-overlay" @click.self="closePicker">
      <div class="picker-modal">
        <div class="picker-header">
          <h2>Add Manufacturer</h2>
          <button @click="closePicker" class="modal-close">✕</button>
        </div>
        <div class="picker-search">
          <input v-model="pickerSearch" placeholder="Search by name or country..." autofocus />
        </div>
        <div class="picker-list">
          <div
            v-for="m in filteredPickerManufacturers"
            :key="m.id"
            class="picker-item"
            :class="{ 'already-added': isAlreadyInView(m.id) }"
            @click="!isAlreadyInView(m.id) && addManufacturerToView(m)"
          >
            <div class="picker-avatar">{{ m.company_name?.charAt(0) }}</div>
            <div class="picker-info">
              <strong>{{ m.company_name }}</strong>
              <span class="picker-country"><Globe :size="11" :stroke-width="1.5" /> {{ m.country || '—' }}</span>
            </div>
            <div class="picker-chips">
              <span v-if="m.nda_signed" class="legal-chip nda">NDA</span>
              <span v-if="m.mma_signed" class="legal-chip mma">MMA</span>
              <span v-if="isAlreadyInView(m.id)" class="added-chip">Added ✓</span>
            </div>
          </div>
          <div v-if="filteredPickerManufacturers.length === 0" class="picker-empty">No manufacturers found</div>
        </div>
      </div>
    </div>

    <!-- CLIENT TEMPLATE -->
    <div v-if="showTemplateModal" class="modal-overlay" @click.self="showTemplateModal = false">
      <div class="picker-modal" style="max-width:640px;">

        <!-- Step 1: pick which options go into the template -->
        <template v-if="templateStep === 'pick'">
          <div class="picker-header">
            <h2>Build Client Template</h2>
            <button @click="showTemplateModal = false" class="modal-close">✕</button>
          </div>
          <p style="padding:0.75rem 1.25rem 0;margin:0;font-size:0.8rem;color:var(--text-muted);">
            Click a manufacturer to see their options, then check the ones to include.
          </p>
          <div class="picker-list">
            <div v-for="group in groupedQuotes.filter(g => g.items.length > 0)" :key="group.manufacturer.id">
              <div class="template-manu-row" @click="toggleTemplateExpanded(group.manufacturer.id)">
                <span class="collapse-arrow" :class="{ open: templateExpanded.has(group.manufacturer.id) }">▶</span>
                <strong>{{ group.manufacturer.nickname || group.manufacturer.company_name }}</strong>
                <span class="factory-country">{{ group.manufacturer.country || '' }}</span>
                <span class="quote-count-chip">{{ group.items.filter(q => selectedForTemplate.has(q.id)).length }}/{{ group.items.length }} selected</span>
              </div>
              <label v-if="templateExpanded.has(group.manufacturer.id)" v-for="q in group.items" :key="q.id" class="template-option-row">
                <span class="template-option-check"><input type="checkbox" :checked="selectedForTemplate.has(q.id)" @change="toggleTemplateSelect(q.id)" /></span>
                <span class="template-option-label">{{ q.material_comp || q.item_description || 'Standard Option' }}<template v-if="q.specialty"> — {{ q.specialty }}</template> · {{ q.pricing_tiers?.[0]?.price || q.price_range || '—' }}</span>
              </label>
            </div>
            <div v-if="groupedQuotes.filter(g => g.items.length > 0).length === 0" class="picker-empty">No quotes to pick from yet.</div>
          </div>
          <div class="inline-form-actions" style="padding:1rem 1.25rem 1.25rem;">
            <button @click="showTemplateModal = false" class="btn-export">Cancel</button>
            <button @click="generateTemplate" class="btn-primary" :disabled="selectedForTemplate.size === 0">Generate Template ({{ selectedForTemplate.size }})</button>
          </div>
        </template>

        <!-- Step 2: edit the generated text and copy it -->
        <template v-else>
          <div class="picker-header">
            <h2>Client Template</h2>
            <button @click="showTemplateModal = false" class="modal-close">✕</button>
          </div>
          <p style="padding:0.75rem 1.25rem 0;margin:0;font-size:0.8rem;color:var(--text-muted);">
            Nicknames used in place of manufacturer names, and two weeks added to every lead time as cushion. Edit freely before copying — this doesn't save anywhere.
          </p>
          <div style="padding:1rem 1.25rem;">
            <textarea v-model="templateText" class="template-textarea"></textarea>
          </div>
          <div class="inline-form-actions" style="padding:0 1.25rem 1.25rem;">
            <button @click="templateStep = 'pick'" class="btn-export">← Back to selection</button>
            <button @click="copyTemplate" class="btn-primary">Copy to Clipboard</button>
          </div>
        </template>

      </div>
    </div>

    <!-- NOTIFICATION -->
    <div v-if="notification.show" class="notification-overlay">
      <div class="notification-card" :class="notification.type">
        <div class="notif-icon">{{ notification.type === 'success' ? '✅' : '⚠️' }}</div>
        <div class="notif-content"><p>{{ notification.message }}</p></div>
        <button @click="notification.show = false" class="btn-notif-close">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { User, Globe, Pencil, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const projectId = route.params.id
const quotes = ref([])
const manufacturers = ref([])
const loading = ref(true)
const saving = ref(false)
const projectName = ref('')
const clientName = ref('')
const notification = ref({ show: false, message: '', type: 'success' })
const supportsLeadTimeText = ref(false)
const supportsQuoteTimeline = ref(false)

// ponytail: local state only — clears on refresh, add DB persistence if needed
const includedManufacturers = ref([])
const showPicker = ref(false)
const pickerSearch = ref('')
const activeForm = ref(null) // { manufacturerId, editingId, data }

// Both start collapsed: an empty Set means nothing is open. Quote rows and the
// manufacturer info panel toggle independently.
const openQuotes = ref(new Set())
const openInfo = ref(new Set())
const selectedForTemplate = ref(new Set())
const showTemplateModal = ref(false)
const templateStep = ref('pick') // 'pick' | 'edit'
const templateExpanded = ref(new Set())
const templateText = ref('')

const isQuotesOpen = (id) => openQuotes.value.has(id)
const isInfoOpen = (id) => openInfo.value.has(id)

function toggleSet(setRef, id) {
  const next = new Set(setRef.value)
  next.has(id) ? next.delete(id) : next.add(id)
  setRef.value = next
}
const toggleQuotes = (id) => toggleSet(openQuotes, id)
const toggleInfo = (id) => toggleSet(openInfo, id)

function emptyFormData() {
  return { material_comp: '', sample_cost: null, sample_lead_time: '', bulk_lead_time: '', specialty: '', notes: '', requested_at: '', received_at: '', pricing_tiers: [{ moq: '', price: '' }] }
}

const groupedQuotes = computed(() => {
  const groups = {}
  includedManufacturers.value.forEach(mfg => { groups[mfg.id] = { manufacturer: mfg, items: [] } })
  quotes.value.forEach(q => {
    const mId = q.manufacturer_id || 'unknown'
    if (!groups[mId]) groups[mId] = { manufacturer: q.manufacturers || { id: mId, company_name: 'Unknown', country: '' }, items: [] }
    groups[mId].items.push(q)
  })
  const list = Object.values(groups).map(g => ({
    ...g,
    // Discarded (and its reason) is set on every row of the manufacturer together, so any row reflects it.
    discarded: g.items.length > 0 && g.items[0].discarded,
    discardedReason: g.items.length > 0 ? g.items[0].discarded_reason : null,
  }))
  // Discarded manufacturers sink to the bottom; alphabetical within each group.
  return list.sort((a, b) => {
    if (a.discarded !== b.discarded) return a.discarded ? 1 : -1
    return (a.manufacturer.company_name?.toLowerCase() || '').localeCompare(b.manufacturer.company_name?.toLowerCase() || '')
  })
})

const filteredPickerManufacturers = computed(() => {
  const s = pickerSearch.value.toLowerCase()
  return manufacturers.value.filter(m => !s || m.company_name.toLowerCase().includes(s) || m.country?.toLowerCase().includes(s))
})

function isAlreadyInView(mfgId) {
  return includedManufacturers.value.some(m => m.id === mfgId) || quotes.value.some(q => q.manufacturer_id === mfgId)
}

function addManufacturerToView(mfg) {
  if (!isAlreadyInView(mfg.id)) includedManufacturers.value.push(mfg)
  closePicker()
  openInlineForm(mfg.id)
}

function closePicker() {
  showPicker.value = false
  pickerSearch.value = ''
}

function openInlineForm(manufacturerId, quoteToEdit = null) {
  // The edit form lives among the quote rows, so a collapsed group has to open
  // or the form the user just asked for would be hidden.
  if (!openQuotes.value.has(manufacturerId)) toggleQuotes(manufacturerId)
  if (quoteToEdit) {
    const tiers = quoteToEdit.pricing_tiers?.length > 0
      ? [...quoteToEdit.pricing_tiers]
      : [{ moq: quoteToEdit.moq_per_color || '', price: quoteToEdit.price_range || '' }]
    activeForm.value = {
      manufacturerId,
      editingId: quoteToEdit.id,
      data: {
        material_comp: quoteToEdit.material_comp || quoteToEdit.item_description || '',
        sample_cost: quoteToEdit.sample_cost,
        sample_lead_time: quoteToEdit.sample_lead_time_display || '',
        bulk_lead_time: quoteToEdit.bulk_lead_time_display || '',
        specialty: quoteToEdit.specialty || '',
        notes: quoteToEdit.notes || '',
        requested_at: quoteToEdit.requested_at || '',
        received_at: quoteToEdit.received_at || '',
        pricing_tiers: tiers
      }
    }
  } else {
    if (activeForm.value?.manufacturerId === manufacturerId && !activeForm.value.editingId) {
      activeForm.value = null
      return
    }
    activeForm.value = { manufacturerId, editingId: null, data: emptyFormData() }
  }
}

function removeManufacturer(mfgId) {
  includedManufacturers.value = includedManufacturers.value.filter(m => m.id !== mfgId)
  if (activeForm.value?.manufacturerId === mfgId) activeForm.value = null
}

async function toggleDiscard(mfgId, currentlyDiscarded) {
  let reason = null
  if (!currentlyDiscarded) {
    reason = window.prompt('Reason for discarding this manufacturer (optional):') || null
  }
  const { error } = await supabase.from('quotes')
    .update({ discarded: !currentlyDiscarded, discarded_reason: reason })
    .eq('project_id', projectId)
    .eq('manufacturer_id', mfgId)
  if (error) return showMsg('Error updating quote: ' + error.message, 'error')
  quotes.value = quotes.value.map(q => q.manufacturer_id === mfgId ? { ...q, discarded: !currentlyDiscarded, discarded_reason: reason } : q)
}

function addTier() { activeForm.value.data.pricing_tiers.push({ moq: '', price: '' }) }
function removeTier(i) {
  if (activeForm.value.data.pricing_tiers.length > 1) activeForm.value.data.pricing_tiers.splice(i, 1)
}

function showMsg(msg, type = 'success') {
  notification.value = { show: true, message: msg, type }
  if (type === 'success') setTimeout(() => notification.value.show = false, 3000)
}

function parseLeadTime(value) {
  if (value == null) return null
  const raw = value.toString().trim()
  if (!raw) return null
  if (raw.includes('-')) {
    const parts = raw.split('-').map(p => Number(p.trim())).filter(n => !isNaN(n))
    return parts.length > 0 ? Math.min(...parts) : null
  }
  const n = Number(raw)
  return isNaN(n) ? null : Math.floor(n)
}

function formatQuoteDate(iso) {
  if (!iso) return '—'
  // requested_at/received_at are date-only ('YYYY-MM-DD'); parsing that as UTC and
  // displaying in a timezone behind UTC (Bogotá, Denver) can print the day before.
  // Parse the pieces as local instead — same fix as the shipment delivery date.
  const datePart = iso.toString().slice(0, 10)
  const [y, m, d] = datePart.split('-').map(Number)
  if (!y || !m || !d) return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatWeeks(value) {
  if (value == null || value === '') return '—'
  const raw = value.toString().trim()
  if (!raw) return '—'
  if (raw.includes('-') || isNaN(Number(raw))) return `${raw} weeks`
  return `${Number(raw)} weeks`
}

const toggleTemplateSelect = (id) => toggleSet(selectedForTemplate, id)

// Sierra's cushion rule: pad every quoted lead time by 2 weeks before it goes to a
// client. Handles "X", "X-Y" and a trailing unit (defaults to weeks, honors "days").
// ponytail: numbers-only text is all this needs to catch; anything it can't parse
// (e.g. "TBD", "ask again") is left untouched rather than guessed at — it's an
// editable preview, not the final copy, so an unpadded line is easy for Sierra to
// catch and fix by hand rather than something silently wrong.
function addTwoWeeks(raw) {
  if (raw == null || raw === '') return raw
  const text = raw.toString().trim()
  const m = text.match(/^(\d+)\s*(?:-\s*(\d+))?\s*(day|days|week|weeks)?$/i)
  if (!m) return text
  const unit = /day/i.test(m[3] || '') ? 'days' : 'weeks'
  const pad = unit === 'days' ? 14 : 2
  const lo = Number(m[1]) + pad
  const hi = m[2] ? Number(m[2]) + pad : null
  return hi ? `${lo}-${hi} ${unit}` : `${lo} ${unit}`
}

// One block per manufacturer, not per item — a shared header, then every selected
// option on its own line, then a single Sample/Bulk Time for the group.
// ponytail: doesn't try to merge options that share a composition into one summary
// line — the form only ever captures Material/Option + Specialty per row, there is
// no separate "which garment piece" field to group by, so guessing would either
// duplicate the composition text or misattribute a specialty. Each line states
// exactly what that row says; if two options really are the same fabric for two
// pieces, Sierra can merge them by hand in the editable box.
function buildTemplateText() {
  const blocks = []
  groupedQuotes.value.forEach(group => {
    const items = group.items.filter(q => selectedForTemplate.value.has(q.id))
    if (items.length === 0) return

    const label = group.manufacturer.nickname || group.manufacturer.company_name
    const location = group.manufacturer.city || group.manufacturer.country
    const lines = [`Manu - ${label}${location ? ' - ' + location : ''}`, '']

    const tierMoq = items.map(q => q.pricing_tiers?.[0]?.moq).find(Boolean)
    const perColorMoq = items.map(q => q.moq_per_color).find(Boolean)
    if (tierMoq) lines.push(`Minimum is ${tierMoq} units.`, '')
    else if (perColorMoq) lines.push(`Minimum is ${perColorMoq} units per color.`, '')

    items.forEach(q => {
      const desc = q.material_comp || q.item_description || 'Item'
      const label = q.specialty ? `${desc} — ${q.specialty}` : desc
      const price = q.pricing_tiers?.[0]?.price || q.price_range || '—'
      lines.push(`${label} - ${price}${q.sample_cost ? ` (sample cost $${q.sample_cost})` : ''}`)
    })
    lines.push('')

    const sampleTime = items.map(q => q.sample_lead_time_display).find(Boolean)
    const bulkTime = items.map(q => q.bulk_lead_time_display).find(Boolean)
    lines.push(`Sample Time ${addTwoWeeks(sampleTime) || '—'}`)
    lines.push(`Bulk Order Time ${addTwoWeeks(bulkTime) || '—'}`)

    const terms = items.map(q => q.notes).find(Boolean)
    if (terms) lines.push('', `Terms: ${terms}`)

    blocks.push(lines.join('\n'))
  })
  return blocks.join('\n\n\n')
}

const toggleTemplateExpanded = (id) => toggleSet(templateExpanded, id)

function openTemplateModal() {
  templateStep.value = 'pick'
  showTemplateModal.value = true
}

function generateTemplate() {
  templateText.value = buildTemplateText()
  templateStep.value = 'edit'
}

async function copyTemplate() {
  try {
    await navigator.clipboard.writeText(templateText.value)
    showMsg('Copied to clipboard')
  } catch (e) {
    showMsg('Could not copy — select and copy manually', 'error')
  }
}

async function fetchData() {
  loading.value = true
  try {
    const [{ data: project }, { data: q, error: qErr }, { data: m, error: mErr }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('quotes').select('*').eq('project_id', projectId).order('created_at', { ascending: true }),
      supabase.from('manufacturers').select('id, company_name, nickname, country, city, contact_name, email, phone, website, catalog_url, product_categories, certifications, notes, nda_signed, mma_signed').order('company_name')
    ])

    if (project) {
      projectName.value = project.name || project.project_name
      clientName.value = project.client_name
    }
    if (qErr) showMsg('Error loading quotes: ' + qErr.message, 'error')
    // A schema mismatch here (e.g. a column not migrated yet) must not silently blank out
    // every manufacturer name as "Unknown" — surface it instead.
    if (mErr) showMsg('Error loading manufacturers: ' + mErr.message, 'error')

    manufacturers.value = m || []
    const mfgMap = {}
    ;(m || []).forEach(mfg => { mfgMap[mfg.id] = mfg })

    quotes.value = (q || []).map(item => {
      let tiers = item.pricing_tiers
      if (typeof tiers === 'string') { try { tiers = JSON.parse(tiers) } catch { tiers = [] } }
      if (!Array.isArray(tiers)) tiers = []
      return {
        ...item,
        pricing_tiers: tiers,
        manufacturers: mfgMap[item.manufacturer_id] || null,
        sample_lead_time_display: item.sample_lead_time_text || (item.sample_lead_time != null ? item.sample_lead_time.toString() : ''),
        bulk_lead_time_display: item.bulk_lead_time_text || (item.bulk_lead_time != null ? item.bulk_lead_time.toString() : '')
      }
    })
    supportsLeadTimeText.value = q?.length > 0 && 'sample_lead_time_text' in q[0]
    supportsQuoteTimeline.value = q?.length > 0 && 'requested_at' in q[0]

    // Remove from includedManufacturers those that now have quotes (they'll appear via groupedQuotes)
    const quotedIds = new Set(quotes.value.map(q => q.manufacturer_id))
    includedManufacturers.value = includedManufacturers.value.filter(m => !quotedIds.has(m.id))
  } catch (err) {
    showMsg('Unexpected error: ' + err.message, 'error')
  } finally {
    loading.value = false
  }
}

async function saveInlineForm() {
  if (!activeForm.value) return
  saving.value = true
  try {
    const d = activeForm.value.data
    const validTiers = d.pricing_tiers.filter(t => t.moq || t.price)
    const payload = {
      manufacturer_id: activeForm.value.manufacturerId,
      item_description: d.material_comp || '',
      material_comp: d.material_comp || '',
      sample_cost: d.sample_cost,
      sample_lead_time: parseLeadTime(d.sample_lead_time),
      bulk_lead_time: parseLeadTime(d.bulk_lead_time),
      specialty: d.specialty,
      notes: d.notes,
      project_id: projectId,
      pricing_tiers: validTiers,
      price_range: validTiers[0]?.price || '',
      moq_per_color: validTiers[0]?.moq ? (Number(validTiers[0].moq) || null) : null
    }
    if (supportsLeadTimeText.value) {
      payload.sample_lead_time_text = d.sample_lead_time
      payload.bulk_lead_time_text = d.bulk_lead_time
    }
    // ponytail: same detection pattern as supportsLeadTimeText, same gap — the very
    // first quote saved into a brand-new empty project won't have anywhere to read
    // 'requested_at' from yet, so this stays false for that one save. Re-editing it
    // right after picks the column up correctly. Fix upstream (detect via a schema
    // call, not existing rows) if that first-quote case ever actually bites someone.
    if (supportsQuoteTimeline.value) {
      payload.requested_at = d.requested_at || null
      payload.received_at = d.received_at || null
    }
    if (activeForm.value.editingId) {
      const { error } = await supabase.from('quotes').update(payload).eq('id', activeForm.value.editingId)
      if (error) throw error
      showMsg('Option updated')
    } else {
      const { error } = await supabase.from('quotes').insert([payload])
      if (error) throw error
      showMsg('Option saved')
    }
    // A quote means this manufacturer is being considered for the project, so they
    // belong in the assigned list too. Best-effort: the quote already saved, a
    // hiccup here shouldn't make that look like it failed.
    try {
      await supabase.from('project_manufacturers')
        .upsert({ project_id: projectId, manufacturer_id: activeForm.value.manufacturerId }, { onConflict: 'project_id,manufacturer_id', ignoreDuplicates: true })
    } catch (syncErr) {
      console.error('project_manufacturers sync failed (quote save was not affected):', syncErr)
    }
    activeForm.value = null
    fetchData()
  } catch (err) {
    showMsg(err.message, 'error')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(id) {
  if (confirm('Delete this quote option?')) {
    await supabase.from('quotes').delete().eq('id', id)
    fetchData()
    showMsg('Option deleted')
  }
}

function exportExcel() {
  alert('Export to Excel functionality triggered!')
}

onMounted(fetchData)
</script>

<style scoped>
.container { max-width: 1300px; margin: 0 auto; padding: 2rem 1.5rem; font-family: 'Inter', sans-serif; background: var(--bg-app); color: var(--text-main); }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.back { color: var(--primary); text-decoration: none; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; display: block; }
h1 { font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin: 0; }
.subtitle { color: var(--text-muted); font-size: 0.95rem; margin-top: 0.2rem; }
.header-actions { display: flex; gap: 1rem; }

/* FORM */
.input-field label, .section-label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem; }
input, select, textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1.5px solid var(--border-main); border-radius: 8px; font-size: 0.9rem; transition: border-color 0.2s; background: var(--bg-app); color: var(--text-main); box-sizing: border-box; }
input:focus, select:focus, textarea:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1); }
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }

/* TIERS */
.tiers-section { background: rgba(0,0,0,0.15); border: 1px dashed var(--border-main); padding: 1rem; border-radius: 10px; }
.tiers-list { display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1rem; }
.tier-row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
.tier-input-group { display: flex; align-items: center; background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 8px; overflow: hidden; flex: 1; min-width: 150px; }
.tier-prefix { padding: 0 0.8rem; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; background: rgba(255,255,255,0.05); border-right: 1px solid var(--border-main); height: 100%; display: flex; align-items: center; }
.tier-input-group input { border: none; border-radius: 0; background: transparent; }
.tier-input-group input:focus { box-shadow: none; }
.tier-icon { color: var(--text-muted); font-size: 1.2rem; }
.btn-remove-tier { background: transparent; color: var(--danger-text); border: 1px solid var(--danger-text); border-radius: 6px; width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: 0.2s; }
.btn-remove-tier:hover { background: var(--danger-bg); }
.btn-add-tier { background: rgba(99, 102, 241, 0.1); color: var(--primary); border: 1px dashed var(--primary); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 700; width: max-content; transition: 0.2s; }
.btn-add-tier:hover { background: var(--primary); color: white; }

/* TABLE */
.table-wrapper { background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-main); overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
table { width: 100%; border-collapse: collapse; }
th { background: rgba(0,0,0,0.2); padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border-main); }
td { padding: 1rem; border-bottom: 1px solid var(--border-light); font-size: 0.88rem; vertical-align: middle; color: var(--text-body); }

/* FACTORY GROUP HEADER */
.factory-group-header td { background: rgba(99, 102, 241, 0.03); border-bottom: 1px solid var(--border-light); padding: 1.2rem 1rem; }
.factory-header-cell { display: flex; align-items: center; gap: 1rem; }
.factory-avatar { width: 36px; height: 36px; background: var(--primary); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0; }
.factory-name { font-size: 1.1rem; color: var(--text-main); font-weight: 700; }
.factory-name-link { text-decoration: none; cursor: pointer; display: inline-block; }
.factory-name-link:hover { color: var(--primary); text-decoration: underline; }
.factory-name-toggle { cursor: pointer; display: inline-block; }
.factory-name-toggle:hover { color: var(--primary); text-decoration: underline; }
.factory-open-link { text-decoration: none; color: var(--text-muted); font-size: 0.8rem; margin-left: 0.25rem; }
.factory-open-link:hover { color: var(--primary); }
.btn-collapse { background: transparent; border: none; cursor: pointer; padding: 0.2rem 0.35rem; color: var(--text-muted); display: flex; align-items: center; }
.btn-collapse:hover { color: var(--primary); }
.collapse-arrow { display: inline-block; font-size: 0.7rem; transition: transform 0.15s ease; }
.collapse-arrow.open { transform: rotate(90deg); }
.quote-count-chip { font-size: 0.72rem; color: var(--text-muted); background: var(--bg-app); border: 1px solid var(--border-main); margin-left: 0.5rem; padding: 0.15rem 0.5rem; border-radius: 12px; }
.factory-info-row td { background: var(--bg-app); padding: 0.9rem 1.5rem !important; }
.factory-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 0.6rem 1.5rem; font-size: 0.85rem; color: var(--text-body); }
.factory-info-grid a { color: var(--primary); text-decoration: none; }
.factory-info-grid a:hover { text-decoration: underline; }
.fi-label { display: block; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-muted); margin-bottom: 0.15rem; }
.fi-wide { grid-column: 1 / -1; }
.fi-notes { white-space: pre-wrap; }
.factory-country { font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem; background: var(--bg-app); padding: 0.2rem 0.5rem; border-radius: 12px; border: 1px solid var(--border-main); }
.nickname-chip { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.03em; color: white; background: var(--primary); margin-left: 0.5rem; padding: 0.15rem 0.5rem; border-radius: 12px; }
.discarded-badge { font-size: 0.7rem; font-weight: 700; color: var(--text-muted); background: var(--bg-app); border: 1px solid var(--border-main); margin-left: 0.5rem; padding: 0.15rem 0.5rem; border-radius: 12px; }
.discarded-reason { font-size: 0.78rem; color: var(--text-muted); font-style: italic; margin-top: 0.2rem; }
.btn-discard { background: transparent; border: 1px solid var(--border-main); color: var(--text-muted); padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-discard:hover { background: var(--danger-bg); color: var(--danger-text); border-color: var(--danger-text); }
.factory-group.is-discarded { opacity: 0.5; }
.factory-group.is-discarded:hover { opacity: 0.85; }
.factory-header-right { margin-left: auto; display: flex; align-items: center; gap: 0.5rem; }
.btn-add-variant { background: transparent; border: 1px dashed var(--primary); color: var(--primary); padding: 0.4rem 0.8rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
.btn-add-variant:hover { background: rgba(99, 102, 241, 0.1); }
.btn-remove-mfg { background: transparent; border: 1px solid var(--border-main); color: var(--text-muted); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }
.btn-remove-mfg:hover { background: var(--danger-bg); color: var(--danger-text); border-color: var(--danger-text); }

/* LEGAL CHIPS */
.legal-chip { font-size: 0.65rem; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 800; color: white; letter-spacing: 0.05em; }
.legal-chip.nda { background: #8b5cf6; }
.legal-chip.mma { background: #ec4899; }

/* VARIANT ROWS */
.variant-row { transition: background 0.2s; }
.variant-row:hover { background: rgba(255,255,255,0.02); }
.indent-cell { padding-left: 1.5rem !important; }
.variant-icon { color: var(--text-muted); margin-right: 0.5rem; font-weight: normal; }
.notes-cell { font-style: italic; color: var(--text-muted); max-width: 250px; }
.date-cell { color: var(--text-muted); font-size: 0.78rem; white-space: nowrap; }

/* PRICING TIERS DISPLAY */
.tiers-display { display: flex; flex-direction: column; gap: 0.4rem; }
.tier-pill { display: inline-flex; align-items: center; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 6px; overflow: hidden; width: max-content; font-size: 0.8rem; }
.t-moq { background: rgba(0,0,0,0.1); padding: 0.2rem 0.5rem; font-weight: 600; color: var(--text-muted); border-right: 1px solid rgba(34, 197, 94, 0.3); }
.t-price { padding: 0.2rem 0.6rem; font-weight: 800; color: var(--success-text); }

/* INLINE FORM */
.inline-form-row { background: rgba(99,102,241,0.02); }
.inline-form { padding: 1.5rem; border-top: 2px dashed var(--primary); }
.inline-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem; }
.inline-form-actions { display: flex; justify-content: flex-end; gap: 0.8rem; }

/* EMPTY STATES */
.empty-group-row td { text-align: center; }
.empty-group-cell { color: var(--text-muted); font-style: italic; font-size: 0.85rem; padding: 1rem !important; }

/* ACTIONS */
.table-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
.btn-icon { background: var(--bg-app); border: 1px solid var(--border-main); cursor: pointer; padding: 0.4rem; border-radius: 6px; transition: 0.2s; }
.btn-edit-icon:hover { background: rgba(99,102,241,0.15); border-color: var(--primary); }
.btn-delete-icon:hover { background: rgba(239,68,68,0.12); border-color: var(--danger-text); }

/* MANUFACTURER PICKER MODAL */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.picker-modal { background: var(--bg-card); border-radius: 16px; width: 90%; max-width: 480px; border: 1px solid var(--border-main); box-shadow: 0 20px 25px rgba(0,0,0,0.3); display: flex; flex-direction: column; max-height: 80vh; }
.template-textarea { display: block; width: 100%; min-height: 320px; padding: 1rem; border: 1px solid var(--border-main); border-radius: 10px; background: var(--bg-app); color: var(--text-main); font-family: monospace; font-size: 0.85rem; line-height: 1.5; resize: vertical; box-sizing: border-box; }
.picker-header { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem 1.5rem; border-bottom: 1px solid var(--border-light); flex-shrink: 0; }
.picker-header h2 { margin: 0; font-size: 1.1rem; color: var(--text-main); }
.modal-close { background: var(--bg-app); border: 1px solid var(--border-main); color: var(--text-muted); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; }
.picker-search { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-light); flex-shrink: 0; }
.picker-search input { margin: 0; }
.picker-list { overflow-y: auto; flex: 1; padding: 0.5rem; }
.picker-item { display: flex; align-items: center; gap: 0.8rem; padding: 0.75rem 1rem; border-radius: 10px; cursor: pointer; transition: background 0.15s; }
.template-manu-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.15s; }
.template-manu-row:hover { background: var(--bg-app); }
.template-option-row { display: flex; align-items: flex-start; gap: 0.7rem; padding: 0.55rem 1rem 0.55rem 2.4rem; font-size: 0.85rem; color: var(--text-muted); cursor: pointer; text-align: left; }
.template-option-row:hover { background: var(--bg-app); color: var(--text-main); }
/* The form-wide "input, select, textarea { width: 100% }" rule above is meant for
   text fields; it also stretches this checkbox to fill the row, which is what was
   pushing the label off to the right. Narrow, centered column, reset back down. */
.template-option-check { flex: 0 0 18px; display: flex; justify-content: center; padding-top: 0.15rem; }
.template-option-check input[type="checkbox"] { width: 16px; height: 16px; margin: 0; padding: 0; border: 1.5px solid var(--border-main); border-radius: 4px; }
.template-option-label { flex: 1; line-height: 1.4; text-align: left; }
.picker-item:hover:not(.already-added) { background: rgba(99,102,241,0.08); }
.picker-item.already-added { opacity: 0.55; cursor: default; }
.picker-avatar { width: 36px; height: 36px; background: linear-gradient(135deg, var(--primary), #8b5cf6); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem; flex-shrink: 0; }
.picker-info { flex: 1; min-width: 0; }
.picker-info strong { display: block; font-size: 0.9rem; color: var(--text-main); }
.picker-country { font-size: 0.78rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.3rem; margin-top: 0.1rem; }
.picker-chips { display: flex; gap: 0.3rem; align-items: center; flex-shrink: 0; }
.added-chip { font-size: 0.7rem; color: #22c55e; font-weight: 700; }
.picker-empty { text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.9rem; }

/* NOTIFICATION */
.notification-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(2px); }
.notification-card { background: var(--bg-card); padding: 2rem; border-radius: 16px; width: 300px; text-align: center; border: 1px solid var(--border-main); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
.notif-icon { font-size: 2.5rem; margin-bottom: 1rem; }
.notif-content p { font-weight: 600; color: var(--text-main); margin-bottom: 1.5rem; }
.btn-notif-close { background: var(--bg-app); color: var(--text-main); border: 1px solid var(--border-main); padding: 0.6rem 2rem; border-radius: 8px; font-weight: 700; cursor: pointer; width: 100%; transition: 0.2s; }
.btn-notif-close:hover { background: var(--primary); color: white; border-color: var(--primary); }

/* GLOBAL BUTTONS */
.btn-primary { background: var(--primary); color: white; border: none; padding: 0.7rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
.btn-primary:hover { filter: brightness(1.1); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-export { background: transparent; color: var(--text-main); border: 1px solid var(--border-main); padding: 0.7rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
.btn-export:hover { background: var(--bg-app); }
.loading, .empty { text-align: center; padding: 4rem; color: var(--text-muted); border: 1px dashed var(--border-main); border-radius: 12px; margin-top: 2rem; }
.text-right { text-align: right; }
.ml-4 { margin-left: 1rem; }
.text-xs { font-size: 0.75rem; }
.text-gray-400 { color: var(--text-muted); }
.mt-1 { margin-top: 0.25rem; }
</style>
