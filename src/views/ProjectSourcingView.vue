<template>
  <div class="container">
    <div class="header">
      <div class="flex items-center gap-4">
        <button @click="goBack" class="btn-secondary">← Back to Projects</button>
        <h1>Project Sourcing</h1>
      </div>
      <button @click="openSourcingModal" class="btn-primary">
        + Agregar Material
      </button>
    </div>

    <div v-if="loading" class="loading">Loading materials...</div>
    <div v-else-if="projectMaterials.length === 0" class="empty">No hay materiales asignados a este proyecto aún.</div>
    
    <div v-else class="cards-grid">
      <div v-for="item in projectMaterials" :key="item.id" class="card">
        <div class="card-top">
          <div class="card-avatar">{{ item.sourcing?.name?.charAt(0) || 'M' }}</div>
          <div class="card-title">
            <h3>{{ item.sourcing?.name || 'Material Desconocido' }}</h3>
            <span class="country-badge">{{ item.sourcing?.category || 'General' }}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="info-row" v-if="item.sourcing?.supplier"><span class="info-icon">🏭</span>{{ item.sourcing.supplier }}</div>
          <div class="info-row" v-if="item.sourcing?.composition"><span class="info-icon">🧵</span>{{ item.sourcing.composition }}</div>
          <div class="info-row notes-row" v-if="item.sourcing?.notes"><span class="info-icon">📝</span>{{ item.sourcing.notes }}</div>
        </div>
        <div class="card-actions">
          <button @click="removeMaterial(item.id)" class="btn-danger">Remover</button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h2>📦 Agregar Material al Proyecto</h2>
          <button @click="showModal = false" class="modal-close">✕</button>
        </div>

        <div class="modal-field">
          <label>Buscar en Sourcing</label>
          <input v-model="searchQuery" placeholder="Buscar por nombre o fábrica..." class="mb-4" />
          
          <div class="sourcing-list">
            <div 
              v-for="s in filteredSourcingList" 
              :key="s.id" 
              class="sourcing-item"
              :class="{ 'selected': selectedSourcingId === s.id }"
              @click="selectedSourcingId = s.id"
            >
              <div class="font-bold text-gray-900">{{ s.name }}</div>
              <div class="text-sm text-gray-500">{{ s.supplier || 'Sin fábrica especificada' }}</div>
            </div>
            <div v-if="filteredSourcingList.length === 0" class="text-center text-gray-500 py-4">
              No se encontraron materiales.
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showModal = false" class="btn-secondary">Cancelar</button>
          <button @click="addMaterialToProject" class="btn-primary" :disabled="!selectedSourcingId || saving">
            {{ saving ? 'Agregando...' : 'Agregar al Proyecto' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
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
const searchQuery = ref('')
const selectedSourcingId = ref(null)

// Computed para filtrar la lista del modal
const filteredSourcingList = computed(() => {
  return fullSourcingList.value.filter(s => {
    const query = searchQuery.value.toLowerCase()
    return s.name?.toLowerCase().includes(query) || s.supplier?.toLowerCase().includes(query)
  })
})

function goBack() {
  router.push('/projects')
}

// Obtener los materiales ya asignados al proyecto
async function fetchProjectMaterials() {
  loading.value = true
  
  // Hacemos un JOIN para traer los datos de la tabla sourcing
  const { data, error } = await supabase
    .from('project_materials')
    .select(`
      id,
      sourcing_id,
      sourcing:sourcing_id (
        id, name, supplier, category, composition, notes
      )
    `)
    .eq('project_id', projectId)
    
  if (error) console.error("Error fetching project materials:", error)
  projectMaterials.value = data || []
  loading.value = false
}

// Obtener TODA la lista de Sourcing para el modal
async function fetchFullSourcingList() {
  const { data } = await supabase.from('sourcing').select('*').order('name')
  fullSourcingList.value = data || []
}

function openSourcingModal() {
  searchQuery.value = ''
  selectedSourcingId.value = null
  showModal.value = true
}

async function addMaterialToProject() {
  if (!selectedSourcingId.value) return
  saving.value = true

  // Verificar si ya existe para no duplicarlo
  const alreadyExists = projectMaterials.value.some(pm => pm.sourcing_id === selectedSourcingId.value)
  if (alreadyExists) {
    alert('Este material ya está en el proyecto.')
    saving.value = false
    return
  }

  const { error } = await supabase.from('project_materials').insert([
    { project_id: projectId, sourcing_id: selectedSourcingId.value }
  ])

  if (error) {
    console.error("Error saving material:", error)
    alert("Hubo un error al guardar el material.")
  } else {
    await fetchProjectMaterials()
    showModal.value = false
  }
  saving.value = false
}

async function removeMaterial(id) {
  if (!confirm('¿Quitar este material del proyecto?')) return
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
.card { background: white; border-radius: 16px; padding: 1.5rem; border: 1.5px solid #e5e7eb; box-shadow: 0 2px 12px rgba(0,0,0,0.05); transition: transform 0.18s, box-shadow 0.18s; }
.card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(79,70,229,0.12); border-color: #c7d2fe; }

.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.card-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; font-weight: 700; font-size: 1.3rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.card-title h3 { font-size: 1.05rem; font-weight: 700; color: #1a1a2e; margin-bottom: 0.25rem; }
.country-badge { background: #fef3c7; color: #d97706; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.78rem; font-weight: 500; }

.card-body { margin-bottom: 1.25rem; }
.info-row { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.45rem; font-size: 0.88rem; color: #4b5563; }
.info-icon { flex-shrink: 0; }
.notes-row { color: #9ca3af !important; font-style: italic; }

.card-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; flex-wrap: wrap; margin-top: 1rem; }

/* Modal y Lista de Selección */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.modal { background: white; border-radius: 20px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; padding: 2rem; box-shadow: 0 24px 64px rgba(0,0,0,0.18); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h2 { font-size: 1.15rem; font-weight: 700; color: #1a1a2e; }
.modal-close { background: #f3f4f6; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 1rem; color: #6b7280; }
.modal-close:hover { background: #e5e7eb; }
.modal-field { margin-bottom: 1rem; }
.modal-field label { display: block; font-size: 0.8rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
input { width: 100%; padding: 0.7rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 0.92rem; color: #1a1a2e; box-sizing: border-box; margin-bottom: 1rem; }
input:focus { outline: none; border-color: #4f46e5; }

.sourcing-list { max-height: 300px; overflow-y: auto; border: 1.5px solid #e5e7eb; border-radius: 10px; }
.sourcing-item { padding: 0.75rem 1rem; border-bottom: 1px solid #e5e7eb; cursor: pointer; transition: background 0.15s; }
.sourcing-item:last-child { border-bottom: none; }
.sourcing-item:hover { background: #f9fafb; }
.sourcing-item.selected { background: #eef2ff; border-left: 4px solid #4f46e5; }
.font-bold { font-weight: 600; }
.text-sm { font-size: 0.85rem; }
.text-gray-500 { color: #6b7280; }
.text-gray-900 { color: #111827; }

.modal-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; justify-content: flex-end; }

.btn-primary { background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 0.65rem 1.3rem; border-radius: 10px; cursor: pointer; font-size: 0.92rem; font-weight: 600; transition: opacity 0.15s, transform 0.15s; }
.btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: #eef2ff; color: #4f46e5; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 500; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 500; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }
</style>