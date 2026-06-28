<template>
  <div class="logs-container">
    <div class="logs-header">
      <h1 class="logs-title">Activity Log</h1>
      <div class="logs-filters">
        <input v-model="search" placeholder="Search action, table, user..." class="filter-input" />
        <select v-model="filterTable" class="filter-select">
          <option value="">All tables</option>
          <option value="manufacturers">Manufacturers</option>
          <option value="manufacturer_documents">Documents</option>
          <option value="quotes">Quotes</option>
        </select>
        <select v-model="filterAction" class="filter-select">
          <option value="">All actions</option>
          <option value="INSERT">Insert</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="logs-empty">Loading...</div>
    <div v-else-if="filtered.length === 0" class="logs-empty">No logs found.</div>

    <div v-else class="logs-table-wrap">
      <table class="logs-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Table</th>
            <th>Record</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in filtered" :key="log.id" class="log-row">
            <td class="col-when">{{ formatDate(log.created_at) }}</td>
            <td class="col-who">{{ log.user_email || 'Portal / System' }}</td>
            <td class="col-action">
              <span :class="['action-badge', `action-${log.action.toLowerCase()}`]">{{ log.action }}</span>
            </td>
            <td class="col-table">{{ log.table_name }}</td>
            <td class="col-id">{{ summary(log) }}</td>
            <td class="col-details">
              <button @click="toggle(log.id)" class="btn-diff">{{ expanded.has(log.id) ? 'Hide' : 'Diff' }}</button>
              <div v-if="expanded.has(log.id)" class="diff-block">
                <div v-if="log.action === 'UPDATE'" class="diff-grid">
                  <template v-for="(val, key) in changedFields(log)" :key="key">
                    <span class="diff-key">{{ key }}</span>
                    <span class="diff-old">{{ val.old }}</span>
                    <span class="diff-arrow">→</span>
                    <span class="diff-new">{{ val.new }}</span>
                  </template>
                </div>
                <pre v-else class="diff-raw">{{ JSON.stringify(log.new_data || log.old_data, null, 2) }}</pre>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const logs = ref([])
const loading = ref(true)
const search = ref('')
const filterTable = ref('')
const filterAction = ref('')
const expanded = ref(new Set())

onMounted(async () => {
  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  logs.value = data || []
  loading.value = false
})

const filtered = computed(() => {
  let list = logs.value
  if (filterTable.value) list = list.filter(l => l.table_name === filterTable.value)
  if (filterAction.value) list = list.filter(l => l.action === filterAction.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(l =>
      (l.user_email || '').toLowerCase().includes(q) ||
      l.table_name.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      summary(l).toLowerCase().includes(q)
    )
  }
  return list
})

function summary(log) {
  const d = log.new_data || log.old_data
  if (!d) return log.record_id || '—'
  return d.company_name || d.template_name || d.document_type || d.name || log.record_id || '—'
}

function changedFields(log) {
  if (!log.old_data || !log.new_data) return {}
  const diff = {}
  for (const key of Object.keys(log.new_data)) {
    const o = JSON.stringify(log.old_data[key])
    const n = JSON.stringify(log.new_data[key])
    if (o !== n) diff[key] = { old: log.old_data[key], new: log.new_data[key] }
  }
  return diff
}

function toggle(id) {
  const s = new Set(expanded.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expanded.value = s
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
.logs-container { padding: 2rem; max-width: 1400px; margin: 0 auto; }
.logs-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
.logs-title { font-size: 1.4rem; font-weight: 700; color: var(--text-main); margin: 0; }
.logs-filters { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.filter-input { padding: 0.4rem 0.75rem; border: 1px solid var(--border-main); border-radius: 6px; font-size: 0.85rem; background: var(--bg-app); color: var(--text-main); min-width: 220px; }
.filter-select { padding: 0.4rem 0.75rem; border: 1px solid var(--border-main); border-radius: 6px; font-size: 0.85rem; background: var(--bg-app); color: var(--text-main); }
.logs-empty { color: var(--text-muted); padding: 3rem; text-align: center; }
.logs-table-wrap { overflow-x: auto; }
.logs-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.logs-table th { text-align: left; padding: 0.5rem 0.75rem; color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-main); white-space: nowrap; }
.log-row td { padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--border-light); vertical-align: top; }
.log-row:hover td { background: var(--bg-hover, #f9fafb); }
.col-when { white-space: nowrap; color: var(--text-muted); }
.col-who { font-weight: 500; }
.col-table { color: var(--text-muted); font-family: monospace; }
.col-id { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.action-badge { padding: 2px 7px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
.action-insert { background: #dcfce7; color: #166534; }
.action-update { background: #fef3c7; color: #92400e; }
.action-delete { background: #fee2e2; color: #991b1b; }
.btn-diff { font-size: 0.72rem; padding: 2px 8px; border: 1px solid var(--border-main); border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-muted); }
.btn-diff:hover { background: var(--bg-hover); }
.diff-block { margin-top: 0.5rem; }
.diff-grid { display: grid; grid-template-columns: auto auto auto auto; gap: 0.2rem 0.5rem; align-items: start; }
.diff-key { font-family: monospace; font-size: 0.75rem; color: var(--text-muted); }
.diff-old { color: #dc2626; font-size: 0.75rem; text-decoration: line-through; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.diff-arrow { color: var(--text-muted); }
.diff-new { color: #16a34a; font-size: 0.75rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.diff-raw { font-size: 0.72rem; max-height: 200px; overflow: auto; background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 4px; padding: 0.5rem; margin: 0; }
</style>
