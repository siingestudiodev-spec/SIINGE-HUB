<template>
  <div class="container">
    <div class="header">
      <div>
        <router-link to="/projects" class="back">← Back to Projects</router-link>
        <h1>{{ projectName }}</h1>
        <p class="subtitle" v-if="clientName">👤 {{ clientName }}</p>
      </div>
      <div class="header-actions">
        <button @click="exportExcel" class="btn-export" v-if="quotes.length > 0">⬇ EXPORT EXCEL</button>
        <button @click="openCreateForm" class="btn-primary">
          {{ showForm ? 'CANCEL' : '+ ADD NEW FACTORY QUOTE' }}
        </button>
      </div>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editingId ? 'Edit Quote Option' : 'New Quote Option' }}</h2>
      <div class="form-grid">
        <div class="input-field">
          <label>Factory *</label>
          <select v-model="form.manufacturer_id">
            <option value="" disabled>Select Factory</option>
            <option v-for="m in manufacturers" :key="m.id" :value="m.id">{{ m.company_name }}</option>
          </select>
        </div>
        <div class="input-field">
          <label>OPTION / MATERIAL COMP</label>
          <input v-model="form.material_comp" placeholder="e.g. 100% Cotton, Recycled Poly..." />
        </div>
        <div class="input-field">
          <label>Sample Cost (USD)</label>
          <input v-model.number="form.sample_cost" type="number" step="0.01" />
        </div>
        <div class="input-field">
          <label>Sample Lead Time (weeks)</label>
          <input v-model="form.sample_lead_time" type="text" placeholder="e.g. 3-5" />
        </div>
        <div class="input-field">
          <label>Bulk Lead Time (weeks)</label>
          <input v-model="form.bulk_lead_time" type="text" placeholder="e.g. 6-8" />
        </div>
      </div>

      <div class="tiers-section mt-4">
        <label class="section-label">Pricing Tiers (MOQ & Price)</label>
        <div class="tiers-list">
          <div v-for="(tier, index) in form.pricing_tiers" :key="index" class="tier-row">
            <div class="tier-input-group">
              <span class="tier-prefix">MOQ:</span>
              <input v-model="tier.moq" placeholder="e.g. 100" />
            </div>
            <div class="tier-icon">➔</div>
            <div class="tier-input-group">
              <span class="tier-prefix">Price:</span>
              <input v-model="tier.price" placeholder="e.g. $5.00" />
            </div>
            <button @click="removeTier(index)" class="btn-remove-tier" title="Remove Tier" v-if="form.pricing_tiers.length > 1">✕</button>
          </div>
        </div>
        <button @click="addTier" class="btn-add-tier">+ Add Another Tier</button>
      </div>

      <div class="form-grid mt-4">
        <div class="input-field full-row">
          <label>Specialty / Process</label>
          <input v-model="form.specialty" placeholder="e.g. Screen print, Embroidery, Knitwear..." />
        </div>
        <div class="input-field full-row mt-3">
          <label>Notes</label>
          <textarea v-model="form.notes" placeholder="Additional details..." rows="2"></textarea>
        </div>
      </div>
      
      <div class="form-actions">
        <button @click="saveQuote" class="btn-primary" :disabled="saving">
          {{ saving ? 'SAVING...' : (editingId ? 'UPDATE OPTION' : 'SAVE OPTION') }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading quotes...</div>
    <div v-else-if="quotes.length === 0" class="empty">No quotes yet. Add the first one!</div>
    
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
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        
        <tbody v-for="group in groupedQuotes" :key="group.manufacturer.id" class="factory-group">
          <tr class="factory-group-header">
            <td colspan="7">
              <div class="factory-header-cell">
                <div class="factory-avatar">{{ group.manufacturer.company_name?.charAt(0) }}</div>
                <div>
                  <strong class="factory-name">{{ group.manufacturer.company_name }}</strong>
                  <span class="factory-country">🌍 {{ group.manufacturer.country || 'Unknown' }}</span>
                </div>
                <button @click="addVariant(group.manufacturer.id)" class="btn-add-variant">+ Add Material Option</button>
              </div>
            </td>
          </tr>
          
          <tr v-for="q in group.items" :key="q.id" class="variant-row">
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
            <td>{{ formatWeeks(q.sample_lead_time) }}</td>
            <td>{{ formatWeeks(q.bulk_lead_time) }}</td>
            <td class="notes-cell">{{ q.notes || '—' }}</td>
            <td class="text-right">
              <div class="table-actions">
                <button @click="editQuote(q)" class="btn-icon btn-edit-icon" title="Edit Option">✏️</button>
                <button @click="confirmDelete(q.id)" class="btn-icon btn-delete-icon" title="Delete Option">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="notification.show" class="notification-overlay">
      <div class="notification-card" :class="notification.type">
        <div class="notif-icon">{{ notification.type === 'success' ? '✅' : '⚠️' }}</div>
        <div class="notif-content">
          <p>{{ notification.message }}</p>
        </div>
        <button @click="notification.show = false" class="btn-notif-close">OK</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
const projectId = route.params.id
const quotes = ref([])
const manufacturers = ref([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const editingId = ref(null)
const projectName = ref('')
const clientName = ref('')

const notification = ref({ show: false, message: '', type: 'success' })

// Formulario actualizado
const form = ref({
  manufacturer_id: '', material_comp: '', item_description: '', 
  sample_cost: null, sample_lead_time: null, bulk_lead_time: null, specialty: '', notes: '',
  pricing_tiers: [{ moq: '', price: '' }]
})

const groupedQuotes = computed(() => {
  const groups = {}
  quotes.value.forEach(q => {
    const mId = q.manufacturer_id || 'unknown'
    if (!groups[mId]) {
      groups[mId] = {
        manufacturer: q.manufacturers || { id: 'unknown', company_name: 'Unknown', country: '' },
        items: []
      }
    }
    groups[mId].items.push(q)
  })
  return Object.values(groups).sort((a, b) => {
    const nameA = a.manufacturer.company_name?.toLowerCase() || ''
    const nameB = b.manufacturer.company_name?.toLowerCase() || ''
    return nameA.localeCompare(nameB)
  })
})

function showMsg(msg, type = 'success') {
  notification.value = { show: true, message: msg, type: type }
  if (type === 'success') setTimeout(() => notification.value.show = false, 3000)
}

function parseLeadTime(value) {
  if (value === null || value === undefined) return null
  const raw = value.toString().trim()
  if (raw === '') return null

  // 3-5 -> use minimum number to stay compatible con integer DB
  if (raw.includes('-')) {
    const parts = raw.split('-').map(p => Number(p.trim())).filter(n => !Number.isNaN(n))
    if (parts.length > 0) return Math.min(...parts)
    return null
  }

  const numeric = Number(raw)
  if (!Number.isNaN(numeric)) return Math.floor(numeric)
  return null
}

function formatWeeks(value) {
  if (value === null || value === undefined || value === '') return '—'
  const raw = value.toString().trim()
  if (raw === '') return '—'

  if (raw.includes('-')) return `${raw} weeks`
  if (!Number.isNaN(Number(raw))) return `${Number(raw)} weeks`
  return `${raw} weeks`
}

async function fetchData() {
  loading.value = true
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (project) {
    projectName.value = project.name || project.project_name
    clientName.value = project.client_name
  }
  
  const { data: q } = await supabase
    .from('quotes')
    .select('*, manufacturers(id, company_name, country)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  
  quotes.value = q || []
  const { data: m } = await supabase.from('manufacturers').select('id, company_name').order('company_name')
  manufacturers.value = m || []
  loading.value = false
}

function openCreateForm() {
  editingId.value = null
  resetForm()
  showForm.value = !showForm.value
}

function addVariant(manufacturerId) {
  editingId.value = null
  resetForm()
  form.value.manufacturer_id = manufacturerId
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetForm() {
  form.value = { 
    manufacturer_id: '', material_comp: '', item_description: '', 
    sample_cost: null, sample_lead_time: '', bulk_lead_time: '', specialty: '', notes: '',
    pricing_tiers: [{ moq: '', price: '' }]
  }
}

// Lógica de los Tiers Dinámicos
function addTier() {
  form.value.pricing_tiers.push({ moq: '', price: '' })
}

function removeTier(index) {
  if (form.value.pricing_tiers.length > 1) {
    form.value.pricing_tiers.splice(index, 1)
  }
}

function editQuote(q) {
  editingId.value = q.id
  
  let parsedTiers = []
  if (q.pricing_tiers && q.pricing_tiers.length > 0) {
    parsedTiers = [...q.pricing_tiers]
  } else if (q.moq_per_color || q.price_range) {
    parsedTiers = [{ moq: q.moq_per_color || '', price: q.price_range || '' }]
  } else {
    parsedTiers = [{ moq: '', price: '' }]
  }

  form.value = {
    ...q,
    material_comp: q.material_comp || q.item_description || '',
    sample_lead_time: q.sample_lead_time != null ? q.sample_lead_time.toString() : '',
    bulk_lead_time: q.bulk_lead_time != null ? q.bulk_lead_time.toString() : '',
    pricing_tiers: parsedTiers
  }
  delete form.value.manufacturers 
  showForm.value = true
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function saveQuote() {
  if (!form.value.manufacturer_id) return showMsg('Select a factory', 'error')
  saving.value = true
  
  try {
    const validTiers = form.value.pricing_tiers.filter(t => t.moq || t.price)

    const payload = {
      manufacturer_id: form.value.manufacturer_id,
      item_description: form.value.material_comp || form.value.item_description || '',
      sample_cost: form.value.sample_cost,
      sample_lead_time: parseLeadTime(form.value.sample_lead_time),
      bulk_lead_time: parseLeadTime(form.value.bulk_lead_time),
      specialty: form.value.specialty,
      notes: form.value.notes,
      project_id: projectId,
      pricing_tiers: validTiers, 
      price_range: validTiers.length > 0 ? validTiers[0].price : '',
      moq_per_color: validTiers.length > 0 ? Number(validTiers[0].moq) || null : null
    }

    if (editingId.value) {
      const { error } = await supabase.from('quotes').update(payload).eq('id', editingId.value)
      if (error) throw error
      showMsg('Option updated correctly')
    } else {
      const { error } = await supabase.from('quotes').insert([payload])
      if (error) throw error
      showMsg('New option saved')
    }
    showForm.value = false
    fetchData()
  } catch (err) {
    showMsg(err.message, 'error')
  } finally {
    saving.value = false
  }
}

async function confirmDelete(id) {
  if (confirm('Are you sure you want to delete this specific quote option?')) {
    await supabase.from('quotes').delete().eq('id', id)
    fetchData()
    showMsg('Option deleted')
  }
}

function exportExcel() {
  alert("Export to Excel functionality triggered!")
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
.form-card { background: var(--bg-card); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-main); margin-bottom: 2rem; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
.form-card h2 { font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1.25rem; color: var(--text-main); border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;}
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }
.input-field label, .section-label { display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.4rem; }
input, select, textarea { width: 100%; padding: 0.6rem 0.8rem; border: 1.5px solid var(--border-main); border-radius: 8px; font-size: 0.9rem; transition: border-color 0.2s; background: var(--bg-app); color: var(--text-main); }
input:focus, select:focus, textarea:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);}
.mt-3 { margin-top: 1rem; }
.mt-4 { margin-top: 1.5rem; }
.full-row { grid-column: 1 / -1; }
.form-actions { margin-top: 1.5rem; display: flex; justify-content: flex-end;}

/* TIERS ESTILOS */
.tiers-section { background: rgba(0,0,0,0.15); border: 1px dashed var(--border-main); padding: 1rem; border-radius: 10px;}
.tiers-list { display: flex; flex-direction: column; gap: 0.8rem; margin-bottom: 1rem; }
.tier-row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap;}
.tier-input-group { display: flex; align-items: center; background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 8px; overflow: hidden; flex: 1; min-width: 150px;}
.tier-prefix { padding: 0 0.8rem; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; background: rgba(255,255,255,0.05); border-right: 1px solid var(--border-main); height: 100%; display: flex; align-items: center; }
.tier-input-group input { border: none; border-radius: 0; background: transparent; }
.tier-input-group input:focus { box-shadow: none; }
.tier-icon { color: var(--text-muted); font-size: 1.2rem; }
.btn-remove-tier { background: transparent; color: var(--danger-text); border: 1px solid var(--danger-text); border-radius: 6px; width: 34px; height: 34px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: 0.2s;}
.btn-remove-tier:hover { background: var(--danger-bg); }
.btn-add-tier { background: rgba(99, 102, 241, 0.1); color: var(--primary); border: 1px dashed var(--primary); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 700; width: max-content; transition: 0.2s;}
.btn-add-tier:hover { background: var(--primary); color: white;}

/* TABLE REDESIGN */
.table-wrapper { background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-main); overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);}
table { width: 100%; border-collapse: collapse; }
th { background: rgba(0,0,0,0.2); padding: 1rem; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); border-bottom: 2px solid var(--border-main); }
td { padding: 1rem; border-bottom: 1px solid var(--border-light); font-size: 0.88rem; vertical-align: middle; color: var(--text-body); }

/* FACTORY HEADER GROUP */
.factory-group-header td { 
  background: rgba(99, 102, 241, 0.03); 
  border-bottom: 1px solid var(--border-light);
  padding: 1.2rem 1rem;
}
.factory-header-cell { display: flex; align-items: center; gap: 1rem; }
.factory-avatar { width: 36px; height: 36px; background: var(--primary); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; }
.factory-name { font-size: 1.1rem; color: var(--text-main); }
.factory-country { font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem; background: var(--bg-app); padding: 0.2rem 0.5rem; border-radius: 12px; border: 1px solid var(--border-main);}
.btn-add-variant { 
  margin-left: auto; 
  background: transparent; 
  border: 1px dashed var(--primary); 
  color: var(--primary); 
  padding: 0.4rem 0.8rem; 
  border-radius: 8px; 
  font-size: 0.8rem; 
  font-weight: 700; 
  cursor: pointer; 
  transition: 0.2s;
}
.btn-add-variant:hover { background: rgba(99, 102, 241, 0.1); }

/* VARIANT ROWS */
.variant-row { transition: background 0.2s; }
.variant-row:hover { background: rgba(255,255,255,0.02); }
.indent-cell { padding-left: 1.5rem !important; }
.variant-icon { color: var(--text-muted); margin-right: 0.5rem; font-weight: normal; }
.notes-cell { font-style: italic; color: var(--text-muted); max-width: 250px; }

/* PRICING TIERS DISPLAY */
.tiers-display { display: flex; flex-direction: column; gap: 0.4rem; }
.tier-pill { display: inline-flex; align-items: center; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 6px; overflow: hidden; width: max-content; font-size: 0.8rem;}
.t-moq { background: rgba(0,0,0,0.1); padding: 0.2rem 0.5rem; font-weight: 600; color: var(--text-muted); border-right: 1px solid rgba(34, 197, 94, 0.3); }
.t-price { padding: 0.2rem 0.6rem; font-weight: 800; color: var(--success-text); }

/* ACTIONS */
.table-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
.btn-icon { background: var(--bg-app); border: 1px solid var(--border-main); cursor: pointer; padding: 0.4rem; border-radius: 6px; transition: 0.2s; }
.btn-edit-icon:hover { background: rgba(99,102,241,0.15); border-color: var(--primary);}
.btn-delete-icon:hover { background: rgba(239,68,68,0.12); border-color: var(--danger-text);}

/* NOTIFICATION MODAL */
.notification-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; backdrop-filter: blur(2px);}
.notification-card { background: var(--bg-card); padding: 2rem; border-radius: 16px; width: 300px; text-align: center; border: 1px solid var(--border-main); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
.notif-icon { font-size: 2.5rem; margin-bottom: 1rem; }
.notif-content p { font-weight: 600; color: var(--text-main); margin-bottom: 1.5rem; }
.btn-notif-close { background: var(--bg-app); color: var(--text-main); border: 1px solid var(--border-main); padding: 0.6rem 2rem; border-radius: 8px; font-weight: 700; cursor: pointer; width: 100%; transition: 0.2s;}
.btn-notif-close:hover { background: var(--primary); color: white; border-color: var(--primary);}

.btn-primary { background: var(--primary); color: white; border: none; padding: 0.7rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: 0.2s;}
.btn-primary:hover { filter: brightness(1.1); }
.btn-export { background: transparent; color: var(--text-main); border: 1px solid var(--border-main); padding: 0.7rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.85rem; transition: 0.2s;}
.btn-export:hover { background: var(--bg-app); }
.loading, .empty { text-align: center; padding: 4rem; color: var(--text-muted); border: 1px dashed var(--border-main); border-radius: 12px; margin-top: 2rem;}
.text-right { text-align: right; }
.ml-4 { margin-left: 1rem; }
</style>