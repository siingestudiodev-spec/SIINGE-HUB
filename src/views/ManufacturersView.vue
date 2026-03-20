<template>
  <div class="container">
    <div class="header">
      <h1>Manufacturers</h1>
      <button @click="showForm = !showForm" class="btn-primary">
        {{ showForm ? 'Cancel' : '+ Add Manufacturer' }}
      </button>
    </div>

    <div v-if="showForm" class="form-card">
      <h2>{{ editing ? 'Edit Manufacturer' : 'New Manufacturer' }}</h2>
      <div class="form-grid">
        <input v-model="form.company_name" placeholder="Company Name *" />
        <input v-model="form.country" placeholder="Country" />
        <input v-model="form.contact_name" placeholder="Contact Name" />
        <input v-model="form.phone" placeholder="Phone" />
        <input v-model="form.email" placeholder="Email" />
        <input v-model="form.website" placeholder="Website" />
        <input v-model="form.product_categories" placeholder="Product Categories (e.g. Knitwear, Woven)" />
      </div>
      <textarea v-model="form.notes" placeholder="Notes" rows="3"></textarea>
      <div class="form-actions">
        <button @click="saveManufacturer" class="btn-primary">{{ editing ? 'Update' : 'Save' }}</button>
      </div>
    </div>

    <div class="filters">
      <input v-model="search" placeholder="🔍 Search by name, country, category..." class="search-input" />
      <select v-model="filterCountry">
        <option value="">All Countries</option>
        <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filterCategory">
        <option value="">All Categories</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <button v-if="search || filterCountry || filterCategory" @click="clearFilters" class="btn-clear">✕ Clear</button>
      <span class="results-count">{{ filteredManufacturers.length }} result{{ filteredManufacturers.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="filteredManufacturers.length === 0" class="empty">No manufacturers found.</div>
    <div v-else class="cards-grid">
      <div v-for="m in filteredManufacturers" :key="m.id" class="card">
        <div class="card-top">
          <div class="card-avatar">{{ m.company_name?.charAt(0) }}</div>
          <div class="card-title">
            <h3>{{ m.company_name }}</h3>
            <span class="country-badge">🌍 {{ m.country }}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="info-row" v-if="m.contact_name"><span class="info-icon">👤</span>{{ m.contact_name }}</div>
          <div class="info-row" v-if="m.phone"><span class="info-icon">📞</span>{{ m.phone }}</div>
          <div class="info-row" v-if="m.email"><span class="info-icon">✉️</span>{{ m.email }}</div>
          <div class="info-row" v-if="m.website"><span class="info-icon">🌐</span><a :href="m.website" target="_blank">{{ m.website }}</a></div>
          <div class="info-row" v-if="m.product_categories"><span class="info-icon">🏷️</span><span class="category-tag">{{ m.product_categories }}</span></div>
          <div class="info-row notes-row" v-if="m.notes"><span class="info-icon">📝</span>{{ m.notes }}</div>
        </div>
        <div class="card-actions">
          <button @click="editManufacturer(m)" class="btn-secondary">Edit</button>
          <button @click="deleteManufacturer(m.id)" class="btn-danger">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const manufacturers = ref([])
const loading = ref(true)
const showForm = ref(false)
const editing = ref(false)
const editId = ref(null)
const search = ref('')
const filterCountry = ref('')
const filterCategory = ref('')

const form = ref({
  company_name: '', country: '', contact_name: '',
  phone: '', email: '', website: '', product_categories: '', notes: ''
})

const countries = computed(() => [...new Set(manufacturers.value.map(m => m.country).filter(Boolean))].sort())
const categories = computed(() => {
  const all = manufacturers.value.flatMap(m =>
    m.product_categories ? m.product_categories.split(',').map(c => c.trim()) : []
  )
  return [...new Set(all)].filter(Boolean).sort()
})

const filteredManufacturers = computed(() => {
  return manufacturers.value.filter(m => {
    const s = search.value.toLowerCase()
    const matchSearch = !s || m.company_name?.toLowerCase().includes(s) || m.country?.toLowerCase().includes(s) || m.product_categories?.toLowerCase().includes(s) || m.contact_name?.toLowerCase().includes(s)
    const matchCountry = !filterCountry.value || m.country === filterCountry.value
    const matchCategory = !filterCategory.value || m.product_categories?.toLowerCase().includes(filterCategory.value.toLowerCase())
    return matchSearch && matchCountry && matchCategory
  })
})

function clearFilters() { search.value = ''; filterCountry.value = ''; filterCategory.value = '' }

async function fetchManufacturers() {
  loading.value = true
  const { data } = await supabase.from('manufacturers').select('*').order('company_name')
  manufacturers.value = data || []
  loading.value = false
}

async function saveManufacturer() {
  if (!form.value.company_name) return alert('Company name is required')
  if (editing.value) {
    await supabase.from('manufacturers').update(form.value).eq('id', editId.value)
  } else {
    await supabase.from('manufacturers').insert([form.value])
  }
  resetForm(); fetchManufacturers()
}

function editManufacturer(m) {
  form.value = { ...m }; editId.value = m.id; editing.value = true; showForm.value = true
}

async function deleteManufacturer(id) {
  if (!confirm('Delete this manufacturer?')) return
  await supabase.from('manufacturers').delete().eq('id', id)
  fetchManufacturers()
}

function resetForm() {
  form.value = { company_name: '', country: '', contact_name: '', phone: '', email: '', website: '', product_categories: '', notes: '' }
  editing.value = false; editId.value = null; showForm.value = false
}

onMounted(fetchManufacturers)
</script>

<style scoped>
.container { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; }

.form-card {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 2rem;
  border: 1.5px solid #e5e7eb;
  box-shadow: 0 4px 24px rgba(79,70,229,0.07);
}
.form-card h2 { font-size: 1.1rem; margin-bottom: 1.25rem; color: #1a1a2e; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
input, textarea, select {
  width: 100%; padding: 0.7rem 1rem;
  border: 1.5px solid #e5e7eb; border-radius: 10px;
  font-size: 0.92rem; color: #1a1a2e; background: white;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.15s;
}
input:focus, textarea:focus, select:focus { outline: none; border-color: #4f46e5; }
textarea { resize: vertical; }
.form-actions { margin-top: 1rem; }

.filters { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1.75rem; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 220px; }
.btn-clear { background: white; color: #666; border: 1.5px solid #e5e7eb; padding: 0.6rem 0.9rem; border-radius: 10px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; }
.results-count { color: #9ca3af; font-size: 0.85rem; white-space: nowrap; }

.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }

.card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  border: 1.5px solid #e5e7eb;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  transition: transform 0.18s, box-shadow 0.18s;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(79,70,229,0.12);
  border-color: #c7d2fe;
}

.card-top { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
.card-avatar {
  width: 48px; height: 48px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white; font-weight: 700; font-size: 1.3rem;
  border-radius: 12px; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.card-title h3 { font-size: 1.05rem; font-weight: 700; color: #1a1a2e; margin-bottom: 0.25rem; }
.country-badge { background: #eef2ff; color: #4f46e5; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.78rem; font-weight: 500; }

.card-body { margin-bottom: 1.25rem; }
.info-row { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.45rem; font-size: 0.88rem; color: #4b5563; }
.info-icon { flex-shrink: 0; }
.info-row a { color: #4f46e5; text-decoration: none; }
.info-row a:hover { text-decoration: underline; }
.category-tag { background: #f0fdf4; color: #16a34a; padding: 0.15rem 0.5rem; border-radius: 6px; font-size: 0.82rem; font-weight: 500; }
.notes-row { color: #9ca3af !important; font-style: italic; }

.card-actions { display: flex; gap: 0.5rem; padding-top: 1rem; border-top: 1px solid #f3f4f6; }
.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white; border: none; padding: 0.65rem 1.3rem;
  border-radius: 10px; cursor: pointer; font-size: 0.92rem;
  font-weight: 600; font-family: 'Inter', sans-serif;
  transition: opacity 0.15s, transform 0.15s;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-secondary { background: #eef2ff; color: #4f46e5; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.btn-danger { background: #fff1f2; color: #e11d48; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-family: 'Inter', sans-serif; font-weight: 500; }
.loading, .empty { text-align: center; padding: 3rem; color: #9ca3af; }
</style>
