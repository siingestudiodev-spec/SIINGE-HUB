<template>
  <div class="container">
    <div class="header">
      <div class="flex items-center gap-4">
        <button @click="goBack" class="btn-secondary">← Back to Projects</button>
        <h1>Project Sourcing</h1>
      </div>
      <button @click="openSourcingModal" class="btn-primary">
        + Add Material
      </button>
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
              <button 
                @click="toggleApproval(item)" 
                class="btn-approve-toggle"
                :class="{ 'is-active': item.is_approved }"
                :title="item.is_approved ? 'Unmark as Approved' : 'Mark as Approved'"
              >
                {{ item.is_approved ? '✅ Approved' : '○ Pending' }}
              </button>
            </div>
            </div>
        </div>
        
        <div class="card-body border-b pb-3 mb-3">
          <div class="text-xs uppercase text-gray-500 font-semibold mb-2">Base Supplier Info</div>
          <div class="info-row" v-if="item.sourcing?.provider"><span class="info-icon">🏭</span>{{ item.sourcing.provider }}</div>
          <div class="info-row" v-if="item.sourcing?.country"><span class="info-icon">🌍</span>{{ item.sourcing.country }}</div>
        </div>

        <div class="card-body">
          <div class="text-xs uppercase text-indigo-500 font-semibold mb-2">Project Requirements</div>
          <div class="info-row" v-if="item.specific_name"><span class="info-icon">🧵</span><strong>Fabric/Trim:</strong> {{ item.specific_name }}</div>
          <div class="info-row" v-if="item.color"><span class="info-icon">🎨</span><strong>Color:</strong> {{ item.color }}</div>
          <div class="info-row" v-if="item.brand"><span class="info-icon">🏷️</span><strong>Brand:</strong> {{ item.brand }}</div>
          <div class="info-row" v-if="item.quantity"><span class="info-icon">📦</span><strong>Qty:</strong> {{ item.quantity }}</div>
          <div class="info-row notes-row" v-if="item.project_notes"><span class="info-icon">📝</span>{{ item.project_notes }}</div>
        </div>

        <div class="card-actions">
          <button @click="removeMaterial(item.id)" class="btn-danger">Remove</button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h2>📦 Add Material to Project</h2>
          <button @click="closeModal" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-field">
            <label>1. Link to Global Supplier Database *</label>
            <select v-model="form.sourcing_id" class="w-full">
              <option value="" disabled>-- Select supplier/factory --</option>
              <option v-for="s in fullSourcingList" :key="s.id" :value="s.id">
                {{ s.provider }} {{ s.country ? `(${s.country})` : '' }}
              </option>
            </select>
          </div>
          <div v-if="form.sourcing_id" class="project-details-section">
            <label class="section-label">2. Approval & Specification Info</label>
            <div class="form-grid">
              <div class="modal-field"><label>Placement *</label><input v-model="form.placement" placeholder="e.g., Body Fabric, Elastic" /></div>
              <div class="modal-field"><label>Specific Fabric/Trim *</label><input v-model="form.specific_name" placeholder="e.g., Isee Cotton Span" /></div>
              <div class="modal-field"><label>Color</label><input v-model="form.color" /></div>
              <div class="modal-field"><label>Brand</label><input v-model="form.brand" /></div>
              <div class="modal-field"><label>Target Quantity</label><input v-model="form.quantity" /></div>
            </div>
            <div class="modal-field mt-2"><label>Additional Notes</label><textarea v-model="form.project_notes" placeholder="Specific requirements or warnings..." rows="2"></textarea></div>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="closeModal" class="btn-secondary">Cancel</button>
          <button @click="addMaterialToProject" class="btn-primary" :disabled="!form.sourcing_id || !form.placement || saving">Save Material</button>
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
const projectMaterials = ref([])
const fullSourcingList = ref([])
const showModal = ref(false)

const form = ref({ sourcing_id: '', placement: '', specific_name: '', color: '', brand: '', quantity: '', target_price: '', project_notes: '' })

function goBack() { router.push('/projects') }

async function fetchProjectMaterials() {
  loading.value = true
  const { data, error } = await supabase
    .from('project_materials')
    .select(`id, placement, specific_name, color, brand, quantity, target_price, project_notes, is_approved, sourcing:sourcing_id (id, provider, types, country)`)
    .eq('project_id', projectId)
  if (error) console.error(error)
  projectMaterials.value = data || []
  loading.value = false
}

async function fetchFullSourcingList() {
  const { data } = await supabase.from('sourcing').select('*').order('provider')
  fullSourcingList.value = data || []
}

// FUNCIÓN PARA EL TOGGLE DE APROBACIÓN
async function toggleApproval(item) {
  const newStatus = !item.is_approved
  const { error } = await supabase
    .from('project_materials')
    .update({ is_approved: newStatus })
    .eq('id', item.id)

  if (!error) {
    item.is_approved = newStatus // Actualiza la UI instantáneamente
  }
}

async function addMaterialToProject() {
  if (!form.value.sourcing_id || !form.value.placement) return
  saving.value = true
  const { error } = await supabase.from('project_materials').insert([{
    project_id: projectId, sourcing_id: form.value.sourcing_id, placement: form.value.placement,
    specific_name: form.value.specific_name, color: form.value.color, brand: form.value.brand,
    quantity: form.value.quantity, project_notes: form.value.project_notes
  }])
  if (!error) { await fetchProjectMaterials(); closeModal() }
  saving.value = false
}

function openSourcingModal() { form.value = { sourcing_id: '', placement: '', specific_name: '', color: '', brand: '', quantity: '', project_notes: '' }; showModal.value = true }
function closeModal() { showModal.value = false }

async function removeMaterial(id) {
  if (!confirm('Remove this material?')) return
  await supabase.from('project_materials').delete().eq('id', id)
  fetchProjectMaterials()
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
h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
.card { background: white; border-radius: 16px; padding: 1.5rem; border: 1.5px solid #e5e7eb; transition: all 0.2s; display: flex; flex-direction: column; }
.card-approved { border-color: #10b981; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1); background: #f0fdf4; }

.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.card-avatar { width: 48px; height: 48px; background: #9ca3af; color: white; font-weight: 700; font-size: 1.3rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.avatar-approved { background: linear-gradient(135deg, #10b981, #059669); }

.card-title { flex: 1; }
.card-title h3 { font-size: 1.05rem; font-weight: 700; color: #1a1a2e; margin: 0; }

.btn-approve-toggle {
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #d1d5db;
  background: white;
  color: #6b7280;
  transition: all 0.2s;
}
.btn-approve-toggle.is-active {
  background: #10b981;
  color: white;
  border-color: #10b981;
}

/* CORRECCIÓN: ESTILO .category-badge ELIMINADO YA QUE NO SE USA */

.card-body { margin-bottom: 0.5rem; }
.border-b { border-bottom: 1px solid #e5e7eb; }
.pb-3 { padding-bottom: 0.75rem; }
.mb-3 { margin-bottom: 0.75rem; }
.text-xs { font-size: 0.75rem; text-transform: uppercase; color: #6b7280; font-weight: 600; }
.info-row { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.4rem; font-size: 0.88rem; color: #4b5563; }
.info-row strong { color: #111827; min-width: 65px; }
.notes-row { color: #9ca3af !important; font-style: italic; margin-top: 0.5rem; }

.card-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; margin-top: auto; justify-content: flex-end; }
.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-weight: 600; }
.btn-secondary { background: #eef2ff; color: #4f46e5; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100; display: flex; align-items: center; justify-content: center; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 600px; padding: 2rem; box-shadow: 0 20px 50px rgba(0,0,0,0.2); }
.modal-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
input, select, textarea { width: 100%; padding: 0.7rem; border: 1.5px solid #e5e7eb; border-radius: 10px; }
.modal-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
</style>