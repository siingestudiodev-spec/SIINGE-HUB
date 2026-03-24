<template>
  <div class="container">
    <div class="header">
      <div class="flex items-center gap-4">
        <button @click="goBack" class="btn-secondary">← Back to Projects</button>
        <h1>Project Sourcing</h1>
      </div>
      <button @click="openSourcingModal()" class="btn-primary">+ Add Material</button>
    </div>

    <div v-if="loading" class="loading">Loading materials...</div>
    <div v-else-if="projectMaterials.length === 0" class="empty">No materials assigned to this project yet.</div>
    
    <div v-else class="cards-grid">
      <div v-for="item in projectMaterials" :key="item.id" class="card" :class="{ 'card-approved': item.is_approved }">
        <div class="card-top">
          <div class="card-avatar" :class="{ 'avatar-approved': item.is_approved }">
            {{ item.placement?.charAt(0) || 'M' }}
          </div>
          <div class="card-title">
            <div class="flex justify-between items-start">
              <h3>{{ item.placement || 'Material Component' }}</h3>
              <button @click="toggleApproval(item)" class="btn-approve-toggle" :class="{ 'is-active': item.is_approved }">
                {{ item.is_approved ? '✅ Approved' : '○ Pending' }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="card-body border-b pb-3 mb-3">
          <div class="text-xs uppercase text-gray-500 font-semibold mb-2">Base Supplier Info</div>
          <div class="info-row" v-if="item.sourcing?.provider">
            <span class="info-icon">🏭</span>
            <strong>Factory:</strong> 
            <button @click="viewFactoryDetails(item.sourcing)" class="factory-link-btn">{{ item.sourcing.provider }}</button>
          </div>
          <div class="info-row" v-if="item.sourcing?.country">
            <span class="info-icon">🌍</span><strong>Country:</strong> {{ item.sourcing.country }}
          </div>
        </div>

        <div class="card-body">
          <div class="text-xs uppercase text-indigo-500 font-semibold mb-2">Technical Specs</div>
          <div class="info-row" v-if="item.specific_name"><strong>Name/Art:</strong> {{ item.specific_name }} {{ item.article_number ? `- ${item.article_number}` : '' }}</div>
          <div class="info-row" v-if="item.composition"><strong>Comp:</strong> {{ item.composition }}</div>
          <div class="info-row" v-if="item.price_per_meter"><strong>Price/m:</strong> {{ item.price_per_meter }}</div>
          
          <div class="info-row mt-2" v-if="item.custom_moq"><strong>MOQ (Custom):</strong> {{ item.custom_moq }}</div>
          <div class="info-row" v-if="item.custom_lead_time"><strong>Lead Time (Custom):</strong> {{ item.custom_lead_time }}</div>
          <div class="info-row" v-if="item.instock_lead_time"><strong>Lead Time (Stock):</strong> {{ item.instock_lead_time }}</div>
          
          <div class="info-row mt-2" v-if="item.color"><strong>Selected Color:</strong> {{ item.color }}</div>
          
          <div class="info-row mt-2" v-if="item.item_url">
            <a :href="item.item_url" target="_blank" class="url-link">🔗 View Item URL</a>
          </div>
          <div class="info-row notes-row" v-if="item.project_notes">📝 {{ item.project_notes }}</div>
        </div>

        <div class="card-actions">
          <button @click="openSourcingModal(item)" class="btn-edit-card">✏️ Edit</button>
          <button @click="removeMaterial(item.id)" class="btn-danger">Remove</button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal max-w-700">
        <div class="modal-header">
          <h2>{{ editingId ? '✏️ Edit Material' : '📦 Material Specifications' }}</h2>
          <button @click="closeModal" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-field">
            <label>1. Select Provider *</label>
            <select v-model="form.sourcing_id" class="w-full">
              <option value="" disabled>-- Select supplier --</option>
              <option v-for="s in fullSourcingList" :key="s.id" :value="s.id">{{ s.provider }} ({{ s.country }})</option>
            </select>
          </div>
          <div v-if="form.sourcing_id" class="project-details-section">
            <label class="section-label">2. Technical Data</label>
            <div class="form-grid">
              <div class="modal-field"><label>Placement *</label><input v-model="form.placement" /></div>
              <div class="modal-field"><label>Fabric Name / Art. #</label><input v-model="form.specific_name" /></div>
              <div class="modal-field"><label>Composition</label><input v-model="form.composition" /></div>
              <div class="modal-field"><label>Price Per Meter</label><input v-model="form.price_per_meter" /></div>
              <div class="modal-field"><label>Custom Color MOQ</label><input v-model="form.custom_moq" /></div>
              <div class="modal-field"><label>Custom Color Lead Time</label><input v-model="form.custom_lead_time" /></div>
              <div class="modal-field"><label>Lead Time (In Stock)</label><input v-model="form.instock_lead_time" /></div>
              <div class="modal-field"><label>Selected Color</label><input v-model="form.color" /></div>
              <div class="modal-field full-row"><label>URL to Item</label><input v-model="form.item_url" /></div>
              <div class="modal-field full-row"><label>Additional Notes</label><textarea v-model="form.project_notes" rows="2"></textarea></div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeModal" class="btn-secondary">Cancel</button>
          <button @click="saveMaterial" class="btn-primary" :disabled="!form.sourcing_id || !form.placement || saving">
            {{ editingId ? 'Update Material' : 'Save Material' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="factoryModal.show" class="modal-overlay" @click.self="factoryModal.show = false">
      <div class="modal max-w-500">
        <div class="modal-header">
          <h2>🏭 Factory Details</h2>
          <button @click="factoryModal.show = false" class="modal-close">✕</button>
        </div>
        <div class="factory-detail-content" v-if="factoryModal.data">
          <h1 class="factory-name-title">{{ factoryModal.data.provider }}</h1>
          <p class="factory-location-text">📍 {{ factoryModal.data.city }}, {{ factoryModal.data.country }}</p>
          <div class="detail-section">
            <div class="detail-row" v-if="factoryModal.data.contact_name"><strong>Contact:</strong> {{ factoryModal.data.contact_name }}</div>
            <div class="detail-row" v-if="factoryModal.data.email"><strong>Email:</strong> {{ factoryModal.data.email }}</div>
            <div class="detail-row" v-if="factoryModal.data.phone"><strong>Phone:</strong> {{ factoryModal.data.phone }}</div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="factoryModal.show = false" class="btn-primary">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

const loading = ref(true)
const saving = ref(false)
const editingId = ref(null)
const projectMaterials = ref([])
const fullSourcingList = ref([])
const showModal = ref(false)
const factoryModal = ref({ show: false, data: null })

const form = ref({ 
  sourcing_id: '', placement: '', specific_name: '', composition: '', 
  custom_moq: '', custom_lead_time: '', instock_lead_time: '', 
  color: '', price_per_meter: '', item_url: '', project_notes: '' 
})

function goBack() { router.push('/projects') }

async function fetchProjectMaterials() {
  loading.value = true
  const { data, error } = await supabase.from('project_materials').select(`*, sourcing:sourcing_id (*)`).eq('project_id', projectId)
  if (!error) projectMaterials.value = data || []
  loading.value = false
}

async function fetchFullSourcingList() {
  const { data } = await supabase.from('sourcing').select('*').order('provider')
  fullSourcingList.value = data || []
}

function viewFactoryDetails(sourcingData) { factoryModal.value.data = sourcingData; factoryModal.value.show = true }

// MODIFICADO: Solo cambia el status, no agrega fecha
async function toggleApproval(item) {
  const newStatus = !item.is_approved
  
  const { error } = await supabase
    .from('project_materials')
    .update({ is_approved: newStatus })
    .eq('id', item.id)

  if (!error) {
    item.is_approved = newStatus
  }
}

async function saveMaterial() {
  if (!form.value.sourcing_id || !form.value.placement) return
  saving.value = true
  const payload = { ...form.value }
  delete payload.sourcing // Limpiar antes de enviar

  if (editingId.value) {
    await supabase.from('project_materials').update(payload).eq('id', editingId.value)
  } else {
    await supabase.from('project_materials').insert([{ project_id: projectId, ...payload }])
  }
  await fetchProjectMaterials(); closeModal();
  saving.value = false
}

function openSourcingModal(item = null) { 
  if (item) {
    editingId.value = item.id
    form.value = { ...item }
    delete form.value.sourcing
  } else {
    editingId.value = null
    form.value = { sourcing_id: '', placement: '', specific_name: '', composition: '', custom_moq: '', custom_lead_time: '', instock_lead_time: '', color: '', price_per_meter: '', item_url: '', project_notes: '' }
  }
  showModal.value = true 
}

function closeModal() { showModal.value = false; editingId.value = null; }

async function removeMaterial(id) {
  if (!confirm('Remove this material?')) return
  await supabase.from('project_materials').delete().eq('id', id); fetchProjectMaterials()
}

onMounted(() => { fetchProjectMaterials(); fetchFullSourcingList() })
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.flex { display: flex; }
.justify-between { justify-content: space-between; }
.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.gap-4 { gap: 1rem; }
h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; margin: 0; }

/* FIX: Cuadrícula de tarjetas corregida para evitar expansión */
.cards-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
  gap: 1.25rem; 
  align-items: start; /* Asegura que las tarjetas no se estiren verticalmente si tienen contenido diferente */
}

.card { background: white; border-radius: 16px; padding: 1.5rem; border: 1.5px solid #e5e7eb; transition: all 0.2s; position: relative; display: flex; flex-direction: column; }
.card-approved { border-color: #10b981; background: #f0fdf4; }

.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.card-avatar { width: 44px; height: 44px; background: #9ca3af; color: white; font-weight: 700; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.avatar-approved { background: #10b981; }

.card-title { flex: 1; }
.card-title h3 { font-size: 1.05rem; font-weight: 700; color: #1a1a2e; margin: 0; }

.btn-approve-toggle { padding: 0.3rem 0.6rem; border-radius: 8px; font-size: 0.7rem; font-weight: 600; cursor: pointer; border: 1px solid #d1d5db; background: white; color: #6b7280; }
.btn-approve-toggle.is-active { background: #10b981; color: white; border-color: #10b981; }

.factory-link-btn { background: transparent; border: none; padding: 0; color: #4f46e5; font-weight: 700; text-decoration: underline; cursor: pointer; font-size: 0.88rem; font-family: inherit; }
.factory-link-btn:hover { color: #764ba2; }

.info-row { font-size: 0.85rem; color: #4b5563; margin-bottom: 0.25rem; display: flex; align-items: start; gap: 0.5rem; }
.info-row strong { color: #111827; min-width: 65px; }
.info-icon { flex-shrink: 0; }
.mt-2 { margin-top: 0.5rem; }
.url-link { color: #4f46e5; font-weight: 600; text-decoration: none; font-size: 0.85rem; }
.notes-row { color: #9ca3af !important; font-style: italic; margin-top: 0.5rem; }
.border-b { border-bottom: 1px solid #f3f4f6; }
.pb-3 { padding-bottom: 0.75rem; }
.mb-3 { margin-bottom: 0.75rem; }

.card-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; margin-top: auto; justify-content: flex-end; }
.btn-primary { background: #4f46e5; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 10px; cursor: pointer; font-weight: 600; }
.btn-secondary { background: #f3f4f6; padding: 0.6rem 1.2rem; border-radius: 10px; border: none; cursor: pointer; }
.btn-edit-card { background: #eef2ff; color: #4f46e5; border: none; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: white; border-radius: 20px; width: 100%; padding: 2rem; max-height: 90vh; overflow-y: auto; }
.max-w-700 { max-width: 700px; }
.max-w-500 { max-width: 500px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-close { background: #f3f4f6; border: none; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.full-row { grid-column: span 2; }
input, select, textarea { width: 100%; padding: 0.6rem; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 0.9rem; }
.modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }

.factory-name-title { font-size: 1.5rem; margin: 0 0 0.5rem; color: #1a1a2e; }
.factory-location-text { color: #6b7280; margin: 0 0 1rem; }
.detail-row { margin-bottom: 0.5rem; font-size: 0.95rem; }
.detail-row strong { color: #111827; }

.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }
</style>