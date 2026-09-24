<template>
  <div class="act-container">
    <div class="act-header">
      <div>
        <h1 class="act-title">My Activity</h1>
        <p class="act-sub">{{ me || '—' }}</p>
      </div>
      <div class="act-filters">
        <button @click="setRange(0)" class="btn-range" :class="{ on: preset === 0 }">Today</button>
        <button @click="setRange(6)" class="btn-range" :class="{ on: preset === 6 }">7 days</button>
        <button @click="setRange(29)" class="btn-range" :class="{ on: preset === 29 }">30 days</button>
        <input type="date" v-model="from" class="filter-input" :max="to" />
        <input type="date" v-model="to" class="filter-input" :min="from" />
        <button @click="sync" class="btn-sync" :disabled="syncing">
          <RefreshCw :size="13" :stroke-width="1.5" :class="{ spin: syncing }" />
          {{ syncing ? 'Reading mailbox…' : 'Sync mailbox' }}
        </button>
      </div>
    </div>

    <p v-if="syncNote" class="act-note">{{ syncNote }}</p>

    <div v-if="loading" class="act-empty">Loading…</div>

    <template v-else>
      <!-- ── Needs reply ───────────────────────────────────────── -->
      <section class="act-section">
        <h2 class="sec-title">
          Needs reply
          <span class="sec-count">{{ pending.length }}</span>
        </h2>

        <p v-if="!pending.length" class="act-empty sm">
          {{ inbound.length ? 'Nothing waiting on you.' : 'No mailbox data yet — hit Sync mailbox.' }}
        </p>

        <div v-for="p in pending" :key="p.key" class="pend-card">
          <div class="pend-top">
            <span class="pend-company" :class="{ unknown: !p.company }">
              {{ p.company || 'Not in the hub' }}
            </span>
            <span class="pend-waited" :class="ageClass(p.waitedMs)">{{ p.waited }}</span>
          </div>
          <div class="pend-who">{{ p.name ? `${p.name} · ${p.from}` : p.from }}</div>
          <div class="pend-subject">{{ p.subject }}</div>
          <p class="pend-body">{{ snippet(p.body) }}</p>
        </div>
      </section>

      <!-- ── Report ────────────────────────────────────────────── -->
      <section class="act-section">
        <h2 class="sec-title">
          Report
          <button @click="copy" class="btn-copy">{{ copied ? 'Copied' : 'Copy' }}</button>
        </h2>
        <pre class="report">{{ report }}</pre>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'
import { buildReport } from '../lib/dailyReport'
import { pendingReplies } from '../lib/needsReply'

// Every hub email goes out as production@siinge.studio, and that is the only mailbox
// being read, so rows with no sent_by belong to whoever owns it.
// ponytail: one studio address, hardcoded. Becomes an app_settings row the day a second
// mailbox is synced.
const MAILBOX_OWNER = 'production@siinge.studio'

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
const daysAgo = n => {
  const d = new Date(today() + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

const me = ref('')
const from = ref(today())
const to = ref(today())
const preset = ref(0)
const loading = ref(true)
const syncing = ref(false)
const syncNote = ref('')
const copied = ref(false)

const outbound = ref([])
const inbound = ref([])
const audits = ref([])

function setRange(n) {
  preset.value = n
  from.value = daysAgo(n)
  to.value = today()
}

// Mine only. The mailbox rows are already scoped by policy; the hub logs are scoped
// here, with unattributed history falling to the address that actually sent it.
const isMine = row => {
  const by = row.sent_by || row.mailbox
  return by ? by === me.value : me.value === MAILBOX_OWNER
}

async function load() {
  loading.value = true
  const lo = from.value + 'T00:00:00-05:00'
  const hi = to.value + 'T23:59:59-05:00'

  const [out, inb, aud] = await Promise.all([
    // the full history of every company, not just the range — "first contacted Aug 4"
    // cannot be computed from a one-day slice
    supabase.from('outbound_activity').select('*').order('sent_at', { ascending: true }),
    supabase.from('inbound_activity').select('*').order('received_at', { ascending: false }).limit(500),
    supabase.from('audit_logs').select('*').gte('created_at', lo).lte('created_at', hi)
      .eq('user_email', me.value).limit(1000),
  ])

  outbound.value = (out.data || []).filter(isMine)
  inbound.value = inb.data || []
  audits.value = aud.data || []
  loading.value = false
}

const pending = computed(() =>
  pendingReplies({ inbound: inbound.value, outbound: outbound.value }))

const report = computed(() => buildReport({
  from: from.value,
  to: to.value,
  user: me.value,
  emails: outbound.value,
  inbound: inbound.value,
  audits: audits.value,
}))

async function sync() {
  syncing.value = true
  syncNote.value = ''
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/inbox-sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || `sync failed (${res.status})`)
    const stored = (body.folders || []).reduce((n, f) => n + (f.stored || 0), 0)
    syncNote.value = `Read ${body.folders?.length ?? 0} folders, stored ${stored} messages` +
      (body.more ? ' — more waiting, run it again.' : '.')
    await load()
  } catch (e) {
    syncNote.value = `Sync failed: ${e.message}`
  } finally {
    syncing.value = false
  }
}

function ageClass(ms) {
  const days = ms / 86400000
  return days >= 7 ? 'age-bad' : days >= 2 ? 'age-warn' : 'age-ok'
}

const snippet = t => {
  const flat = (t || '').replace(/\s+/g, ' ').trim()
  return flat.length > 220 ? flat.slice(0, 220) + '…' : flat
}

async function copy() {
  await navigator.clipboard.writeText(report.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

watch([from, to], load)

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  me.value = user?.email || ''
  await load()
})
</script>

<style scoped>
.act-container { padding: 2rem; max-width: 1000px; margin: 0 auto; }
.act-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
.act-title { font-size: 1.4rem; font-weight: 700; color: var(--text-main); margin: 0; }
.act-sub { font-size: 0.8rem; color: var(--text-muted); margin: 0.15rem 0 0; }
.act-filters { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.filter-input { padding: 0.35rem 0.6rem; border: 1px solid var(--border-main); border-radius: 6px; font-size: 0.82rem; background: var(--bg-app); color: var(--text-main); }
.btn-range { padding: 0.35rem 0.7rem; border: 1px solid var(--border-main); border-radius: 6px; background: transparent; color: var(--text-muted); font-size: 0.78rem; cursor: pointer; }
.btn-range.on { background: var(--text-main); color: var(--bg-app); border-color: var(--text-main); }
.btn-sync { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.35rem 0.8rem; border: 1px solid var(--border-main); border-radius: 6px; background: transparent; color: var(--text-main); font-size: 0.8rem; cursor: pointer; }
.btn-sync:disabled { opacity: 0.6; cursor: default; }
.spin { animation: sp 1s linear infinite; }
@keyframes sp { to { transform: rotate(360deg); } }
.act-note { font-size: 0.8rem; color: var(--text-muted); margin: 0 0 1rem; }
.act-empty { color: var(--text-muted); padding: 3rem; text-align: center; }
.act-empty.sm { padding: 1.25rem; text-align: left; font-size: 0.85rem; }
.act-section { margin-bottom: 2.5rem; }
.sec-title { display: flex; align-items: center; gap: 0.6rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); border-bottom: 1px solid var(--border-main); padding-bottom: 0.5rem; margin: 0 0 1rem; }
.sec-count { background: var(--border-light); color: var(--text-main); border-radius: 10px; padding: 1px 8px; font-size: 0.72rem; }
.btn-copy { margin-left: auto; font-size: 0.72rem; padding: 2px 10px; border: 1px solid var(--border-main); border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-muted); text-transform: none; letter-spacing: 0; }
.pend-card { border: 1px solid var(--border-main); border-radius: 8px; padding: 0.8rem 1rem; margin-bottom: 0.6rem; }
.pend-top { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; }
.pend-company { font-weight: 600; font-size: 0.92rem; color: var(--text-main); }
.pend-company.unknown { color: var(--text-muted); font-style: italic; font-weight: 500; }
.pend-waited { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; white-space: nowrap; }
.age-ok { background: #dcfce7; color: #166534; }
.age-warn { background: #fef3c7; color: #92400e; }
.age-bad { background: #fee2e2; color: #991b1b; }
.pend-who { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.1rem; }
.pend-subject { font-size: 0.85rem; color: var(--text-main); margin-top: 0.45rem; }
.pend-body { font-size: 0.8rem; color: var(--text-muted); margin: 0.3rem 0 0; line-height: 1.5; }
.report { font-size: 0.8rem; line-height: 1.55; white-space: pre-wrap; background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 8px; padding: 1.1rem 1.3rem; margin: 0; color: var(--text-main); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
