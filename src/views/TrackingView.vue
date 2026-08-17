<template>
  <div class="container">
    <div class="header">
      <div>
        <h1>Tracking</h1>
        <p class="subtitle">Every package in transit, across all projects.</p>
      </div>
      <input v-model="search" placeholder="Search tracking #, project, manufacturer..." class="search-input" />
    </div>

    <div v-if="loading" class="empty">Loading...</div>
    <div v-else-if="filtered.length === 0" class="empty">No shipments match.</div>

    <div v-else class="list">
      <div v-for="s in filtered" :key="s.id" class="row" :class="{ delivered: s.delivered_at }">
        <div class="col-main">
          <div class="row-top">
            <span class="carrier">{{ s.carrier || 'Shipment' }}</span>
            <a v-if="getTrackingUrl(s)" :href="getTrackingUrl(s)" target="_blank" class="tracking-num">{{ s.tracking_number }} ↗</a>
            <span v-else class="tracking-num plain">{{ s.tracking_number }}</span>
            <span v-if="s.delivered_at && editingId !== s.id" class="delivered-badge" @click="startEditDelivered(s)" title="Click to change the date">Delivered {{ formatDate(s.delivered_at) }}</span>
          </div>
          <div class="row-sub">
            <span v-if="s.project_name">{{ s.project_name }}</span>
            <span v-if="s.manufacturer_name"> · {{ s.manufacturer_name }}</span>
            <span v-if="s.description"> · {{ s.description }}</span>
          </div>
        </div>
        <div class="col-actions">
          <template v-if="editingId === s.id">
            <input type="date" v-model="editDate" class="date-input" />
            <button @click="confirmDelivered(s)" class="btn-secondary">Confirm</button>
            <button @click="editingId = null" class="btn-icon" title="Cancel">✕</button>
          </template>
          <template v-else-if="!s.delivered_at">
            <button @click="startEditDelivered(s)" class="btn-secondary">Delivered</button>
          </template>
          <template v-else>
            <button @click="revertDelivered(s)" class="btn-secondary">Revert</button>
          </template>
          <button @click="removeShipment(s)" class="btn-icon" title="Delete">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const shipments = ref([])
const loading = ref(true)
const search = ref('')

const CARRIER_URLS = {
  DHL: (n) => `https://www.dhl.com/en/express/tracking.html?AWB=${n}`,
  FedEx: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${n}`,
  USPS: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`,
  '17TRACK': (n) => `https://t.17track.net/en#nums=${n}`,
}
function getTrackingUrl(s) {
  if (s.tracking_url) return s.tracking_url
  const fn = CARRIER_URLS[s.carrier]
  return fn ? fn(encodeURIComponent(s.tracking_number)) : null
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toLocalDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Active shipments first (newest first), delivered ones sink to the bottom, greyed out.
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let list = shipments.value
  if (q) {
    list = list.filter(s =>
      (s.tracking_number || '').toLowerCase().includes(q) ||
      (s.project_name || '').toLowerCase().includes(q) ||
      (s.manufacturer_name || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    )
  }
  return list.slice().sort((a, b) => {
    if (!!a.delivered_at !== !!b.delivered_at) return a.delivered_at ? 1 : -1
    return new Date(b.created_at) - new Date(a.created_at)
  })
})

async function fetchAll() {
  loading.value = true
  const { data: rows } = await supabase.from('project_shipments').select('*').order('created_at', { ascending: false })
  const list = rows || []

  const projectIds = [...new Set(list.map(s => s.project_id).filter(Boolean))]
  const manuIds = [...new Set(list.map(s => s.manufacturer_id).filter(Boolean))]

  const [{ data: projects }, { data: manus }] = await Promise.all([
    projectIds.length ? supabase.from('projects').select('id, project_name').in('id', projectIds) : Promise.resolve({ data: [] }),
    manuIds.length ? supabase.from('manufacturers').select('id, company_name').in('id', manuIds) : Promise.resolve({ data: [] }),
  ])
  const projectMap = {}; (projects || []).forEach(p => { projectMap[p.id] = p.project_name })
  const manuMap = {}; (manus || []).forEach(m => { manuMap[m.id] = m.company_name })

  shipments.value = list.map(s => ({
    ...s,
    project_name: s.project_id ? projectMap[s.project_id] : null,
    manufacturer_name: s.manufacturer_id ? manuMap[s.manufacturer_id] : null,
  }))
  loading.value = false
}

const editingId = ref(null)
const editDate = ref('')

function startEditDelivered(s) {
  editingId.value = s.id
  editDate.value = s.delivered_at ? toLocalDateStr(new Date(s.delivered_at)) : toLocalDateStr(new Date())
}

// Stored at local noon, not midnight, so the date doesn't slip a day when
// read back in a collaborator's timezone on the other side of the clock.
async function confirmDelivered(s) {
  const [y, m, d] = editDate.value.split('-').map(Number)
  const iso = new Date(y, m - 1, d, 12).toISOString()
  const { error } = await supabase.from('project_shipments').update({ delivered_at: iso }).eq('id', s.id)
  if (error) return alert('Error: ' + error.message)
  s.delivered_at = iso
  editingId.value = null
}

async function revertDelivered(s) {
  const { error } = await supabase.from('project_shipments').update({ delivered_at: null }).eq('id', s.id)
  if (error) return alert('Error: ' + error.message)
  s.delivered_at = null
}

async function removeShipment(s) {
  if (!confirm('Remove this tracking number?')) return
  await supabase.from('project_shipments').delete().eq('id', s.id)
  shipments.value = shipments.value.filter(x => x.id !== s.id)
}

onMounted(fetchAll)
</script>

<style scoped>
.container { max-width: 1000px; margin: 0 auto; padding: 2rem 1.5rem; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
h1 { font-size: 1.6rem; font-weight: 700; color: var(--text-main); margin: 0; }
.subtitle { color: var(--text-muted); margin: 0.25rem 0 0; font-size: 0.9rem; }
.search-input { padding: 0.6rem 1rem; border: 1px solid var(--border-main); border-radius: 8px; background: var(--bg-app); color: var(--text-main); font-size: 0.88rem; min-width: 260px; }
.empty { text-align: center; padding: 3rem; color: var(--text-muted); }

.list { display: flex; flex-direction: column; gap: 0.5rem; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 10px; padding: 0.9rem 1.2rem; }
.row.delivered { opacity: 0.55; }
.col-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.row-top { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.carrier { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.tracking-num { font-family: monospace; font-weight: 700; color: #3b82f6; text-decoration: none; font-size: 0.92rem; }
.tracking-num:hover { text-decoration: underline; }
.tracking-num.plain { color: var(--text-main); }
.delivered-badge { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #16a34a; background: rgba(34,197,94,0.12); padding: 2px 7px; border-radius: 10px; cursor: pointer; }
.row-sub { font-size: 0.8rem; color: var(--text-muted); }
.col-actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.date-input { padding: 0.35rem 0.5rem; border: 1px solid var(--border-main); border-radius: 6px; background: var(--bg-app); color: var(--text-main); font-size: 0.78rem; }
.btn-secondary { padding: 0.4rem 0.8rem; border: 1px solid var(--border-main); border-radius: 6px; background: transparent; color: var(--text-main); cursor: pointer; font-size: 0.78rem; font-weight: 600; }
.btn-secondary:hover { background: var(--bg-app); }
.btn-icon { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 0.3rem; border-radius: 4px; font-size: 0.8rem; opacity: 0.6; }
.btn-icon:hover { opacity: 1; color: #fb7185; }
</style>
