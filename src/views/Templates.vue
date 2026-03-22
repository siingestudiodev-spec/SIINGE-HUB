<template>
  <div class="templates-container">
    <header class="page-header">
      <h1>Templates</h1>
      <button @click="showForm = true" class="btn-primary">+ New Template</button>
    </header>

    <!-- Form Crear/Editar -->
    <form v-if="showForm" @submit.prevent="saveTemplate" class="template-form">
      <input v-model="editingTemplate.name" placeholder="Initial Reach" required>
      <input v-model="editingTemplate.subject" placeholder="Subject" required>
      <textarea v-model="editingTemplate.body" rows="8" placeholder="Dear {{manufacturer.name}}..." required></textarea>
      <div class="form-actions">
        <button type="submit" class="btn-primary">Save</button>
        <button type="button" @click="cancelEdit" class="btn-secondary">Cancel</button>
      </div>
    </form>

    <!-- Lista Tarjetas -->
    <div class="templates-grid">
      <div v-for="template in templates" :key="template.id" class="template-card">
        <h3>{{ template.name }}</h3>
        <p class="subject">{{ template.subject }}</p>
        <p class="preview">{{ template.body.substring(0, 100) }}...</p>
        <div class="card-actions">
          <button @click="editTemplate(template)" class="btn-secondary">Edit</button>
          <button @click="deleteTemplate(template.id)" class="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const templates = ref([])
const showForm = ref(false)
const editingTemplate = ref({ name: '', subject: '', body: '' })

onMounted(() => {
  loadTemplates()
})

const loadTemplates = () => {
  templates.value = JSON.parse(localStorage.getItem('emailTemplates') || '[]')
}


const saveTemplate = () => {
  if (editingTemplate.value.id) {
    // Update
    const index = templates.value.findIndex(t => t.id === editingTemplate.value.id)
    templates.value[index] = { ...editingTemplate.value }
  } else {
    // Create
    editingTemplate.value.id = Date.now()
    templates.value.push({ ...editingTemplate.value })
  }
  
  localStorage.setItem('emailTemplates', JSON.stringify(templates.value))
  showForm.value = false
  editingTemplate.value = { name: '', subject: '', body: '' }
}

const editTemplate = (template) => {
  editingTemplate.value = { ...template }
  showForm.value = true
}

const cancelEdit = () => {
  showForm.value = false
  editingTemplate.value = { name: '', subject: '', body: '' }
}

const deleteTemplate = (id) => {
  templates.value = templates.value.filter(t => t.id !== id)
  localStorage.setItem('emailTemplates', JSON.stringify(templates.value))
}
</script>

<style scoped>
.templates-container { padding: 2rem; max-width: 1200px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.template-form { background: #f8fafc; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
.template-form input, .template-form textarea { width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; }
.form-actions { display: flex; gap: 1rem; }
.templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
.template-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.template-card h3 { margin: 0 0 0.5rem 0; color: #1e293b; }
.subject { color: #475569; font-weight: 500; margin: 0 0 0.5rem 0; }
.preview { color: #64748b; font-size: 0.9rem; margin-bottom: 1rem; }
.card-actions { display: flex; gap: 0.5rem; }
</style>
