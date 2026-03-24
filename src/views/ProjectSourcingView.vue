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
      <div v-for="item in projectMaterials" :key="item.id" class="card">
        <div class="card-top">
          <div class="card-avatar">{{ item.placement?.charAt(0) || 'M' }}</div>
          <div class="card-title">
            <h3>{{ item.placement || 'Material Component' }}</h3>
            <span class="category-badge">{{ item.sourcing?.category || 'General' }}</span>
          </div>
        </div>
        
        <div class="card-body border-b pb-3 mb-3">
          <div class="text-xs uppercase text-gray-500 font-semibold mb-2">Base Supplier Info</div>
          <div class="info-row" v-if="item.sourcing?.name"><span class="info-icon">📋</span>{{ item.sourcing.name }}</div>
          <div class="info-row" v-if="item.sourcing?.supplier"><span class="info-icon">🏭</span>{{ item.sourcing.supplier }}</div>
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
                {{ s.name }} ({{ s.supplier || 'No supplier' }})
              </option>
            </select>
          </div>

          <div v-if="form.sourcing_id" class="project-details-section">
            <label class="section-label">2. Approval & Specification Info</label>
            
            <div class="form-grid">
              <div class="modal-field">
                <label>Placement / Component *</label>
                <input v-model="form.placement" placeholder="e.g., Body Fabric, Elastic, Rings" />
              </div>
              <div class="modal-field">
                <label>Specific Fabric/Trim *</label>
                <input v-model="form.specific_name" placeholder="e.g., Isee Cotton Span Jersey Knit" />
              </div>
              <div class="modal-field">
                <label>Color</label>
                <input v-model="form.color" placeholder="e.g., Blue Ribbon, Rose Gold" />
              </div>
              <div class="modal-field">
                <label>Brand</label>
                <input v-model="form.brand" placeholder="e.g., Vevesi" />
              </div>
              <div class="modal-field">
                <label>Target Quantity</label>
                <input v-model="form.quantity" placeholder="e.g., 500 yds" />
              </div>
            </div>
            
            <div class="modal-field mt-2">
              <label>Additional Notes</label>
              <textarea v-model="form.project_notes" placeholder="Specific requirements or warnings..." rows="2"></textarea>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="closeModal" class="btn-secondary">Cancel</button>
          <button @click="addMaterialToProject" class="btn-primary" :disabled="!form.sourcing_id || !form.placement || saving">
            {{ saving ? 'Saving...' : 'Save Approved Material' }}
          </button>
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

const form = ref({
  sourcing_id: '',
  placement: '',
  specific_name: '',
  color: '',
  brand: '',
  quantity: '',
  target_price: '',
  project_notes: ''
})

function goBack() {
  router.push('/projects')
}

async function fetchProjectMaterials() {
  loading.value = true
  
  const { data, error } = await supabase
    .from('project_materials')
    .select(`
      id,
      placement,
      specific_name,
      color,
      brand,
      quantity,
      target_price,
      project_notes,
      sourcing:sourcing_id (
        id, name, supplier, category, composition
      )
    `)
    .eq('project_id', projectId)
    
  if (error) console.error("Error fetching project materials:", error)
  projectMaterials.value = data || []
  loading.value = false
}

async function fetchFullSourcingList() {
  const { data } = await supabase.from('sourcing').select('*').order('name')
  fullSourcingList.value = data || []
}

function openSourcingModal() {
  form.value = { sourcing_id: '', placement: '', specific_name: '', color: '', brand: '', quantity: '', target_price: '', project_notes: '' }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function addMaterialToProject() {
  if (!form.value.sourcing_id || !form.value.placement) return
  saving.value = true

  const { error } = await supabase.from('project_materials').insert([{
    project_id: projectId,
    sourcing_id: form.value.sourcing_id,
    placement: form.value.placement,
    specific_name: form.value.specific_name,
    color: form.value.color,
    brand: form.value.brand,
    quantity: form.value.quantity,
    target_price: form.value.target_price,
    project_notes: form.value.project_notes
  }])

  if (error) {
    console.error("Error saving material:", error)
    alert("There was an error saving the material.")
  } else {
    await fetchProjectMaterials()
    closeModal()
  }
  saving.value = false
}

async function removeMaterial(id) {
  if (!confirm('Remove this material from the project?')) return
  await supabase.from('project_materials').delete().eq('id', id)
  fetchProjectMaterials()
}

onMounted(() => {
  fetchProjectMaterials()
  fetchFullSourcingList()
})
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.flex { display: flex; }
.items-center { align-items: center; }
.gap-4 { gap: 1rem; }
h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; margin: 0; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }
.card { background: white; border-radius: 16px; padding: 1.5rem; border: 1.5px solid #e5e7eb; box-shadow: 0 2px 12px rgba(0,0,0,0.05); transition: transform 0.18s, box-shadow 0.18s; display: flex; flex-direction: column; }
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(79,70,229,0.12); border-color: #c7d2fe; }

.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.card-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; font-weight: 700; font-size: 1.3rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-title h3 { font-size: 1.05rem; font-weight: 700; color: #1a1a2e; margin-bottom: 0.25rem; }
.category-badge { background: #fef3c7; color: #d97706; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.78rem; font-weight: 500; }

.card-body { margin-bottom: 0.5rem; }
.border-b { border-bottom: 1px solid #f3f4f6; }
.pb-3 { padding-bottom: 0.75rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mt-2 { margin-top: 0.5rem; }
.text-xs { font-size: 0.75rem; }
.uppercase { text-transform: uppercase; letter-spacing: 0.05em; }
.text-gray-500 { color: #6b7280; }
.text-indigo-500 { color: #4f46e5; }
.font-semibold { font-weight: 600; }

.info-row { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.45rem; font-size: 0.88rem; color: #4b5563; }
.info-row strong { color: #111827; font-weight: 600; min-width: 65px; }
.info-icon { flex-shrink: 0; }
.notes-row { color: #9ca3af !important; font-style: italic; margin-top: 0.5rem; }

.card-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; flex-wrap: wrap; margin-top: auto; justify-content: flex-end; }

/* Modal Styles */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; padding: 2rem; box-shadow: 0 24px 64px rgba(0,0,0,0.18); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h2 { font-size: 1.15rem; font-weight: 700; color: #1a1a2e; }
.modal-close { background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 1rem; color: #6b7280; }
.modal-close:hover { background: #e5e7eb; }

.modal-body { margin-bottom: 1.5rem; }
.modal-field { margin-bottom: 1rem; }
.modal-field label { display: block; font-size: 0.8rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
.section-label { display: block; font-size: 0.8rem; font-weight: 600; color: #111827; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; }

.project-details-section { background: #f9fafb; padding: 1.5rem; border-radius: 12px; border: 1px solid #e5e7eb; margin-top: 1.5rem; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

input, select, textarea { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.92rem; color: #1a1a2e; box-sizing: border-box; background: white; font-family: 'Inter', sans-serif; transition: border-color 0.15s; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; }
.w-full { width: 100%; }

.modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; border-top: 1px solid #e5e7eb; padding-top: 1.5rem; }

.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; transition: opacity 0.15s, transform 0.15s; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #eef2ff; color: #4f46e5; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 500; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 500; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }
</style>