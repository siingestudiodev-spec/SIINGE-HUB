<template>
  <div class="act-container">
    <div class="act-header">
      <div>
        <h1 class="act-title">Activity</h1>
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

    <p v-if="note" class="act-note">{{ note }}</p>
    <div v-if="loading" class="act-empty">Loading…</div>

    <template v-else>
      <!-- ── SOP ───────────────────────────────────────────────── -->
      <section class="act-section">
        <h2 class="sec-title">
          SOP
          <span class="tabs">
            <button @click="sopTab = 'daily'" :class="{ on: sopTab === 'daily' }">Daily</button>
            <button @click="sopTab = 'weekly'" :class="{ on: sopTab === 'weekly' }">Weekly</button>
          </span>
          <span class="sec-count">{{ prog.done }}/{{ prog.total }}</span>
        </h2>

        <div class="bar"><div class="bar-fill" :style="{ width: prog.pct + '%' }"></div></div>
        <p class="bar-label">
          {{ prog.pct }}% · {{ sopTab === 'weekly' ? `week of ${weekLabel}` : dayLabel }}
        </p>

        <div v-for="s in sopSections" :key="s.id" class="sop-block">
          <div class="sop-head">
            <span class="sop-title">{{ s.title }}</span>
            <span class="sop-frac" :class="{ full: s.done === s.total }">{{ s.done }}/{{ s.total }}</span>
          </div>
          <p class="sop-obj">{{ s.objective }}</p>
          <p v-if="s.rule" class="sop-rule">{{ s.rule }}</p>

          <label v-for="i in s.items" :key="i.id" class="sop-item" :class="{ done: i.done }">
            <input
              type="checkbox"
              :checked="i.done"
              :disabled="i.by === 'data'"
              @change="toggleItem(i.id, $event.target.checked)"
            />
            <span class="sop-label">{{ i.label }}</span>
            <span v-if="i.evidence" class="sop-ev" :class="{ good: i.by === 'data' }">{{ i.evidence }}</span>
            <span v-if="i.manual" class="sop-tag">manual</span>
            <span v-else-if="i.by === 'data'" class="sop-tag auto">auto</span>
          </label>
        </div>
      </section>

      <!-- ── Needs reply ───────────────────────────────────────── -->
      <section class="act-section">
        <h2 class="sec-title">Needs reply <span class="sec-count">{{ pending.length }}</span></h2>
        <p v-if="!pending.length" class="act-empty sm">
          {{ inbound.length ? 'Nothing waiting on you.' : 'No mailbox data yet — hit Sync mailbox.' }}
        </p>
        <div v-for="p in pending" :key="p.key" class="pend-card">
          <div class="pend-top">
            <span class="pend-company" :class="{ unknown: !p.company }">{{ p.company || 'Not in the hub' }}</span>
            <span class="pend-waited" :class="ageClass(p.waitedMs)">{{ p.waited }}</span>
          </div>
          <div class="pend-who">{{ p.name ? `${p.name} · ${p.from}` : p.from }}</div>
          <div class="pend-subject">{{ p.subject }}</div>
          <p class="pend-body">{{ clip(p.body, 220) }}</p>
        </div>
      </section>

      <!-- ── Report ────────────────────────────────────────────── -->
      <section class="act-section">
        <h2 class="sec-title">
          Report
          <span class="sec-count">{{ candidates.length - excluded.size }}/{{ candidates.length }}</span>
          <button @click="copy" class="btn-copy">{{ copied ? 'Copied' : 'Copy' }}</button>
        </h2>

        <p class="pick-hint">Everything from this range is in. Untick what should not reach Sierra.</p>
        <div class="picks">
          <label v-for="c in candidates" :key="c.key" class="pick" :class="{ off: excluded.has(c.key) }">
            <input type="checkbox" :checked="!excluded.has(c.key)" @change="togglePick(c.key)" />
            <span class="pick-kind" :class="'k-' + c.kind">{{ c.kind }}</span>
            <span class="pick-name">{{ c.name }}</span>
          </label>
        </div>

        <pre class="report">{{ report }}</pre>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'
import { buildReport, timelines, ymd } from '../lib/dailyReport'
import { pendingReplies } from '../lib/needsReply'
import { DAILY, WEEKLY, signals, status, progress, weekOf } from '../lib/sop'

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
const note = ref('')
const copied = ref(false)
const sopTab = ref('daily')

const outbound = ref([])
const inbound = ref([])
const audits = ref([])
const followupsDue = ref(0)
const checkedDaily = ref({})
const checkedWeekly = ref({})
const excluded = ref(new Set())

const dayLabel = computed(() => (from.value === to.value ? from.value : `${from.value} → ${to.value}`))
const weekLabel = computed(() => weekOf(to.value))

function setRange(n) {
  preset.value = n
  from.value = daysAgo(n)
  to.value = today()
}

const inRange = iso => {
  const d = ymd(iso)
  return d >= from.value && d <= to.value
}

async function load() {
  loading.value = true
  const [out, inb, aud, due] = await Promise.all([
    // Full history, not just the range: "first contacted Aug 4" cannot be computed
    // from a one-day slice. Logs are shared — every user's activity shows here.
    supabase.from('outbound_activity').select('*').order('sent_at', { ascending: true }),
    supabase.from('inbound_activity').select('*').order('received_at', { ascending: false }).limit(500),
    supabase.from('audit_logs').select('*')
      .gte('created_at', from.value + 'T00:00:00-05:00')
      .lte('created_at', to.value + 'T23:59:59-05:00').limit(2000),
    supabase.from('manufacturers').select('id', { count: 'exact', head: true })
      .not('followup_due_at', 'is', null)
      .lte('followup_due_at', new Date().toISOString())
      .is('followup_sent_at', null)
      .is('followup_manually_completed_at', null),
  ])
  outbound.value = out.data || []
  inbound.value = inb.data || []
  audits.value = aud.data || []
  followupsDue.value = due.count || 0
  await loadSop()
  loading.value = false
}

async function loadSop() {
  const { data } = await supabase.from('sop_days').select('*')
    .in('day', [to.value, weekOf(to.value)])
  const daily = (data || []).find(r => r.kind === 'daily' && r.day === to.value)
  const weekly = (data || []).find(r => r.kind === 'weekly')
  checkedDaily.value = daily?.checked || {}
  checkedWeekly.value = weekly?.checked || {}
  excluded.value = new Set(daily?.report_excluded || [])
}

// ponytail: one upsert per tick. A day's sheet is a handful of clicks, so debouncing
// would be more code than it saves.
async function saveSop(patch) {
  const weekly = sopTab.value === 'weekly'
  const { error } = await supabase.from('sop_days').upsert({
    user_email: me.value,
    day: weekly ? weekOf(to.value) : to.value,
    kind: weekly ? 'weekly' : 'daily',
    updated_at: new Date().toISOString(),
    ...patch,
  }, { onConflict: 'user_email,day,kind' })
  if (error) note.value = `Could not save: ${error.message}`
}

function toggleItem(id, on) {
  const box = sopTab.value === 'weekly' ? checkedWeekly : checkedDaily
  const next = { ...box.value }
  if (on) next[id] = true
  else delete next[id]
  box.value = next
  saveSop({ checked: next })
}

function togglePick(key) {
  const next = new Set(excluded.value)
  next.has(key) ? next.delete(key) : next.add(key)
  excluded.value = next
  // Exclusions belong to the day, never to the weekly sheet.
  supabase.from('sop_days').upsert({
    user_email: me.value, day: to.value, kind: 'daily',
    report_excluded: [...next], updated_at: new Date().toISOString(),
  }, { onConflict: 'user_email,day,kind' })
}

const pending = computed(() => pendingReplies({ inbound: inbound.value, outbound: outbound.value }))

// Companies we wrote to, that never answered, quiet for over a week.
const silent = computed(() => timelines(outbound.value, new Date().toISOString())
  .filter(t => !t.sends.some(r => r.replied_at))
  .filter(t => Date.now() - Date.parse(t.sends[t.sends.length - 1].sent_at) > 7 * 86400000).length)

const sig = computed(() => signals({
  inbound: inbound.value.filter(r => inRange(r.received_at)),
  audits: audits.value,
  sends: outbound.value.filter(r => inRange(r.sent_at)),
  pending: pending.value,
  followupsDue: followupsDue.value,
  silent: silent.value,
  reportSent: Boolean(checkedDaily.value['report-sierra']),
}))

const sopSections = computed(() => sopTab.value === 'weekly'
  ? status(WEEKLY, sig.value, checkedWeekly.value)
  : status(DAILY, sig.value, checkedDaily.value))

const prog = computed(() => progress(sopSections.value))

// What the report would talk about, one line each, so it can be unticked.
const candidates = computed(() => {
  const now = new Date().toISOString()
  const companies = timelines(outbound.value, now)
    .filter(t => t.sends.some(r => inRange(r.sent_at)))
    .map(t => ({
      key: `${t.kind}:${t.entityId}`,
      kind: inRange(t.sends[0].sent_at) ? 'first contact' : 'follow-up',
      name: t.name,
    }))
  const replies = inbound.value.filter(r => inRange(r.received_at))
    .map(r => ({ key: `reply:${r.id}`, kind: 'reply', name: r.entity_name || r.from_email }))
  const changes = audits.value.length
    ? [{ key: 'hub-changes', kind: 'hub changes', name: `${audits.value.length} records` }]
    : []
  return [...companies, ...replies, ...changes]
})

const report = computed(() => buildReport({
  from: from.value,
  to: to.value,
  user: me.value,
  emails: outbound.value.filter(r => !excluded.value.has(`${r.kind}:${r.entity_id}`)),
  inbound: inbound.value.filter(r => !excluded.value.has(`reply:${r.id}`)),
  audits: excluded.value.has('hub-changes') ? [] : audits.value,
}))

async function sync() {
  syncing.value = true
  note.value = ''
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/inbox-sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.missing ? `missing on Vercel: ${body.missing.join(', ')}` : body.error)
    const stored = (body.folders || []).reduce((n, f) => n + (f.stored || 0), 0)
    note.value = `Read ${body.folders?.length ?? 0} folders, stored ${stored} messages` +
      (body.more ? ' — more waiting, run it again.' : '.')
    await load()
  } catch (e) {
    note.value = `Sync failed: ${e.message}`
  } finally {
    syncing.value = false
  }
}

const ageClass = ms => {
  const d = ms / 86400000
  return d >= 7 ? 'age-bad' : d >= 2 ? 'age-warn' : 'age-ok'
}
const clip = (t, n) => {
  const flat = (t || '').replace(/\s+/g, ' ').trim()
  return flat.length > n ? flat.slice(0, n) + '…' : flat
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
.tabs { display: inline-flex; gap: 0.25rem; }
.tabs button { font-size: 0.7rem; text-transform: none; letter-spacing: 0; padding: 2px 9px; border: 1px solid var(--border-main); border-radius: 10px; background: transparent; color: var(--text-muted); cursor: pointer; }
.tabs button.on { background: var(--text-main); color: var(--bg-app); border-color: var(--text-main); }
.btn-copy { margin-left: auto; font-size: 0.72rem; padding: 2px 10px; border: 1px solid var(--border-main); border-radius: 4px; background: transparent; cursor: pointer; color: var(--text-muted); text-transform: none; letter-spacing: 0; }

.bar { height: 5px; background: var(--border-light); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; background: #16a34a; transition: width 0.25s; }
.bar-label { font-size: 0.72rem; color: var(--text-muted); margin: 0.3rem 0 1.2rem; }

.sop-block { margin-bottom: 1.4rem; }
.sop-head { display: flex; align-items: baseline; gap: 0.5rem; }
.sop-title { font-size: 0.88rem; font-weight: 600; color: var(--text-main); }
.sop-frac { font-size: 0.7rem; color: var(--text-muted); }
.sop-frac.full { color: #16a34a; font-weight: 700; }
.sop-obj { font-size: 0.75rem; color: var(--text-muted); margin: 0.1rem 0 0.1rem; }
.sop-rule { font-size: 0.72rem; color: #92400e; background: #fef3c7; border-radius: 4px; padding: 4px 8px; margin: 0.4rem 0; }
.sop-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.25rem 0; font-size: 0.83rem; color: var(--text-main); cursor: pointer; }
.sop-item.done .sop-label { color: var(--text-muted); text-decoration: line-through; }
.sop-item input:disabled { cursor: default; }
.sop-label { flex: 1; }
.sop-ev { font-size: 0.7rem; color: var(--text-muted); white-space: nowrap; }
.sop-ev.good { color: #16a34a; }
.sop-tag { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid var(--border-main); color: var(--text-muted); border-radius: 3px; padding: 0 4px; }
.sop-tag.auto { border-color: #16a34a; color: #16a34a; }

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

.pick-hint { font-size: 0.75rem; color: var(--text-muted); margin: 0 0 0.6rem; }
.picks { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1.2rem; }
.pick { display: inline-flex; align-items: center; gap: 0.4rem; border: 1px solid var(--border-main); border-radius: 20px; padding: 3px 11px 3px 7px; font-size: 0.78rem; cursor: pointer; color: var(--text-main); }
.pick.off { opacity: 0.45; }
.pick-kind { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.k-reply { color: #2563eb; }
.pick-name { font-weight: 500; }
.report { font-size: 0.8rem; line-height: 1.55; white-space: pre-wrap; background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 8px; padding: 1.1rem 1.3rem; margin: 0; color: var(--text-main); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
</style>
