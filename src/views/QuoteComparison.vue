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
            <th>ITEM / OPTION</th>
            <th>PRICING TIERS (MOQ ➔ Price)</th>
            <th>Incoterm</th>
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
            <td colspan="9">
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
            <td colspan="9">
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
            <td colspan="9">
              <QuoteForm :data="activeForm.data" :saving="saving" :editing="false"
                         @save="saveInlineForm" @cancel="activeForm = null" @apply-all="applyIncotermToAll" />
            </td>
          </tr>

          <!-- Empty group hint -->
          <tr v-if="group.items.length === 0 && activeForm?.manufacturerId !== group.manufacturer.id" class="empty-group-row">
            <td colspan="9" class="empty-group-cell">No options yet — click "+ Add Option" to start</td>
          </tr>

          <!-- Quote rows + inline edit form -->
          <template v-if="isQuotesOpen(group.manufacturer.id)">
          <template v-for="q in group.items" :key="q.id">
            <tr class="variant-row">
              <td class="indent-cell">
                <span class="variant-icon">↳</span>
                <strong>{{ q.material_comp || q.item_description || 'Standard Option' }}</strong>
                <div v-if="q.composition" class="text-xs text-gray-400 mt-1 ml-4">{{ q.composition }}</div>
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
              <td class="incoterm-cell">
                <span v-if="q.incoterm" class="incoterm-chip">{{ q.incoterm }}</span>
                <span v-else>—</span>
                <div v-if="q.port" class="incoterm-port">{{ q.port }}</div>
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
                  <button @click="toggleSamples(q.id)" class="btn-icon btn-sample-icon" :class="{ 'has-samples': samplesFor(q.id).length > 0 }" :title="`Samples requested for this option (${samplesFor(q.id).length})`">
                    <Package :size="13" :stroke-width="1.5" /><span v-if="samplesFor(q.id).length" class="sample-count">{{ samplesFor(q.id).length }}</span>
                  </button>
                  <button @click="openInlineForm(group.manufacturer.id, q)" class="btn-icon btn-edit-icon" title="Edit"><Pencil :size="13" :stroke-width="1.5" /></button>
                  <button @click="confirmDelete(q.id)" class="btn-icon btn-delete-icon" title="Delete"><Trash2 :size="13" :stroke-width="1.5" /></button>
                </div>
              </td>
            </tr>

            <!-- Samples requested for this specific quoted option -->
            <tr v-if="isSamplesOpen(q.id)" class="samples-row">
              <td colspan="9">
                <div class="samples-block">
                  <div class="samples-title">Samples for “{{ q.material_comp || q.item_description || 'this option' }}”</div>

                  <div v-if="samplesFor(q.id).length === 0" class="samples-empty">No samples requested yet.</div>

                  <div v-for="s in samplesFor(q.id)" :key="s.id" class="sample-line">
                    <span class="sample-dates">
                      Requested {{ formatQuoteDate(s.requested_at) }} → Received {{ formatQuoteDate(sampleReceivedAt(s)) }}
                    </span>
                    <span v-if="s.shipment" class="sample-tracking">
                      <a v-if="getTrackingUrl(s.shipment)" :href="getTrackingUrl(s.shipment)" target="_blank" rel="noopener">
                        {{ s.shipment.carrier || 'Shipment' }} {{ s.shipment.tracking_number }} ↗
                      </a>
                      <span v-else>{{ s.shipment.carrier || 'Shipment' }} {{ s.shipment.tracking_number }}</span>
                      <span v-if="!s.shipment.delivered_at" class="sample-intransit">in transit</span>
                    </span>
                    <span v-else class="sample-no-tracking">no tracking linked</span>
                    <button @click="deleteSample(s.id)" class="btn-icon btn-delete-icon" title="Remove sample"><Trash2 :size="12" :stroke-width="1.5" /></button>
                  </div>

                  <div class="sample-add">
                    <label>Requested<input type="date" v-model="sampleDraft[q.id].requested_at" /></label>
                    <label>Received<input type="date" v-model="sampleDraft[q.id].received_at" :disabled="!!sampleDraft[q.id].shipment_id" :title="sampleDraft[q.id].shipment_id ? 'Comes from the linked shipment' : ''" /></label>
                    <label>Tracking
                      <select v-model="sampleDraft[q.id].shipment_id">
                        <option value="">— none —</option>
                        <option v-for="sh in shipmentsForManufacturer(q.manufacturer_id)" :key="sh.id" :value="sh.id">
                          {{ sh.carrier || 'Shipment' }} {{ sh.tracking_number }}{{ sh.description ? ' · ' + sh.description : '' }}
                        </option>
                      </select>
                    </label>
                    <button @click="addSample(q)" class="btn-add-tier" :disabled="savingSample">+ Add Sample</button>
                  </div>
                </div>
              </td>
            </tr>

            <!-- Inline EDIT form (appears right after the quote being edited) -->
            <tr v-if="activeForm?.manufacturerId === group.manufacturer.id && activeForm.editingId === q.id" class="inline-form-row">
              <td colspan="9">
                <QuoteForm :data="activeForm.data" :saving="saving" :editing="true"
                           @save="saveInlineForm" @cancel="activeForm = null" @apply-all="applyIncotermToAll" />
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
    <!-- Only the ✕ and Esc close the edit step: a stray click on the backdrop used to
         throw away a template someone had been editing for ten minutes. -->
    <div v-if="showTemplateModal" class="modal-overlay" @click.self="templateStep === 'pick' && closeTemplateModal()">
      <div class="picker-modal" style="max-width:640px;">

        <!-- Step 1: pick which options go into the template -->
        <template v-if="templateStep === 'pick'">
          <div class="picker-header">
            <h2>Build Client Template</h2>
            <button @click="closeTemplateModal" class="modal-close">✕</button>
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
            <button @click="closeTemplateModal" class="btn-export">Cancel</button>
            <button @click="generateTemplate" class="btn-primary" :disabled="selectedForTemplate.size === 0">Generate Template ({{ selectedForTemplate.size }})</button>
          </div>
        </template>

        <!-- Step 2: edit the generated text and copy it -->
        <template v-else>
          <div class="picker-header">
            <h2>Client Template</h2>
            <button @click="closeTemplateModal" class="modal-close" title="Close (saves your draft)">✕</button>
          </div>
          <p style="padding:0.75rem 1.25rem 0;margin:0;font-size:0.8rem;color:var(--text-muted);">
            Nicknames used in place of manufacturer names, and two weeks added to every lead time as cushion.
            Closing with ✕ or Esc saves this draft — clicking outside won't discard it.
          </p>
          <div style="padding:1rem 1.25rem;">
            <textarea v-model="templateText" class="template-textarea"></textarea>
          </div>
          <div class="inline-form-actions" style="padding:0 1.25rem 1.25rem;">
            <button @click="discardTemplate" class="btn-export btn-discard-template">Discard draft</button>
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
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { User, Globe, Pencil, Trash2, Package } from 'lucide-vue-next'
import QuoteForm from '../components/QuoteForm.vue'
import { buildTemplateText as buildTemplateTextFrom } from '../lib/quoteTemplate.js'

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
const hasSavedDraft = ref(false)

// Samples requested per quoted option, plus this project's shipments to link them to.
const samples = ref([])
const shipments = ref([])
const openSamples = ref(new Set())
const sampleDraft = ref({})
const savingSample = ref(false)

const isQuotesOpen = (id) => openQuotes.value.has(id)
const isInfoOpen = (id) => openInfo.value.has(id)
const isSamplesOpen = (id) => openSamples.value.has(id)

function toggleSet(setRef, id) {
  const next = new Set(setRef.value)
  next.has(id) ? next.delete(id) : next.add(id)
  setRef.value = next
}
const toggleQuotes = (id) => toggleSet(openQuotes, id)
const toggleInfo = (id) => toggleSet(openInfo, id)
function toggleSamples(quoteId) {
  if (!sampleDraft.value[quoteId]) sampleDraft.value[quoteId] = emptySampleDraft()
  toggleSet(openSamples, quoteId)
}

function emptySampleDraft() {
  return { requested_at: '', received_at: '', shipment_id: '' }
}

function emptyFormData() {
  return { material_comp: '', composition: '', sample_cost: null, sample_lead_time: '', bulk_lead_time: '', specialty: '', notes: '', incoterm: '', port: '', requested_at: '', received_at: '', pricing_tiers: [{ moq: '', price: '' }] }
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
        composition: quoteToEdit.composition || '',
        sample_cost: quoteToEdit.sample_cost,
        sample_lead_time: quoteToEdit.sample_lead_time_display || '',
        bulk_lead_time: quoteToEdit.bulk_lead_time_display || '',
        specialty: quoteToEdit.specialty || '',
        notes: quoteToEdit.notes || '',
        incoterm: quoteToEdit.incoterm || '',
        port: quoteToEdit.port || '',
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

// A factory that quotes several items usually quotes one shipping term for the lot.
// This writes the term the form is showing onto every saved row for that manufacturer,
// so it doesn't have to be retyped option by option.
async function applyIncotermToAll() {
  if (!activeForm.value) return
  const { incoterm, port } = activeForm.value.data
  const mfgId = activeForm.value.manufacturerId
  const { error } = await supabase.from('quotes')
    .update({ incoterm: incoterm || null, port: port || null })
    .eq('project_id', projectId)
    .eq('manufacturer_id', mfgId)
  if (error) return showMsg('Error applying incoterm: ' + error.message, 'error')
  quotes.value = quotes.value.map(q => q.manufacturer_id === mfgId ? { ...q, incoterm: incoterm || null, port: port || null } : q)
  showMsg('Incoterm applied to every option for this manufacturer')
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

// The client-facing text is built by src/lib/quoteTemplate.js — pure functions with a
// runnable check beside them (node src/lib/quoteTemplate.test.js). This only maps the
// on-screen selection into the shape that module expects.
function buildTemplateText() {
  const groups = groupedQuotes.value.map(group => ({
    label: group.manufacturer.nickname || group.manufacturer.company_name,
    location: group.manufacturer.city || group.manufacturer.country,
    items: group.items.filter(q => selectedForTemplate.value.has(q.id)),
  }))
  return buildTemplateTextFrom(groups)
}

const toggleTemplateExpanded = (id) => toggleSet(templateExpanded, id)

// Reopen straight into the saved draft if there is one; otherwise start at selection.
function openTemplateModal() {
  templateStep.value = hasSavedDraft.value && templateText.value ? 'edit' : 'pick'
  showTemplateModal.value = true
}

function generateTemplate() {
  templateText.value = buildTemplateText()
  templateStep.value = 'edit'
}

// Closing is the save point: whatever is on screen is what comes back next time.
async function closeTemplateModal() {
  showTemplateModal.value = false
  if (templateStep.value !== 'edit' && !hasSavedDraft.value) return
  await saveTemplateDraft()
}

async function saveTemplateDraft() {
  const { error } = await supabase.from('project_quote_templates').upsert({
    project_id: projectId,
    selected_quote_ids: [...selectedForTemplate.value],
    template_text: templateText.value,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id' })
  if (error) return showMsg('Could not save the template draft: ' + error.message, 'error')
  hasSavedDraft.value = true
}

async function discardTemplate() {
  if (!confirm('Discard this saved draft and start over?')) return
  const { error } = await supabase.from('project_quote_templates').delete().eq('project_id', projectId)
  if (error) return showMsg('Could not discard the draft: ' + error.message, 'error')
  hasSavedDraft.value = false
  templateText.value = ''
  selectedForTemplate.value = new Set()
  templateStep.value = 'pick'
}

async function loadTemplateDraft() {
  const { data, error } = await supabase.from('project_quote_templates')
    .select('selected_quote_ids, template_text').eq('project_id', projectId).maybeSingle()
  if (error || !data) return
  templateText.value = data.template_text || ''
  const ids = Array.isArray(data.selected_quote_ids) ? data.selected_quote_ids : []
  selectedForTemplate.value = new Set(ids)
  hasSavedDraft.value = true
}

// Esc closes the template modal (and saves), matching the ✕.
function onKeydown(e) {
  if (e.key === 'Escape' && showTemplateModal.value) closeTemplateModal()
}

async function copyTemplate() {
  try {
    await navigator.clipboard.writeText(templateText.value)
    showMsg('Copied to clipboard')
  } catch (e) {
    showMsg('Could not copy — select and copy manually', 'error')
  }
}

// ---- Samples -------------------------------------------------------------------
const samplesFor = (quoteId) => samples.value.filter(s => s.quote_id === quoteId)

const shipmentsForManufacturer = (manufacturerId) =>
  shipments.value.filter(s => s.manufacturer_id === manufacturerId)

// A linked shipment is the source of truth for arrival; the manual date is the
// fallback for samples that showed up without a tracking number.
function sampleReceivedAt(s) {
  return s.shipment?.delivered_at || s.received_at
}

const CARRIER_URLS = {
  DHL: (n) => `https://www.dhl.com/en/express/tracking.html?AWB=${n}`,
  FedEx: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${n}`,
  USPS: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  '17TRACK': (n) => `https://t.17track.net/en#nums=${n}`,
}
function getTrackingUrl(s) {
  if (!s) return null
  if (s.tracking_url) return s.tracking_url
  const fn = CARRIER_URLS[s.carrier]
  return fn ? fn(encodeURIComponent(s.tracking_number)) : null
}

async function addSample(q) {
  const draft = sampleDraft.value[q.id]
  if (!draft?.requested_at) return showMsg('Pick the date the sample was requested', 'error')
  savingSample.value = true
  try {
    const { error } = await supabase.from('quote_samples').insert([{
      quote_id: q.id,
      shipment_id: draft.shipment_id || null,
      requested_at: draft.requested_at,
      received_at: draft.shipment_id ? null : (draft.received_at || null),
    }])
    if (error) throw error
    sampleDraft.value[q.id] = emptySampleDraft()
    await fetchSamples()
    showMsg('Sample added')
  } catch (err) {
    showMsg('Could not add the sample: ' + err.message, 'error')
  } finally {
    savingSample.value = false
  }
}

async function deleteSample(id) {
  if (!confirm('Remove this sample?')) return
  const { error } = await supabase.from('quote_samples').delete().eq('id', id)
  if (error) return showMsg('Could not remove the sample: ' + error.message, 'error')
  samples.value = samples.value.filter(s => s.id !== id)
}

async function fetchSamples() {
  const quoteIds = quotes.value.map(q => q.id)
  if (quoteIds.length === 0) { samples.value = []; return }
  const { data, error } = await supabase.from('quote_samples')
    .select('*').in('quote_id', quoteIds).order('requested_at', { ascending: true })
  if (error) return
  const shipMap = {}
  shipments.value.forEach(s => { shipMap[s.id] = s })
  samples.value = (data || []).map(s => ({ ...s, shipment: s.shipment_id ? shipMap[s.shipment_id] || null : null }))
}

async function fetchShipments() {
  const { data } = await supabase.from('project_shipments')
    .select('id, manufacturer_id, carrier, tracking_number, tracking_url, description, delivered_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  shipments.value = data || []
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

    // Shipments first: samples resolve their linked tracking out of that list.
    await fetchShipments()
    await fetchSamples()
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
      composition: d.composition || null,
      sample_cost: d.sample_cost,
      sample_lead_time: parseLeadTime(d.sample_lead_time),
      bulk_lead_time: parseLeadTime(d.bulk_lead_time),
      specialty: d.specialty,
      notes: d.notes,
      incoterm: d.incoterm || null,
      port: d.port || null,
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

onMounted(() => {
  fetchData()
  loadTemplateDraft()
  window.addEventListener('keydown', onKeydown)
})
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.container { max-width: 1300px; margin: 0 auto; padding: 2rem 1.5rem; font-family: 'Inter', sans-serif; background: var(--bg-app); color: var(--text-main); }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }
.back { color: var(--primary); text-decoration: none; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; display: block; }
h1 { font-size: 1.8rem; font-weight: 800; color: var(--text-main); margin: 0; }
.subtitle { color: var(--text-muted); font-size: 0.95rem; margin-top: 0.2rem; }
.header-actions { display: flex; gap: 1rem; }

/* FORM — the quote form's own styling lives in QuoteForm.vue; what's left here is
   for the picker search, the template textarea and the sample rows. */
input, select, textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1.5px solid var(--border-main); border-radius: 8px; font-size: 0.9rem; transition: border-color 0.2s; background: var(--bg-app); color: var(--text-main); box-sizing: border-box; }
input:focus, select:focus, textarea:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1); }
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

/* INCOTERM */
.incoterm-cell { white-space: nowrap; }
.incoterm-chip { display: inline-block; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; color: #a78bfa; background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.35); padding: 0.15rem 0.45rem; border-radius: 5px; }
.incoterm-port { font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem; }

/* SAMPLES */
.btn-sample-icon { position: relative; color: var(--text-muted); }
.btn-sample-icon:hover { background: rgba(99,102,241,0.15); border-color: var(--primary); }
.btn-sample-icon.has-samples { color: var(--primary); border-color: var(--primary); }
.sample-count { font-size: 0.62rem; font-weight: 800; margin-left: 2px; vertical-align: super; }
.samples-row td { background: rgba(0,0,0,0.12); padding: 0.9rem 1.5rem !important; }
.samples-block { display: flex; flex-direction: column; gap: 0.5rem; }
.samples-title { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.samples-empty { font-size: 0.82rem; color: var(--text-muted); font-style: italic; }
.sample-line { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; font-size: 0.82rem; color: var(--text-body); }
.sample-dates { white-space: nowrap; }
.sample-tracking a { color: #3b82f6; text-decoration: none; font-family: monospace; font-size: 0.78rem; }
.sample-tracking a:hover { text-decoration: underline; }
.sample-intransit { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #f59e0b; background: rgba(245,158,11,0.12); padding: 2px 6px; border-radius: 10px; margin-left: 0.4rem; }
.sample-no-tracking { font-size: 0.75rem; color: var(--text-muted); font-style: italic; }
.sample-add { display: flex; align-items: flex-end; gap: 0.6rem; flex-wrap: wrap; padding-top: 0.4rem; border-top: 1px dashed var(--border-main); }
.sample-add label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.sample-add input, .sample-add select { padding: 0.4rem 0.55rem; font-size: 0.8rem; width: auto; min-width: 140px; }
.sample-add input:disabled { opacity: 0.45; cursor: not-allowed; }
.sample-add .btn-add-tier { padding: 0.45rem 0.9rem; }
.sample-add .btn-add-tier:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-discard-template { color: var(--danger-text); border-color: var(--danger-text); margin-right: auto; }
.btn-discard-template:hover { background: var(--danger-bg); }

/* PRICING TIERS DISPLAY */
.tiers-display { display: flex; flex-direction: column; gap: 0.4rem; }
.tier-pill { display: inline-flex; align-items: center; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 6px; overflow: hidden; width: max-content; font-size: 0.8rem; }
.t-moq { background: rgba(0,0,0,0.1); padding: 0.2rem 0.5rem; font-weight: 600; color: var(--text-muted); border-right: 1px solid rgba(34, 197, 94, 0.3); }
.t-price { padding: 0.2rem 0.6rem; font-weight: 800; color: var(--success-text); }

/* INLINE FORM */
.inline-form-row { background: rgba(99,102,241,0.02); }
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
